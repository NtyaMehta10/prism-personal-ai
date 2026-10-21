# Prism local runner

Use a dedicated project folder. Python 3.10+ is required for file tools. Native commands additionally require Docker Desktop/Engine running with these images pulled by you:

```
docker pull node:22-alpine
docker pull python:3.12-alpine
python3 prism_runner.py --workspace "/absolute/path/to/your/project"
```

On Windows use `py prism_runner.py --workspace "C:\\path\\to\\project"`.

Open Prism at https://ntyamehta10.github.io/prism-personal-ai/ → + → Connect runner. Enter port 4318 and the session token printed only in your terminal. Your browser may ask to allow local-network access. Do not send the token to an AI model. It stays in page memory and is forgotten when you reload/lock. Stop the terminal with Ctrl-C to disconnect.

The selected folder's non-hidden text files can be read and created/replaced automatically during a run. Existing file replacements are backed up under `.prism-history`. This is not universal secret detection: review your project before connecting. Never select a folder containing credentials or sensitive unrelated material. Up to 150 files/120 KB each, 5 MB snapshot. Hidden files, dependency directories, credential directories, key files and symlinks are blocked. No delete endpoint.

Native execution supports `node file.js`, `node --test test.js`, `python test.py`, `python -m unittest discover`. Commands run against a read-only snapshot in disposable containers, with no network, host mounts, added capabilities or shell, capped memory/CPU/process count, 25-second timeout and output limits. Test-side file writes are not synchronized to your selected folder. Installs, native builds, external APIs, Git operations and arbitrary shells are not supported. Python tests may use `/tmp`; Node tests must use built-in modules or project sources with no installed dependencies. A Docker image is never pulled automatically. Browser-only mode needs no runner and executes JavaScript assertions in an isolated sandbox, not native terminal commands.

Origin and host checks plus a random per-session bearer token protect the localhost API. Pair only with the official Prism site. Closing the browser doesn't stop this server; stop the terminal when finished. This is a constrained local developer companion, not an OS-level security guarantee against vulnerabilities in Docker or your browser.
