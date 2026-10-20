# Security

Do not put API keys, personal messages, passphrases or vault backups in GitHub issues or pull requests. Keys are entered only in the deployed application's local encrypted vault and sent to the chosen provider when needed.

The full threat model and limitations are in README.md. This project has not received an independent security audit. If a key may have leaked, revoke it at the provider, create a restricted replacement, and replace the connection in Prism. Encryption cannot undo a key that was previously exposed.

Because this is a static personal application with no account service, there is no server-side password reset, data recovery or cloud key management. Keep an encrypted backup and its passphrase separately.
