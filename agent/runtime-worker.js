// Runs only inside an opaque-origin sandbox, terminated after five seconds.
self.fetch=undefined;self.XMLHttpRequest=undefined;self.WebSocket=undefined;self.EventSource=undefined;self.importScripts=undefined;
self.onmessage=async e=>{
 const {files,code,command,nonce}=e.data,cache={},logs=[],jobs=[];const send=self.postMessage.bind(self);self.onmessage=null;let assertions=0,tests=0;
 const log=(...x)=>{if(logs.length<120)logs.push(x.map(v=>typeof v==='string'?v:JSON.stringify(v)).join(' ').slice(0,1500));};
 const assert=(v,m='Assertion failed')=>{assertions++;if(!v)throw Error(m);};
 assert.ok=assert;assert.equal=assert.strictEqual=(a,b,m)=>assert(a===b,m||`Expected ${a} === ${b}`);
 assert.notEqual=assert.notStrictEqual=(a,b,m)=>assert(a!==b,m||'Expected unequal values');
 assert.deepEqual=assert.deepStrictEqual=(a,b,m)=>assert(JSON.stringify(a)===JSON.stringify(b),m||'Expected deep equality');
 assert.throws=(fn,expected)=>{let err;try{fn();}catch(e){err=e;}assert(!!err,'Expected function to throw');if(expected instanceof RegExp)assert(expected.test(err.message),'Unexpected error');};
 const normalize=(path,from='')=>{const parts=(path.startsWith('.')?from.split('/').slice(0,-1).join('/')+'/'+path:path).split('/'),out=[];for(const p of parts){if(!p||p==='.')continue;if(p==='..'){if(!out.length)throw Error('Path escapes project');out.pop();}else out.push(p);}const n=out.join('/');return [n,n+'.js',n+'.cjs',n+'/index.js'].find(x=>Object.hasOwn(files,x))||n;};
 const test=(name,fn)=>{tests++;jobs.push(Promise.resolve().then(()=>fn({test,assert})).then(()=>log('PASS',name)));};test.test=test;test.describe=(n,f)=>f();test.it=test;
 const fs={readFileSync:(p)=>{const n=normalize(p);if(!Object.hasOwn(files,n))throw Error('File not found: '+p);return files[n];},existsSync:p=>Object.hasOwn(files,normalize(p)),readdirSync:()=>Object.keys(files)};
 function loadSync(path,from=''){
  const n=normalize(path,from);if(cache[n])return cache[n].exports;if(!Object.hasOwn(files,n))throw Error('Module not found: '+n);
  const module={exports:{}};cache[n]=module;
  const require=p=>{if(['assert','assert/strict','node:assert','node:assert/strict'].includes(p))return assert;if(['node:test','test'].includes(p))return test;if(['fs','node:fs'].includes(p))return fs;if(!p.startsWith('.'))throw Error('Package '+p+' is unavailable in the browser runner. Use project modules or the optional local runner.');return loadSync(p,n);};
  let source=files[n];if(/^\s*(import\s|export\s)/m.test(source))throw Error('Browser runner expects CommonJS modules (module.exports / require). ES modules can run in the web preview; native toolchains need the optional local runner.');
  new Function('module','exports','require','console','process','__filename','__dirname',source)(module,module.exports,require,{log,error:log,warn:log},{argv:['browser-js',n],env:Object.freeze({}),version:'browser-js (not Node.js)'},n,n.split('/').slice(0,-1).join('/'));return module.exports;
 }
 try{
  if(command){const argv=command;if(!Array.isArray(argv)||argv[0]!=='node'||argv.length>3)throw Error('Built-in runner supports node file.js or node --test test.js (browser JavaScript, not native Node). Python, installs and shells need the optional local runner.');const path=argv.length===3&&argv[1]==='--test'?argv[2]:argv.length===2?argv[1]:null;if(!path||!/^.*\.(c?js)$/.test(path))throw Error('Choose a .js or .cjs project file.');loadSync(path);for(let i=0;i<jobs.length;i++)await jobs[i];
  }else{await new (Object.getPrototypeOf(async function(){}).constructor)('load','assert','files','console','require',code)(async p=>loadSync(p),assert,files,{log},p=>loadSync(p));for(let i=0;i<jobs.length;i++)await jobs[i];if(!assertions)throw Error('No assertions were executed');}
  send({nonce,result:{ok:true,assertions,tests,exitCode:0,engine:'Prism built-in JavaScript runner (not native Node)',output:logs.join('\n')||'Script executed successfully.'}});
 }catch(e){send({nonce,result:{ok:false,assertions,tests,exitCode:1,error:e.message,engine:'Prism built-in JavaScript runner',output:logs.join('\n')}});}
};
