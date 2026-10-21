// Opaque-origin sandbox + dedicated worker. No network, DOM, storage or native terminal access.
export function browserTest(files,code,signal){return new Promise((resolve,reject)=>{
 const frame=document.createElement('iframe');frame.hidden=true;frame.sandbox='allow-scripts';const id=crypto.randomUUID();let timer;
 const finish=(result,error)=>{clearTimeout(timer);window.removeEventListener('message',receive);signal?.removeEventListener('abort',abort);frame.contentWindow?.postMessage({terminate:true},'*');frame.remove();error?reject(error):resolve(result);};
 const abort=()=>finish(null,new DOMException('Stopped','AbortError'));
 frame.src=new URL('./sandbox.html',import.meta.url).href;
 function receive(e){if(e.source!==frame.contentWindow)return;if(e.data.ready)frame.contentWindow.postMessage({id,files,code},'*');else if(e.data.id===id&&e.data.result)finish(e.data.result);}
 window.addEventListener('message',receive);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)return abort();document.body.append(frame);timer=setTimeout(()=>finish({ok:false,error:'Test exceeded 5 seconds; sandbox terminated.'}),5000);
 });}
