import { SignJWT, jwtVerify, importJWK, exportJWK } from "jose";
import type { Review, ReviewCredential } from "@4me2/schema";
import type { KeyPair } from "./keys.js";

/**
 * Sign a review as a JWT-VC (Verifiable Credential in JWT format).
 * Returns a compact JWS string: header.payload.signature
 */
export async function signReview(
  review: Review,
  issuerDid: string,
  keyPair: KeyPair,
): Promise<string> {
  const privateJwk = await importJWK(
    {
      kty: "OKP",
      crv: "Ed25519",
      d: Buffer.from(keyPair.privateKey).toString("base64url"),
      x: Buffer.from(keyPair.publicKey).toString("base64url"),
    },
    "EdDSA",
  );

  const vc: ReviewCredential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://schema.org",
    ],
    type: ["VerifiableCredential", "ReviewCredential"],
    credentialSubject: {
      "@type": "Review",
      ...review,
    },
  };

  const jwt = await new SignJWT({ vc })
    .setProtectedHeader({ alg: "EdDSA", typ: "vc+jwt" })
    .setIssuer(issuerDid)
    .setIssuedAt()
    .sign(privateJwk);

  return jwt;
}

/**
 * Verify a JWT-VC and extract the review.
 * Returns the issuer DID and the review credential on success.
 */
export async function verifyReview(
  jwt: string,
  publicKey: Uint8Array,
): Promise<{ issuer: string; review: Review }> {
  const publicJwk = await importJWK(
    {
      kty: "OKP",
      crv: "Ed25519",
      x: Buffer.from(publicKey).toString("base64url"),
    },
    "EdDSA",
  );

  const { payload } = await jwtVerify(jwt, publicJwk, {
    algorithms: ["EdDSA"],
  });

  const vc = payload.vc as ReviewCredential;
  const { "@type": _type, ...review } = vc.credentialSubject;

  return {
    issuer: payload.iss as string,
    review: review as Review,
  };
}
