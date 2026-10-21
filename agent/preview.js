window.addEventListener('message',e=>{
 if(e.source!==parent||!e.data?.files)return;
 const files=e.data.files,entry=Object.keys(files).find(p=>p==='index.html')||Object.keys(files).find(p=>p.endsWith('.html'));
 if(!entry){document.body.textContent='No HTML entry point yet. Ask the agent to create index.html.';return;}
 const resolve=p=>{const parts=(entry.split('/').slice(0,-1).join('/')+'/'+p).split('/'),out=[];for(const x of parts){if(!x||x==='.')continue;if(x==='..')out.pop();else out.push(x);}return out.join('/');};
 const doc=new DOMParser().parseFromString(files[entry],'text/html');
 doc.querySelectorAll('base,meta[http-equiv],iframe,object,embed').forEach(n=>n.remove());
 for(const link of doc.querySelectorAll('link')){const path=resolve(link.getAttribute('href')||'');if(link.rel==='stylesheet'&&Object.hasOwn(files,path)){const s=doc.createElement('style');s.textContent=files[path];link.replaceWith(s);}else link.remove();}
 for(const script of doc.querySelectorAll('script[src]')){const path=resolve(script.getAttribute('src'));if(Object.hasOwn(files,path)&&script.type!=='module'){script.removeAttribute('src');script.textContent=files[path];}else script.remove();}
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";doc.head.prepend(policy);
 const frame=document.createElement('iframe');frame.sandbox='allow-scripts';frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;document.body.replaceChildren(frame);
});
window.addEventListener('DOMContentLoaded',()=>parent.postMessage({prismPreviewReady:true},'*'));
