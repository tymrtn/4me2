import { writeFileSync } from "node:fs";
import { generateKeyPair, keyPairToBytes } from "@4me2/crypto";

export function keygen(opts: { output: string }): void {
  const kp = generateKeyPair();
  const serialized = keyPairToBytes(kp);

  writeFileSync(opts.output, JSON.stringify(serialized, null, 2) + "\n");
  console.log(`Keypair written to ${opts.output}`);
  console.log(`Public key: ${serialized.publicKey}`);
}
