# Security

Do not put API keys, personal messages, passphrases or vault backups in GitHub issues or pull requests. Keys are entered only in the deployed application's local encrypted vault and sent to the chosen provider when needed.

The full threat model and limitations are in README.md. This project has not received an independent security audit. If a key may have leaked, revoke it at the provider, create a restricted replacement, and replace the connection in Prism. Encryption cannot undo a key that was previously exposed.

Because this is a static personal application with no account service, there is no server-side password reset, data recovery or cloud key management. Keep an encrypted backup and its passphrase separately.


### Cloudflare no-key mode
The public Worker uses its server-side AI binding, not an embedded API key. Its exact-origin check is not authentication. Cloudflare per-IP/shared-pool rate limiting is per location and approximate; it reduces abuse but cannot prevent free-quota exhaustion. The Free plan daily AI allocation is account-wide and the final spending boundary; do not upgrade this backend to paid without adding proper authorization and hard budgets. Worker code never intentionally persists prompt/response bodies. Context is processed by Cloudflare, and the app owner controls Worker code; local vault encryption does not hide inference input from those parties. No telemetry logging of content is added by this code.


Cloudflare model selection: Llama 3.2 3B (existing default), Llama 3.2 1B, Qwen2.5 Coder 32B and Qwen3 30B A3B. All share the same account-wide free allowance; larger/reasoning models can consume it faster. Standard replies remain capped at 512 tokens; the three reasoning-model exceptions below use 1,536 tokens including thinking. No paid-only frontier models or automatic fallback. Qwen3 OpenAI-style responses are normalized to the same chat adapter.


## NVIDIA and Qwen catalog expansion
Official Workers AI catalog checked October 21, 2026. All current NVIDIA and Qwen text-generation entries are in the deployed allowlist: NVIDIA Nemotron 3 Super 120B A12B; Qwen2.5 Coder 32B; Qwen3 30B A3B; Qwen3.8 27B; QwQ 32B. DeepSeek R1 Distill Qwen 32B is included as a separately labelled Qwen-based derivative. Existing two Llama models remain unchanged. Qwen3 Embedding 0.6B is excluded because embedding vectors are not chat replies. Qwen3.8 is text-only here; model-level vision and function calling do not mean Prism implements these features. No paid-only entry is included.
All models draw from the same 10,000-neuron account-wide daily allocation. Standard output cap is 512 tokens; Qwen3.8, QwQ and DeepSeek R1 Distill use a bounded 1,536-token completion cap, including thinking. Nemotron thinking is disabled; Qwen3.8 reasoning effort is low. Larger/reasoning models may exhaust the shared allowance sooner, or fail to produce final text within the cap; no retries or paid fallback. Think-tagged internal content is not returned as a final answer. Existing public endpoint and approximate per-location rate-limit limitations still apply.


## Agent Studio execution boundaries

Model output is parsed as bounded JSON data; it cannot choose arbitrary tool implementations. Local paths reject traversal/hidden/private paths; no deletion operation is exposed. Selected source, user goal and enabled personal context are sent to the chosen provider. This is not automatic secret detection; select dedicated folders without credentials. Native code runs only via explicitly paired localhost runner and Docker isolation, no shell, installs, network, outside mounts or external actions. Browser tests execute in a separate opaque-origin frame + worker with network blocked and five-second limit. No user device runner has been installed automatically.

The session token is memory-only, never put into model context or vault. Lock/switch disconnects the frontend; stop the terminal to revoke the server. Origin checks are not a substitute for bearer authentication. Docker/browser isolation depends on the host's security; do not treat it as protection against platform vulnerabilities. Native project file writes are intentionally permitted in the selected root and backed up before replacement. Existing secrets need manual removal before connecting.

### Integrated JavaScript runner and preview
The in-browser executor is an opaque-origin sandbox frame containing a short-lived worker. It has no native terminal, host filesystem or credentials. Network is blocked by CSP; tests are terminated after five seconds and can be cancelled. Worker results are correlated using an unexposed per-run nonce so project code cannot simply post a forged success object. CommonJS inputs receive only a limited compatibility API, not native Node. The separate HTML preview blocks network, forms, nested frames and parent/storage access. Browser isolation remains dependent on the browser's sandbox/CSP implementation; this is not a VM or a promise of universal language execution.

JSON punctuation recovery never accepts an unterminated source string. Validated actions, path restrictions and write limits still apply after repair. See vendor/jsonrepair/LICENSE.md for the bundled third-party parser license.
