// Public catalog only: never receives an API key or personal context.
export const FREE_PROVIDERS = {
  cloudflare:{
    label:'Cloudflare · no API key',
    termsUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',
    note:'Four Cloudflare models · no key required. Shared account allowance: 10,000 neurons/day across Workers AI; approximately four requests/minute per IP and shared pool (per Cloudflare location). 512-token replies. Larger models consume more of the same allowance; reasoning may use part of the reply budget. Capacity is limited; no paid fallback.',
    setup:'No API key or provider signup needed. Sending sends your conversation, enabled memories, personalization and skill through Prism’s Cloudflare Worker to Workers AI. Your vault stays local; requests are processed by Cloudflare. Shared free capacity may run out.',
    models:[{"id": "@cf/meta/llama-3.2-3b-instruct", "name": "Llama 3.2 3B \u00b7 Cloudflare", "use": "Everyday chat \u00b7 default"}, {"id": "@cf/meta/llama-3.2-1b-instruct", "name": "Llama 3.2 1B \u00b7 Cloudflare", "use": "Lightweight chat and short summaries"}, {"id": "@cf/qwen/qwen2.5-coder-32b-instruct", "name": "Qwen2.5 Coder 32B \u00b7 Cloudflare", "use": "Coding help \u00b7 uses more shared allowance"}, {"id": "@cf/qwen/qwen3-30b-a3b-fp8", "name": "Qwen3 30B A3B \u00b7 Cloudflare", "use": "General questions and reasoning \u00b7 bounded replies"}]
  },
  openrouter: {
    label: 'OpenRouter', keyUrl: 'https://openrouter.ai/settings/keys',
    termsUrl: 'https://openrouter.ai/docs/api_reference/limits',
    note: 'Free API models · your own key required. Usually 20 requests/minute and 50/day without credit purchases; availability and account limits vary. Only zero-priced text models are shown. No paid fallback.',
    setup: 'Create a free OpenRouter key, then paste it below. Free endpoints may have different data policies; review OpenRouter privacy settings before sending personal memories. Prism rechecks zero pricing before each reply.',
    models: [{id:'openrouter/free',name:'Free Models Router',context:200000}]
  },
  groq: {
    label:'Groq · free plan', keyUrl:'https://console.groq.com/keys',
    termsUrl:'https://console.groq.com/docs/rate-limits',
    note:'Free plan · your own key required. GPT OSS: published limits of 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day; account limits may differ.',
    setup:'Use a Groq organization on its Free plan. A Developer/paid organization is billed at its own rates. Prism cannot inspect your billing tier. Your key stays encrypted in this browser.',
    models:[{id:'openai/gpt-oss-20b',name:'GPT OSS 20B'},{id:'openai/gpt-oss-120b',name:'GPT OSS 120B'}]
  },
  gemini: {
    label:'Gemini · free tier',keyUrl:'https://aistudio.google.com/apikey',
    termsUrl:'https://ai.google.dev/gemini-api/docs/pricing',
    note:'Free tier · your own key required. Gemini 3.5 Flash-Lite has free input/output on eligible free-tier projects. Regional eligibility and project quotas apply; check AI Studio. Free-tier content may be used to improve Google products.',
    setup:'Use a Gemini API key from an eligible Free-tier project in AI Studio. A billing-enabled project may charge for this same model. Prism cannot inspect the billing tier. Free-tier data may be used to improve Google products; avoid sensitive context.',
    models:[{id:'gemini-3.5-flash-lite',name:'Gemini 3.5 Flash-Lite'}]
  }
};
export function zeroPricedTextModels(catalog) {
  if(!Array.isArray(catalog?.data))throw new Error('The provider returned an unsupported model catalog.');
  return catalog.data.filter(m=>typeof m.id==='string'&&(m.id.endsWith(':free')||m.id==='openrouter/free')
    &&typeof m.name==='string'&&m.architecture?.output_modalities?.includes('text')
    &&m.architecture?.input_modalities?.includes('text')
    &&m.pricing?.prompt!=null&&m.pricing?.completion!=null
    &&Number(m.pricing.prompt)===0&&Number(m.pricing.completion)===0
    &&Object.values(m.pricing).every(p=>p!=null&&Number(p)===0))
    .map(m=>({id:m.id,name:m.name,context:m.context_length||0}))
    .sort((a,b)=>Number(b.id==='openrouter/free')-Number(a.id==='openrouter/free')||a.name.localeCompare(b.name));
}
export async function discoverFreeModels({signal}={}) {
  let response;const timeout=new AbortController(),abort=()=>timeout.abort();
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,15000);
  try{response=await fetch('https://openrouter.ai/api/v1/models',{signal:timeout.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store'});}
  catch(error){if(signal?.aborted)throw new DOMException('Aborted','AbortError');throw new Error('Could not load OpenRouter’s free catalog. Check your connection and retry.');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  if(!response.ok)throw new Error('OpenRouter’s catalog is unavailable (HTTP '+response.status+'). Retry later.');
  return zeroPricedTextModels(await response.json());
}
export async function verifyFreeConnection(connection,{signal}={}) {
  if(!connection.freeOnly)return;
  if(connection.provider!=='openrouter'||connection.base.replace(/\/+$/,'')!=='https://openrouter.ai/api/v1')throw new Error('Free-only connections must use the official OpenRouter API.');
  const models=await discoverFreeModels({signal});
  if(!models.some(m=>m.id===connection.model))throw new Error('This model is no longer listed as zero-priced text chat. Choose another in Settings → Free models. No chat request was sent.');
}
