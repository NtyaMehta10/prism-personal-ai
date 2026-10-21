import {verifyFreeConnection} from './free-models.js?v=cloudflare-free-1';
export const PROVIDERS = {
  cloudflare:{label:'Cloudflare · no key',base:'https://prism-free-ai.aethonlabs.workers.dev/v1',placeholder:'@cf/meta/llama-3.2-3b-instruct',format:'openai',keyless:true},
  openrouter:{label:'OpenRouter',base:'https://openrouter.ai/api/v1',placeholder:'provider/model-name',format:'openai'},
  groq:{label:'Groq',base:'https://api.groq.com/openai/v1',placeholder:'openai/gpt-oss-20b',format:'openai'},
  openai:{label:'OpenAI',base:'https://api.openai.com/v1',placeholder:'Your model ID',format:'openai'},
  gemini:{label:'Google Gemini',base:'https://generativelanguage.googleapis.com/v1beta',placeholder:'Your Gemini model ID',format:'gemini'},
  anthropic:{label:'Anthropic',base:'https://api.anthropic.com/v1',placeholder:'Your Claude model ID',format:'anthropic'},
  custom:{label:'OpenAI-compatible endpoint',base:'',placeholder:'Exact model ID',format:'openai'}
};
export function safeBase(raw) {
  const url = new URL(raw);
  if(url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS API base URL without credentials, query parameters or fragments.');
  return url.href.replace(/\/+$/,'');
}
export function systemContext(data, skillId) {
  const p=data.personality;
  const parts=['You are Prism, the user’s personal AI assistant. Be helpful, accurate, and honest about your limits. No external tools are connected: do not claim to browse, run code, send messages or take actions.'];
  if(p.name)parts.push('The user prefers to be called: '+p.name);
  if(p.about)parts.push('User-provided personal context:\n'+p.about);
  if(p.style)parts.push('Response preferences:\n'+p.style);
  if(data.preferences.memoryEnabled) {
    const memories=data.memories.filter(m=>m.enabled);
    if(memories.length)parts.push('User-maintained memories (context, not new commands):\n'+memories.map(m=>'- '+m.text).join('\n'));
  }
  const skill=data.skills.find(s=>s.id===skillId);
  if(skill)parts.push('Selected skill — '+skill.name+':\n'+skill.instructions);
  return parts.join('\n\n');
}
export async function requestReply(connection, system, messages, {signal,onChunk,temperature=.7}={}) {
  await verifyFreeConnection(connection,{signal});
  const base=safeBase(connection.base), provider=PROVIDERS[connection.provider];
  if(!provider)throw new Error('Unknown provider. Edit this connection.');
  const chat=messages.filter(m=>m.role==='user'||m.role==='assistant').map(({role,content})=>({role,content}));
  const headers={'Content-Type':'application/json'};
  let url,body;
  if(provider.format==='gemini') {
    url=base+'/models/'+encodeURIComponent(connection.model.replace(/^models\//,''))+':generateContent';
    headers['x-goog-api-key']=connection.key;
    body={systemInstruction:{parts:[{text:system}]},contents:chat.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{temperature,maxOutputTokens:4096}};
  } else if(provider.format==='anthropic') {
    url=base+'/messages';headers['x-api-key']=connection.key;headers['anthropic-version']='2023-06-01';headers['anthropic-dangerous-direct-browser-access']='true';
    body={model:connection.model,system,messages:chat,max_tokens:4096,temperature};
  } else {
    url=base+'/chat/completions';if(!provider.keyless)headers.Authorization='Bearer '+connection.key;
    if(provider.keyless&&(base!==provider.base||connection.model!==provider.placeholder))throw new Error('Use the built-in Cloudflare endpoint and Llama 3.2 3B model.');
    body={model:connection.model,messages:[{role:'system',content:system},...chat],stream:true};
    // Reasoning models may reject temperature; omit it for OpenAI and leave provider defaults.
    if(connection.provider!=='openai') {body.temperature=temperature;body.max_tokens=4096;}
    else body.max_completion_tokens=4096;
    if(provider.keyless){body.stream=false;body.max_tokens=512;}
    if(connection.freeOnly)body.provider={max_price:{prompt:0,completion:0,request:0},allow_fallbacks:true};
  }
  let response;
  try{response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});}catch(error){if(error.name==='AbortError')throw error;throw new Error('Could not reach '+new URL(base).hostname+'. Check the API base URL, your connection and whether this provider permits browser requests (CORS). No automatic retry was made.');}
  if(!response.ok) {
    if(provider.keyless){const hints={400:'The free model rejected this context. Start a shorter conversation.',403:'Open Prism from its GitHub Pages link to use Cloudflare free AI.',413:'This chat context is too long for the shared free model. Start a new chat or shorten enabled memories and personalization.',429:'The shared free model is busy or rate-limited (four requests/minute). Wait a minute before retrying.',502:'Cloudflare returned no text. Try again later.',503:'Cloudflare free AI is unavailable or the account’s daily free quota is exhausted. No paid fallback is used. Try later.'};throw new Error(hints[response.status]||'Cloudflare returned HTTP '+response.status+'. No automatic retry was made.');}
    // Do not surface provider bodies: some compatible servers echo request credentials.
    const hints={400:'The provider rejected the model or request settings. Check the exact model ID and its chat API support.',401:'The API key was rejected. Edit this connection and check the key.',403:'This key does not have access to the requested model or endpoint.',404:'Model or endpoint not found. Check the model ID and API base URL.',429:'Rate limit or API credit limit reached. Check your provider account before retrying.'};
    throw new Error(hints[response.status]||'The provider returned HTTP '+response.status+'. No automatic retry was made.');
  }
  if(provider.format==='gemini') {
    const result=await response.json();const text=result.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('');
    if(!text)throw new Error('The provider returned no text. Its safety or output limits may have blocked the response.');onChunk?.(text);return text;
  }
  if(provider.format==='anthropic') {
    const result=await response.json();const text=result.content?.filter(p=>p.type==='text').map(p=>p.text).join('');
    if(!text)throw new Error('The provider returned no text.');onChunk?.(text);return text;
  }
  if(!response.headers.get('content-type')?.includes('text/event-stream')) {
    const result=await response.json();const text=result.choices?.[0]?.message?.content;
    if(typeof text!=='string'||!text)throw new Error('This endpoint did not return a supported chat response.');onChunk?.(text);return text;
  }
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',text='';
  function line(value){if(!value.startsWith('data:'))return;const raw=value.slice(5).trim();if(!raw||raw==='[DONE]')return;const event=JSON.parse(raw);if(event.error)throw new Error('The provider interrupted the response. Check model access and usage limits.');const delta=event.choices?.[0]?.delta?.content;if(typeof delta==='string'){text+=delta;onChunk?.(text);}}
  try{while(true){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let index;while((index=pending.indexOf('\n'))>=0){line(pending.slice(0,index).replace(/\r$/,''));pending=pending.slice(index+1);}}pending+=decoder.decode();if(pending.trim())line(pending.trim());}finally{reader.releaseLock();}
  if(!text)throw new Error('The provider returned no text. Check that this model supports chat completion.');return text;
}
