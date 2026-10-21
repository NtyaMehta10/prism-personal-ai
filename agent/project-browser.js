// Project-only browser bridge. Opaque iframe; no parent/vault/network/host access.
export class ProjectBrowser {
 constructor(frame){this.frame=frame;this.version='';this.pending=new Map();this.boot=null;window.addEventListener('message',e=>{if(e.source!==this.frame.contentWindow)return;const d=e.data||{};if(d.prismPreviewReady&&this.ready)this.ready();if(d.prismBrowserResult&&this.pending.has(d.id)){const job=this.pending.get(d.id);this.pending.delete(d.id);job(d.result);}});}
 reset(){this.version='';this.boot=null;for(const job of this.pending.values())job({ok:false,error:'Project browser closed.'});this.pending.clear();}
 replaceFrame(){const fresh=this.frame.cloneNode(false);fresh.removeAttribute('src');this.frame.replaceWith(fresh);this.frame=fresh;}
 async run(files,actions=[{action:'inspect'}],signal){
  if(signal?.aborted)throw new DOMException('Stopped','AbortError');
  if(!Object.keys(files).some(p=>p.endsWith('.html')))return {ok:false,error:'No HTML entry point yet. Create index.html before opening the project browser.'};
  if(!this.boot){this.boot=new Promise((resolve,reject)=>{const t=setTimeout(()=>{this.boot=null;reject(Error('Project browser did not load. Reopen it.'));},8000);this.ready=()=>{clearTimeout(t);resolve();};});this.frame.src=['localhost','127.0.0.1'].includes(location.hostname)?new URL('./preview.html?v=project-browser-2',import.meta.url).href:'https://prism-free-ai.aethonlabs.workers.dev/project-browser';}
  await this.boot;const version=JSON.stringify(files),id=crypto.randomUUID();
  return new Promise((resolve,reject)=>{let timer;const abort=()=>{this.pending.delete(id);clearTimeout(timer);this.reset();this.replaceFrame();reject(new DOMException('Stopped','AbortError'));};const finish=result=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve(result);};this.pending.set(id,finish);signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>{this.pending.delete(id);signal?.removeEventListener('abort',abort);this.reset();this.replaceFrame();resolve({ok:false,error:'Project browser exceeded 8 seconds and was reset. Check for an infinite loop.'});},8000);this.frame.contentWindow.postMessage({id,files:this.version!==version?files:null,actions},'*');this.version=version;});
 }
}
