// Public catalog only: never receives an API key or personal context.
export const FREE_PROVIDERS = {
  cloudflare:{
    label:'Cloudflare · no API key',
    termsUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',
    note:'Ten Cloudflare text models · no key required. All share 10,000 neurons/day and four requests/minute; changing model does not create more quota. Reply budgets are 2,048 tokens, or 3,072 including reasoning on Qwen3.8/QwQ/DeepSeek R1. Models may still truncate large files; Prism stages small chunks safely. No paid fallback. Embeddings, vision and audio are not chat models in Prism.',
    setup:'No API key or provider signup needed. Sending sends your conversation, enabled memories, personalization and skill through Prism’s Cloudflare Worker to Workers AI. Your vault stays local; requests are processed by Cloudflare. Shared free capacity may run out.',
    models:[{"id": "@cf/meta/llama-3.1-8b-instruct-fp8-fast", "name": "Llama 3.1 8B Fast \u00b7 Cloudflare", "use": "Larger instruction model \u00b7 same shared free allowance", "budget": 2048}, {"id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "name": "Llama 3.3 70B Fast \u00b7 Cloudflare", "use": "General coding and text \u00b7 higher shared allowance use", "budget": 2048}, {"id": "@cf/meta/llama-3.2-3b-instruct", "name": "Llama 3.2 3B \u00b7 Cloudflare", "use": "Everyday chat \u00b7 default", "budget": 2048}, {"id": "@cf/meta/llama-3.2-1b-instruct", "name": "Llama 3.2 1B \u00b7 Cloudflare", "use": "Lightweight chat and short summaries", "budget": 2048}, {"id": "@cf/qwen/qwen2.5-coder-32b-instruct", "name": "Qwen2.5 Coder 32B \u00b7 Cloudflare", "use": "Coding help \u00b7 uses more shared allowance", "budget": 2048}, {"id": "@cf/qwen/qwen3-30b-a3b-fp8", "name": "Qwen3 30B A3B \u00b7 Cloudflare", "use": "General questions and reasoning \u00b7 bounded replies", "budget": 2048}, {"id": "@cf/nvidia/nemotron-3-120b-a12b", "name": "NVIDIA Nemotron 3 Super 120B A12B \u00b7 Cloudflare", "use": "General chat \u00b7 thinking off to conserve shared allowance", "budget": 2048}, {"id": "@cf/qwen/qwen3.8-27b", "name": "Qwen3.8 27B \u00b7 Cloudflare", "use": "General chat \u00b7 low reasoning \u00b7 text only in Prism", "budget": 3072}, {"id": "@cf/qwen/qwq-32b", "name": "QwQ 32B \u00b7 Cloudflare", "use": "Reasoning \u00b7 3,072-token budget includes thinking", "budget": 3072}, {"id": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", "name": "DeepSeek R1 Distill Qwen 32B \u00b7 Cloudflare", "use": "Qwen-based DeepSeek reasoning \u00b7 3,072-token budget", "budget": 3072}]
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
