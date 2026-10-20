export const STORAGE_KEY = 'prism.encrypted.v1';
const encoder = new TextEncoder(), decoder = new TextDecoder();
const b64 = bytes => { let text=''; for(let i=0;i<bytes.length;i+=8192) text+=String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(text); };
const unb64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
export function validateEnvelope(v) {
  if (!v || v.version !== 1 || v.kdf !== 'PBKDF2-SHA256' || v.iterations !== 600000 || typeof v.salt !== 'string' || typeof v.iv !== 'string' || typeof v.ciphertext !== 'string' || v.ciphertext.length > 20000000) throw new Error('This is not a supported Prism encrypted backup.');
  if (unb64(v.salt).length !== 16 || unb64(v.iv).length !== 12 || unb64(v.ciphertext).length < 16) throw new Error('The backup is incomplete.');
  return v;
}
export async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:600000, hash:'SHA-256'}, material, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
}
export async function encrypt(data, key, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('prism-v1')}, key, encoder.encode(JSON.stringify(data)));
  return {version:1,kdf:'PBKDF2-SHA256',iterations:600000,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(raw))};
}
export async function decrypt(envelope, passphrase) {
  validateEnvelope(envelope);
  const salt = unb64(envelope.salt), key = await deriveKey(passphrase,salt);
  const raw = await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(envelope.iv),additionalData:encoder.encode('prism-v1')}, key, unb64(envelope.ciphertext));
  const data = JSON.parse(decoder.decode(raw));
  if (data.version !== 1 || !Array.isArray(data.chats) || !Array.isArray(data.connections) || !Array.isArray(data.memories) || !Array.isArray(data.skills) || !data.personality || !data.preferences) throw new Error('The vault data format is not supported.');
  return {data,key,salt};
}
