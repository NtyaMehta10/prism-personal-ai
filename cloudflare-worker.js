const ORIGIN = 'https://ntyamehta10.github.io';
const MODELS = new Set(["@cf/meta/llama-3.2-3b-instruct", "@cf/meta/llama-3.2-1b-instruct", "@cf/qwen/qwen2.5-coder-32b-instruct", "@cf/qwen/qwen3-30b-a3b-fp8", "@cf/nvidia/nemotron-3-120b-a12b", "@cf/qwen/qwen3.8-27b", "@cf/qwen/qwq-32b", "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"]);
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    if (origin === ORIGIN) Object.assign(headers, {'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});
    const json = (body,status=200,extra={}) => new Response(JSON.stringify(body), {status,headers:{...headers,...extra}});
    const error = (message,status,extra) => json({error:{message}},status,extra);
    if (origin !== ORIGIN) return error('This endpoint is available through Prism.',403);
    if (new URL(request.url).pathname !== '/v1/chat/completions') return error('Not found.',404);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return error('Use POST.',405);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return error('Use JSON.',415);
    try {
      if (!env.AI || !env.PRISM_LIMITER) return error('Free AI is not configured yet.',503);
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return error('Client address unavailable.',403);
      const localLimit = await env.PRISM_LIMITER.limit({key:'ip:'+ip});
      if (!localLimit.success) return error('Free AI allows four requests per minute. Try again shortly.',429,{'Retry-After':'60'});
      if (Number(request.headers.get('Content-Length')) > 24000) return error('Context is too long. Start a new chat or shorten your memories.',413);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 24000) return error('Context is too long. Start a new chat or shorten your memories.',413);
      let input;
      try {input=JSON.parse(raw);} catch {return error('Invalid JSON.',400);}
      if (!MODELS.has(input.model)) return error('Choose an available Cloudflare model in Prism.',400);
      if (!Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 40) return error('Use one to forty messages.',400);
      const messages = [];
      let chars=0;
      for (const m of input.messages) {
        if (!m || !['system','user','assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 16000) return error('Unsupported message. Shorten the conversation context.',400);
        chars += m.content.length;
        if (chars > 20000) return error('Context is too long. Start a new chat or shorten your memories.',413);
        messages.push({role:m.role,content:m.content});
      }
      if (!messages.some(m=>m.role==='user')) return error('A user message is required.',400);
      const poolLimit = await env.PRISM_LIMITER.limit({key:'prism-shared-pool'});
      if (!poolLimit.success) return error('The shared free AI is busy. Try again in a minute.',429,{'Retry-After':'60'});
      const reasoningModels = new Set(['@cf/qwen/qwen3.8-27b','@cf/qwen/qwq-32b','@cf/deepseek-ai/deepseek-r1-distill-qwen-32b']);
      const budget = reasoningModels.has(input.model) ? 1536 : 512;
      const options = {messages,max_tokens:budget,temperature:Math.min(1,Math.max(0,Number(input.temperature)||0.7)),stream:false};
      if(input.model==='@cf/nvidia/nemotron-3-120b-a12b') options.chat_template_kwargs={enable_thinking:false,force_nonempty_content:true};
      if(input.model==='@cf/qwen/qwen3.8-27b'){delete options.max_tokens;options.max_completion_tokens=budget;options.reasoning_effort='low';}
      const result = await env.AI.run(input.model,options);
      let text = typeof result.response === 'string' ? result.response : result.choices?.[0]?.message?.content;
      // Hidden thinking is not a final answer; don't show a thinking-only budget exhaustion as success.
      if(typeof text==='string'){if(text.includes('</think>'))text=text.slice(text.lastIndexOf('</think>')+8).trim();if(text.includes('<think>'))text='';}
      if (typeof text !== 'string' || !text.trim()) return error('This model returned no final text within the reply limit. Try a shorter question or another Cloudflare model.',502);
      return json({id:'prism-'+crypto.randomUUID(),object:'chat.completion',created:Math.floor(Date.now()/1000),model:input.model,choices:[{index:0,message:{role:'assistant',content:text},finish_reason:result.choices?.[0]?.finish_reason || ((result.usage?.completion_tokens || 0)>=budget?'length':'stop')}]});
    } catch {
      return error('Cloudflare free AI is unavailable or its daily quota is exhausted. No paid fallback is used. Try later.',503);
    }
  }
};
