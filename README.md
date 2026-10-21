# Prism

A personal AI workspace with no-key Cloudflare free chat and optional bring-your-own-key providers with a responsive frosted-glass interface. Static HTML, CSS and JavaScript; no build step or paid hosting dependency.

## What works

- Multiple saved provider/key/model connections, including multiple keys for the same provider.
- Searchable chat history, pinning and renaming, streaming OpenAI-compatible replies, explicit stop/retry, and per-conversation model/skill selection.
- Conversation branches that preserve the original, including edit-as-a-new-branch drafts.
- Keyboard quick switch (Ctrl/Cmd+K) for conversations and workspace actions.
- Safe Markdown-style replies with fenced code and copy-code controls; raw HTML stays inert.
- OpenAI Chat Completions, OpenRouter, Google Gemini `generateContent`, Anthropic Messages, and HTTPS OpenAI-compatible endpoints.
- Editable memories that can be paused or disabled, personal context and response preferences.
- User-created skills: reusable model instructions, not executable tools.
- Browser dictation when supported, per-reply read aloud, and optional automatic read aloud. Browser/OS speech services may process spoken audio or text.
- Passphrase-encrypted device-local vault; encrypted backup/restore and explicit plaintext conversation export.

## Start

Open the deployed HTTPS site, create a strong vault passphrase (12 characters minimum), and choose **Use Cloudflare free · no key** on a new conversation for Llama 3.2 3B without a key. Optional providers: open **Settings & models → Add connection**. Enter a label, provider, trusted HTTPS API base, exact model ID, and your API key. You can add several connections and select a model in the chat toolbar.

No real keys, conversations or personal memories ship with the application. There are no simulated replies. API use can incur charges with your provider; publishing/hosting this static app does not subscribe you to an AI provider.

For local development, serve the directory on localhost, for example `python3 -m http.server 8000`, then open `http://localhost:8000`. Opening `index.html` via `file://` is not supported.

## Privacy and security model

- All durable personal app data is encrypted **before** browser localStorage. The saved envelope contains version, salt, IV, KDF parameters and ciphertext—not plaintext keys/chats/memories.
- Web Crypto: PBKDF2-HMAC-SHA-256 (600,000 iterations, random 16-byte salt) derives a non-extractable AES-GCM-256 key. Each save has a fresh random 12-byte IV and authenticated format context.
- The passphrase is never persisted or sent to a server. Forgotten passphrases cannot be recovered.
- The unlocked page necessarily holds keys and content in memory. Encryption at rest is not protection from malicious browser extensions, a compromised device, malicious future code updates, or someone using an unlocked tab.
- API requests send the selected connection's key and conversation, enabled memories, personalization and selected skill directly to that endpoint. Only enter trusted provider URLs. Redirects and ambient request credentials are disabled. A changed provider/endpoint requires entering a key again.
- No analytics, external scripts, remote fonts, application accounts or cloud sync. Cloudflare free mode uses the app owner’s public Worker described below. GitHub serves the app source and may retain ordinary hosting access logs; provider retention rules apply to API requests.
- Dictation/read-aloud depend on browser/OS services and can send speech/text to those services. Dictation fills a draft; it never automatically submits it.
- The vault auto-locks after approximately 15 minutes without interaction while the tab is running. Locking hides content and drops active key references; JavaScript cannot guarantee secure erasure of device memory.
- This is a single-device browser vault. Clearing site data removes it. Keep encrypted backups and the passphrase separately. Do not edit simultaneously in multiple tabs: there is no merge or cloud synchronization.
- There is no third-party security audit. Use restricted, revocable API keys with provider budgets. For centrally managed or shared deployments, a real authenticated backend/secret broker is preferable.

## Model compatibility

Direct browser requests require the endpoint to allow this site's origin through CORS. Some providers, API gateways or enterprise accounts disallow them. Prism does not bypass CORS or send keys through an unknown proxy. Anthropic uses its explicit direct-browser-access opt-in header. If browser access is blocked, use a provider that permits it, or deploy a separate trusted backend with authentication and secret management.

These are text-chat adapters, not an assertion that every model supports the same API. Exact model access, billing and request limits belong to the provider. Responses/Assistants-only APIs, native multimodal uploads, tool execution, web browsing and autonomous actions are not implemented. Memory is explicit user-maintained context; the app does not silently extract personal facts from conversations. AI output is rendered as text, not unsanitized HTML.

## Deployment

The repository is a standalone static site and is compatible with free GitHub Pages hosting from a public repository. No API keys belong in repository files, Actions variables, or commits. GitHub Pages is configured for the main branch root; `.nojekyll` prevents Jekyll processing. A GitHub Pages origin change creates a different browser storage origin; export an encrypted backup before moving hosts.

## Validation

