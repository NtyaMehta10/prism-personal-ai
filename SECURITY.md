# Security

Do not put API keys, personal messages, passphrases or vault backups in GitHub issues or pull requests. Keys are entered only in the deployed application's local encrypted vault and sent to the chosen provider when needed.

The full threat model and limitations are in README.md. This project has not received an independent security audit. If a key may have leaked, revoke it at the provider, create a restricted replacement, and replace the connection in Prism. Encryption cannot undo a key that was previously exposed.

Because this is a static personal application with no account service, there is no server-side password reset, data recovery or cloud key management. Keep an encrypted backup and its passphrase separately.


### Cloudflare no-key mode
The public Worker uses its server-side AI binding, not an embedded API key. Its exact-origin check is not authentication. Cloudflare per-IP/shared-pool rate limiting is per location and approximate; it reduces abuse but cannot prevent free-quota exhaustion. The Free plan daily AI allocation is account-wide and the final spending boundary; do not upgrade this backend to paid without adding proper authorization and hard budgets. Worker code never intentionally persists prompt/response bodies. Context is processed by Cloudflare, and the app owner controls Worker code; local vault encryption does not hide inference input from those parties. No telemetry logging of content is added by this code.
