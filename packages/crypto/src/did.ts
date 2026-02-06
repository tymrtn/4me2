/**
 * Generate a minimal did:web DID document.
 * Served at https://{domain}/.well-known/did.json
 */
export function generateDidDocument(
  domain: string,
  publicKey: Uint8Array,
): object {
  const did = `did:web:${domain}`;
  const publicKeyMultibase = `z${Buffer.from(publicKey).toString("base64url")}`;

  return {
    "@context": "https://www.w3.org/ns/did/v1",
    id: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyMultibase,
      },
    ],
    assertionMethod: [`${did}#key-1`],
    authentication: [`${did}#key-1`],
  };
}