Local Chromium desktop and phone-size tests exercised encrypted creation/unlock/lock, at-rest encryption, failed-key error handling, explicit retry, multiple connections, personal/skill/memory context, mobile overflow, Web Crypto tamper rejection, and all three request formats. AI provider responses were mocked with non-working test credentials; no real provider accounts or credits were used. Live provider access remains dependent on the key/model the user supplies and its CORS policy.

## Free-model library

Open **Settings & models → Explore models**, or **Explore free models** on a new conversation.

- **OpenRouter** fetches the live public models catalog and shows only zero-priced text input/output models whose IDs are `:free` or `openrouter/free`. Search by name or ID, connect, then add your own OpenRouter API key in the encrypted settings form. The router selects among free models; specific free variants are also selectable. Before saving and before every reply, Prism refreshes pricing and fails closed if the selected model is no longer free. Requests constrain provider token pricing to zero and never include paid model fallback arrays or paid plugins. Catalog calls contain no API keys, messages or personal context. Free capacity is not unlimited: the documented no-credit-purchase tier is generally 20 requests/minute and 50/day, subject to provider/account limits. No credit purchase is required by Prism.
- **Groq Free plan** presets: `openai/gpt-oss-20b` and `openai/gpt-oss-120b`. Your own Groq key is required. Published base quotas are 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day per organization, subject to account-specific exceptions. Stay on the Free plan; Developer-plan usage is billable.
- **Gemini Free tier** preset: `gemini-3.5-flash-lite`. Your own Gemini API key and eligible free-tier project are required. Regional access and project quotas apply; check AI Studio. A paid/billing-enabled project can charge for this same model, and free-tier data may be used to improve Google products. No grounding, search, caching or other paid tools are requested by Prism.

Prism cannot inspect Groq/Gemini billing tiers or promise unlimited service. No account is created or upgraded for you, no key is embedded or shared, and Cloudflare is the separate no-key cloud option described below. No local inference is claimed. Provider errors are shown without fabricated replies. A provider signup may be required if you do not already have a key. Keys are entered only in the app and remain in the existing encrypted device-local vault; all existing vaults stay compatible.

Provider references (checked October 21, 2026):
- https://openrouter.ai/docs/guides/routing/routers/free-router
- https://openrouter.ai/docs/guides/routing/model-variants/free
- https://openrouter.ai/docs/api_reference/limits
- https://openrouter.ai/docs/guides/routing/provider-selection
- https://console.groq.com/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/models

Catalog browser requests and preflight CORS were checked from the GitHub Pages origin. Inference adapters are tested with synthetic keys and mocked responses; real owner-key inference still requires configuring a valid key. Free model availability and terms can change.


## Cloudflare no-key chat

**Use Cloudflare free · no key** selects `@cf/meta/llama-3.2-3b-instruct`. The real endpoint is `https://prism-free-ai.aethonlabs.workers.dev/v1/chat/completions`; it runs on the app owner’s Cloudflare Free account with an `AI` binding, not an API secret. No key or signup is required from the person using Prism. It uses real model inference, not a playground proxy or simulated replies. Other providers remain optional and unchanged.

All enabled conversation context (messages, memories, personalization and skill) is sent through the app owner’s Cloudflare Worker to Cloudflare Workers AI after the user presses Send. The Worker does not deliberately store prompts/responses or application content logs, but Cloudflare’s platform policies, ordinary service telemetry and the account operator’s future code apply. Local vault encryption is unchanged and does not mean remote inference is end-to-end encrypted from Cloudflare. Do not send sensitive data unless comfortable with that processing.

The account’s Workers AI Free allocation is 10,000 neurons/day across the account, resetting at 00:00 UTC. Availability is shared, and usage by other apps can exhaust it. No paid plan was enabled. Free quota exhaustion fails rather than selecting a paid model. Free Workers request/CPU quotas also apply. This is not guaranteed unlimited or exclusive capacity.

The endpoint is public, **not authenticated**. An exact Prism-origin CORS check is only a browser constraint, not identity verification; non-browser clients can spoof Origin. A Cloudflare rate-limit binding targets four requests/minute per IP and four/minute for the shared pool at each Cloudflare location. These distributed counters are intentionally approximate and are not a worldwide hard daily quota. Abuse can still consume the free allowance. Request sizes are bounded to 24,000 bytes/20,000 content characters/40 messages, the model is fixed, output is capped at 512 tokens, and no arbitrary models, URLs, tools or paid fallbacks are exposed. Limits return actionable errors, never automatic retries. The Free plan's account quota is the final cost boundary.

`cloudflare-worker.js` contains the deployed Worker implementation; `wrangler.jsonc` documents the non-secret bindings. These files are source, not browser credentials. D1/KV and unrelated bot integrations are not used. Deploying elsewhere requires the owner to set the authorized site origin and bindings, using Cloudflare’s supported deployment flow. The included binding namespace is this Worker’s account configuration, not a secret or an authorization token.
