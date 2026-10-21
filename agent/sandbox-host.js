 const workerCode=`self.fetch=undefined;self.XMLHttpRequest=undefined;self.WebSocket=undefined;self.EventSource=undefined;self.importScripts=undefined;self.onmessage=async e=>{const {files,code}=e.data,cache={};let assertions=0;const logs=[];const assert=(v,m='Assertion failed')=>{assertions++;if(!v)throw Error(m);};const load=async path=>{if(!(path in files))throw Error('Missing file: '+path);if(cache[path])return cache[path];const module={exports:{}};new Function('module','exports',files[path])(module,module.exports);return cache[path]=module.exports;};try{await new (Object.getPrototypeOf(async function(){}).constructor)('load','assert','files','console',code)(load,assert,files,{log:(...x)=>logs.push(x.map(String).join(' ').slice(0,1000))});if(!assertions)throw Error('No assertions were executed');self.postMessage({ok:true,assertions,output:logs.join('\\n')});}catch(e){self.postMessage({ok:false,assertions,error:e.message,output:logs.join('\\n')});}};`;

const worker=new Worker(URL.createObjectURL(new Blob([workerCode],{type:'text/javascript'})));
let started=false,runId='';
worker.onmessage=e=>parent.postMessage({id:runId,result:e.data},'*');
addEventListener('message',e=>{if(e.source!==parent)return;if(e.data?.terminate){worker.terminate();return;}if(started)return;started=true;runId=e.data.id;worker.postMessage(e.data);});
parent.postMessage({ready:true},'*');
