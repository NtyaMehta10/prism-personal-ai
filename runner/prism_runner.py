#!/usr/bin/env python3
"""Prism scoped local companion. Python 3.10+, Docker required for isolated commands.
Start: python3 prism_runner.py --workspace /absolute/project/folder
No account/API key. Pairing token is session-only. Never send it to an AI provider.
"""
import argparse,os,json,secrets,hmac,shutil,subprocess,tempfile,threading,time,signal
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlsplit
ORIGIN='https://ntyamehta10.github.io'
BLOCKED={'node_modules','vendor','secrets','credentials','__pycache__'}
def safe_path(root,value):
 if not isinstance(value,str) or not value or len(value)>220 or any(c in value for c in ['\\',':','\0']) or value.startswith('/'):
  raise ValueError('Unsafe workspace path')
 parts=value.split('/')
 if any(not p or p in {'.','..'} or p.startswith('.') or p.lower() in BLOCKED for p in parts) or Path(value).suffix.lower() in {'.pem','.key','.p12','.pfx'}:raise ValueError('Private or unsafe path')
 path=root.joinpath(*parts)
 # Reject links at every level, including a link whose target returns inside the root.
 for p in [path,*path.parents]:
  if p==root.parent:break
  if p.is_symlink():raise ValueError('Symlinks are not supported')
 if not path.resolve().is_relative_to(root):raise ValueError('Path escapes selected workspace')
 return path
class State:
 def __init__(self,root,token,origins):self.root=root.resolve();self.token=token;self.origins=origins;self.lock=threading.Lock();self.proc=None;self.container=None;self.cancelled=False
 def files(self):
  out=[]
  for base,dirs,files in os.walk(self.root,followlinks=False):
   dirs[:]=[d for d in dirs if not d.startswith('.') and d.lower() not in BLOCKED and not Path(base,d).is_symlink()]
   for f in files:
    path=str(Path(base,f).relative_to(self.root)).replace(os.sep,'/')
    try:
     p=safe_path(self.root,path)
     if p.is_file() and p.stat().st_size<=120000: p.read_text('utf-8');out.append(path)
    except (ValueError,UnicodeError,OSError):pass
    if len(out)>=150:return sorted(out)
  return sorted(out)
 def run(self,argv):
  if not isinstance(argv,list) or not 2<=len(argv)<=12 or not all(isinstance(x,str) and len(x)<240 for x in argv):raise ValueError('Use an explicit Node or Python test argument array')
  # No shell, no flags for eval/import hooks, no installs. Code runs only in a disposable container.
  exe=argv[0]
  if exe=='node':
   args=argv[1:]
   if args[0]=='--test':args=args[1:]
   if not args or any(x.startswith('-') for x in args):raise ValueError('Supported: node file.js or node --test test.js')
   image='node:22-alpine'
  elif exe in {'python','python3'}:
   if argv[1:]==['-m','unittest','discover']:args=[]
   elif len(argv)==2 and not argv[1].startswith('-'):args=[argv[1]]
   else:raise ValueError('Supported: python test.py or python -m unittest discover')
   image='python:3.12-alpine';argv=['python',*argv[1:]]
  else:raise ValueError('Only Node and Python tests are supported. No shell or package installs.')
  for path in args:
   if not safe_path(self.root,path).is_file():raise ValueError('Test file not found')
  if not shutil.which('docker'):raise ValueError('Docker is not installed. File tools work; native commands need Docker Desktop/Engine.')
  # Never implicitly pull an image: setup is explicit and no billing/account action is hidden here.
  if subprocess.run(['docker','image','inspect',image],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10).returncode:raise ValueError('Missing sandbox image. On your computer run: docker pull '+image)
  if not self.lock.acquire(blocking=False):raise ValueError('A native command is already running')
  try:
   self.cancelled=False
   with tempfile.TemporaryDirectory(prefix='prism-sandbox-') as directory:
    stage=Path(directory);os.chmod(stage,0o755);total=0
    for name in self.files():
     src=safe_path(self.root,name);content=src.read_bytes();total+=len(content)
     if total>5000000:raise ValueError('Project snapshot exceeds 5 MB')
     dest=stage/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(content);os.chmod(dest,0o644)
    self.container='prism-'+secrets.token_hex(8)
    cmd=['docker','run','--rm','--pull=never','--name',self.container,'--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--pids-limit=64','--memory=256m','--cpus=1','--user=65534:65534','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--mount',f'type=bind,src={stage},dst=/workspace,readonly','--workdir=/workspace',image,*argv]
    with tempfile.TemporaryFile() as output:
     self.proc=subprocess.Popen(cmd,stdout=output,stderr=subprocess.STDOUT);start=time.monotonic()
     while self.proc.poll() is None:
      if self.cancelled or time.monotonic()-start>25:
       subprocess.run(['docker','rm','-f',self.container],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10);self.proc.kill();break
      if output.tell()>64000:
       self.cancelled=True;continue
      time.sleep(.1)
     code=self.proc.wait(timeout=10);output.seek(0);text=output.read(64000).decode('utf-8',errors='replace')
    return {'ok':code==0 and not self.cancelled,'exitCode':code,'output':text,'engine':'Docker isolated '+image,'timedOut':time.monotonic()-start>25,'cancelled':self.cancelled}
  finally:self.proc=None;self.container=None;self.lock.release()
