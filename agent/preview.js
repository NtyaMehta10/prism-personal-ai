// Only declarative inspection and interaction with the generated project; never external browsing.
let frame=null,ready=null;
function projectBridge(){
 const errors=[];addEventListener('error',e=>errors.push(String(e.message).slice(0,500)));addEventListener('unhandledrejection',e=>errors.push(String(e.reason).slice(0,500)));
 const send=(id,result)=>parent.postMessage({prismInnerResult:true,id,result},'*');
 addEventListener('message',async e=>{if(e.source!==parent||!e.data?.prismInnerActions)return;let assertions=0;const observations=[];
 try{for(const op of e.data.actions.slice(0,20)){
  const kind=op.action;if(kind==='inspect'){observations.push({title:document.title,text:(document.body?.innerText||'').slice(0,4500),controls:[...document.querySelectorAll('input,button,textarea,select,a')].slice(0,35).map(n=>({tag:n.tagName,id:n.id,type:n.type||'',text:(n.innerText||n.placeholder||'').slice(0,120)})),errors:[...errors]});continue;}
  if(!['click','fill','assertText','assertCount'].includes(kind))throw Error('Unsupported browser action: '+kind);
  if(typeof op.selector!=='string'||op.selector.length>300)throw Error('A short CSS selector is required.');
  const matches=document.querySelectorAll(op.selector);if(kind==='assertCount'){assertions++;if(matches.length!==op.count)throw Error('Expected '+op.count+' matches for '+op.selector+', saw '+matches.length);continue;}
  if(matches.length!==1)throw Error('Selector must match exactly one element: '+op.selector);const node=matches[0];
  if(kind==='fill'){if(!['INPUT','TEXTAREA','SELECT'].includes(node.tagName)||node.type==='file'||node.type==='password')throw Error('Only ordinary project text controls may be filled.');node.value=String(op.value||'').slice(0,2000);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));}
  if(kind==='click'){if(node.tagName==='A'&&node.href&&!node.getAttribute('href')?.startsWith('#'))throw Error('Navigation outside the project is blocked.');node.click();}
  if(kind==='assertText'){assertions++;if(!(node.innerText||node.textContent||'').includes(String(op.text)))throw Error('Expected text not found: '+String(op.text).slice(0,100));}
  await new Promise(r=>setTimeout(r,30));
 }
 send(e.data.id,{ok:!errors.length,error:errors.length?'Project script error: '+errors[0]:undefined,assertions,observations,errors:[...errors],label:'Project browser (isolated DOM)'});
 }catch(error){send(e.data.id,{ok:false,assertions,observations,errors:[...errors],error:error.message,label:'Project browser (isolated DOM)'});}
 });
 addEventListener('DOMContentLoaded',()=>parent.postMessage({prismInnerReady:true},'*'));
}
window.addEventListener('message',async e=>{
 if(e.source!==parent||!e.data?.id||!Array.isArray(e.data.actions))return;const {id,files,actions}=e.data;
 try{if(files){
 const entry=Object.keys(files).find(p=>p==='index.html')||Object.keys(files).find(p=>p.endsWith('.html'));if(!entry)throw Error('No HTML entry point.');
 const resolve=p=>{if(/^(?:[a-z]+:|\/\/)/i.test(p))return '';const out=entry.split('/').slice(0,-1);for(const x of p.split('/')){if(!x||x==='.')continue;if(x==='..')out.pop();else out.push(x);}return out.join('/');};
 const doc=new DOMParser().parseFromString(files[entry],'text/html');doc.querySelectorAll('base,meta[http-equiv],iframe,object,embed').forEach(n=>n.remove());
 const warnings=[];
 for(const link of doc.querySelectorAll('link')){const path=resolve(link.getAttribute('href')||'');if(link.rel==='stylesheet'&&Object.hasOwn(files,path)){const s=doc.createElement('style');s.textContent=files[path];link.replaceWith(s);}else{warnings.push('Unsupported stylesheet: '+link.getAttribute('href'));link.remove();}}
 for(const script of doc.querySelectorAll('script')){const src=script.getAttribute('src'),path=src&&resolve(src);if(script.type==='module'){warnings.push('Module scripts require a build step; use classic browser JavaScript for this preview.');script.remove();}else if(src){if(Object.hasOwn(files,path)){script.removeAttribute('src');script.textContent=files[path];}else{warnings.push('Missing or external script: '+src);script.remove();}}}
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";doc.head.prepend(policy);
 const bridge=doc.createElement('script');bridge.textContent='('+projectBridge.toString()+')()';policy.after(bridge);
 ready=new Promise(resolve=>{const receive=event=>{if(event.source===frame?.contentWindow&&event.data?.prismInnerReady){removeEventListener('message',receive);resolve();}};addEventListener('message',receive);});
 frame=document.createElement('iframe');frame.sandbox='allow-scripts';frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;document.body.replaceChildren(frame);await ready;
 if(warnings.length)parent.postMessage({prismBrowserWarning:warnings},'*');
 }
 if(!frame)throw Error('Open a generated HTML project first.');await ready;frame.contentWindow.postMessage({id,prismInnerActions:true,actions},'*');
 }catch(error){parent.postMessage({prismBrowserResult:true,id,result:{ok:false,error:error.message}},'*');}
});
window.addEventListener('message',e=>{if(e.source===frame?.contentWindow&&e.data?.prismInnerResult)parent.postMessage({prismBrowserResult:true,id:e.data.id,result:e.data.result},'*');});
window.addEventListener('DOMContentLoaded',()=>parent.postMessage({prismPreviewReady:true},'*'));
