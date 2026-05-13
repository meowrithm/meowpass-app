import { argon2id } from "hash-wasm";

const NONCE_SIZE = 12;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return (bytes.buffer as ArrayBuffer).slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export async function deriveKey(password: string, saltBytes: Uint8Array) {
  const keyHex = await argon2id({
    password, salt: saltBytes, parallelism: 4, iterations: 3,
    memorySize: 64 * 1024, hashLength: 32, outputType: "hex",
  });
  return hexToBytes(keyHex);
}

export async function encrypt(plaintext: Uint8Array, keyBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", toArrayBuffer(keyBytes), "AES-GCM", false, ["encrypt"]);
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, toArrayBuffer(plaintext));
  const result = new Uint8Array(ct.byteLength + NONCE_SIZE);
  result.set(new Uint8Array(ct), 0);
  result.set(nonce, ct.byteLength);
  return result;
}

export async function decrypt(data: Uint8Array, keyBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", toArrayBuffer(keyBytes), "AES-GCM", false, ["decrypt"]);
  const ct = data.slice(0, data.length - NONCE_SIZE);
  const nonce = data.slice(data.length - NONCE_SIZE);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, toArrayBuffer(ct)));
}

export const generateVaultKey = () => crypto.getRandomValues(new Uint8Array(32));
export const encryptVaultKey = (vk: Uint8Array, mk: Uint8Array) => encrypt(vk, mk);
export const decryptVaultKey = (enc: Uint8Array, mk: Uint8Array) => decrypt(enc, mk);

export function hexToBytes(hex: string) {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) b[i / 2] = parseInt(hex.substr(i, 2), 16);
  return b;
}
export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
export function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