class Handler(BaseHTTPRequestHandler):
 server_version='PrismRunner/1'
 def log_message(self,*args):pass # Never log bearer tokens, source or request bodies.
 def respond(self,status,data):
  raw=json.dumps(data).encode();self.send_response(status)
  if self.headers.get('Origin') in self.server.state.origins:self.send_header('Access-Control-Allow-Origin',self.headers['Origin'])
  self.send_header('Vary','Origin');self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS');self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type');self.send_header('Access-Control-Allow-Private-Network','true');self.send_header('Cache-Control','no-store');self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_OPTIONS(self):
  if not self.valid_origin():return self.respond(403,{'error':'Origin denied'})
  self.respond(200,{})
 def valid_origin(self):return self.headers.get('Origin') in self.server.state.origins and self.headers.get('Host') in {'127.0.0.1:'+str(self.server.server_port),'localhost:'+str(self.server.server_port)}
 def do_GET(self):self.action()
 def do_POST(self):self.action()
 def action(self):
  s=self.server.state
  if not self.valid_origin():return self.respond(403,{'error':'Origin/host denied'})
  if not hmac.compare_digest(self.headers.get('Authorization',''),'Bearer '+s.token):return self.respond(401,{'error':'Pairing token required'})
  try:
   n=int(self.headers.get('Content-Length','0'))
   if n>180000:raise ValueError('Request too large')
   body=json.loads(self.rfile.read(n)) if n else {};path=urlsplit(self.path).path
   if self.command=='GET' and path=='/info':out={'workspace':s.root.name,'path':str(s.root),'docker':bool(shutil.which('docker')),'nativeIsolation':'Docker, network disabled, read-only project snapshot','version':1}
   elif self.command=='GET' and path=='/files':out={'files':s.files()}
   elif self.command=='POST' and path=='/read':
    p=safe_path(s.root,body.get('path'))
    if p.stat().st_size>120000:raise ValueError('File exceeds 120 KB')
    out={'content':p.read_text('utf-8')}
   elif self.command=='POST' and path=='/write':
    p=safe_path(s.root,body.get('path'));content=body.get('content')
    if not isinstance(content,str) or len(content.encode())>120000:raise ValueError('File exceeds 120 KB')
    if p.exists():
     # Private rollback copies cannot be read by the model or exposed through file endpoints.
     history=s.root/'.prism-history'
     if history.is_symlink():raise ValueError('History directory must not be a symlink')
     history.mkdir(exist_ok=True);os.chmod(history,0o700)
     backup=history/(str(time.time_ns())+'-'+secrets.token_hex(4)+'.bak');backup.write_bytes(p.read_bytes());os.chmod(backup,0o600)
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,'utf-8');out={'written':body['path']}
   elif self.command=='POST' and path=='/run':out=s.run(body.get('argv'))
   elif self.command=='POST' and path=='/cancel':s.cancelled=True;out={'cancelRequested':True}
   else:return self.respond(404,{'error':'Unsupported operation'})
   self.respond(200,out)
  except (ValueError,KeyError,OSError,subprocess.SubprocessError) as e:self.respond(400,{'error':str(e)[:400]})
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--workspace',required=True);parser.add_argument('--port',type=int,default=4318);args=parser.parse_args();root=Path(args.workspace).expanduser()
 if root.is_symlink() or not root.is_dir() or root.resolve()==Path.home() or root.resolve()==Path(root.anchor):parser.error('Choose a dedicated existing project folder, not home or filesystem root')
 token=secrets.token_urlsafe(32);server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler);server.state=State(root,token,{ORIGIN})
 print('Prism local runner — selected folder:',root.resolve());print('Pair in Prism → + → Connect runner. Port:',args.port);print('Session pairing token:',token);print('Never paste this token into a conversation. Keep this terminal open. Ctrl-C disconnects.');print('Native tests require Docker and pre-pulled node:22-alpine / python:3.12-alpine images. Network and host access are disabled inside test containers.')
 try:server.serve_forever()
 except KeyboardInterrupt:server.state.cancelled=True;server.server_close()
if __name__=='__main__':main()
