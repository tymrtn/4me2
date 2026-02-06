import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { keyPairFromBytes, verifyReview, contentHash } from "@4me2/crypto";

export async function verify(
  dir: string,
  opts: { key: string },
): Promise<void> {
  const keyData = JSON.parse(readFileSync(opts.key, "utf-8"));
  const keyPair = keyPairFromBytes(keyData);

  const files = readdirSync(dir).filter((f) => f.endsWith(".jwt"));

  if (files.length === 0) {
    console.log(`No .jwt files found in ${dir}`);
    process.exit(1);
  }

  let valid = 0;
  let invalid = 0;

  for (const file of files) {
    const jwt = readFileSync(join(dir, file), "utf-8");
    try {
      const result = await verifyReview(jwt, keyPair.publicKey);

      // Verify content hash
      const { reviewId, ...reviewData } = result.review;
      const expectedHash = contentHash(reviewData);
      if (reviewId !== expectedHash) {
        console.log(`FAIL ${file}: content hash mismatch`);
        console.log(`  Expected: ${expectedHash}`);
        console.log(`  Got:      ${reviewId}`);
        invalid++;
        continue;
      }

      valid++;
    } catch (err) {
      console.log(
        `FAIL ${file}: ${err instanceof Error ? err.message : String(err)}`,
      );
      invalid++;
    }
  }

  console.log(`\nVerified ${files.length} files: ${valid} valid, ${invalid} invalid`);

  if (invalid > 0) {
    process.exit(1);
  }
}
