import { argon2id } from "hash-wasm";
import { x25519 } from "@noble/curves/ed25519.js";

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

// ── X25519 Key Exchange ──

export function generateX25519KeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export async function encryptForRecipient(plaintext: Uint8Array, recipientPublicKey: Uint8Array): Promise<Uint8Array> {
  const ephemeral = generateX25519KeyPair();
  const shared = x25519.getSharedSecret(ephemeral.privateKey, recipientPublicKey);
  const encrypted = await encrypt(plaintext, shared);
  // Format: ephemeral_public_key (32) || encrypted (ciphertext + tag + nonce)
  const result = new Uint8Array(32 + encrypted.length);
  result.set(ephemeral.publicKey, 0);
  result.set(encrypted, 32);
  return result;
}

export async function decryptFromSender(data: Uint8Array, recipientPrivateKey: Uint8Array): Promise<Uint8Array> {
  if (data.length < 32) throw new Error("data too short for X25519");
  const senderPublicKey = data.slice(0, 32);
  const encryptedData = data.slice(32);
  const shared = x25519.getSharedSecret(recipientPrivateKey, senderPublicKey);
  return decrypt(encryptedData, shared);
}

// Decrypt vault key: try AES (own vault) first, then X25519 (shared vault)
export async function decryptVaultKeyAuto(
  encKey: Uint8Array, masterKey: Uint8Array, encPrivateKey?: Uint8Array | null
): Promise<Uint8Array> {
  // Try AES first (own vault — 60 bytes)
  try {
    return await decryptVaultKey(encKey, masterKey);
  } catch {
    // Fall through to X25519
  }

  // Try X25519 (shared vault — 92 bytes: 32 ephemeral pubkey + 32 vault key + 16 tag + 12 nonce)
  if (!encPrivateKey || encPrivateKey.length === 0) {
    throw new Error("Cannot decrypt shared vault — no X25519 private key");
  }

  // Decrypt private key with master key
  const privateKey = await decrypt(encPrivateKey, masterKey);
  return decryptFromSender(encKey, privateKey);
}

// ── Helpers ──

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
export function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
