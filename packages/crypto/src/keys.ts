import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// noble/ed25519 v2 requires setting the sha512 hash function
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export interface KeyPair {
  /** 32-byte private key */
  privateKey: Uint8Array;
  /** 32-byte public key */
  publicKey: Uint8Array;
}

/** Generate a new Ed25519 keypair. */
export function generateKeyPair(): KeyPair {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = ed.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/** Serialize a keypair to a JSON-friendly object with base64url encoding. */
export function keyPairToBytes(kp: KeyPair): {
  privateKey: string;
  publicKey: string;
} {
  return {
    privateKey: toBase64Url(kp.privateKey),
    publicKey: toBase64Url(kp.publicKey),
  };
}

/** Deserialize a keypair from base64url strings. */
export function keyPairFromBytes(data: {
  privateKey: string;
  publicKey: string;
}): KeyPair {
  return {
    privateKey: fromBase64Url(data.privateKey),
    publicKey: fromBase64Url(data.publicKey),
  };
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, "base64url"));
}
