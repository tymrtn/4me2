import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { keyPairFromBytes, signReview } from "@4me2/crypto";
import { parseTakeoutReviews } from "@4me2/takeout-parser";

export async function importReviews(
  takeoutJson: string,
  opts: { key: string; did: string; output: string },
): Promise<void> {
  // Load keypair
  const keyData = JSON.parse(readFileSync(opts.key, "utf-8"));
  const keyPair = keyPairFromBytes(keyData);

  // Parse Takeout
  const json = readFileSync(takeoutJson, "utf-8");
  const result = parseTakeoutReviews(json);

  console.log(`Parsed ${result.stats.parsed} reviews (${result.stats.skipped} skipped)`);
  console.log(`  With text: ${result.stats.withText}`);
  console.log(`  Rating-only: ${result.stats.withoutText}`);

  // Create output directory
  if (!existsSync(opts.output)) {
    mkdirSync(opts.output, { recursive: true });
  }

  // Sign and write each review
  let signed = 0;
  for (const review of result.reviews) {
    const jwt = await signReview(review, opts.did, keyPair);
    const filename = review.reviewId.replace("sha256:", "") + ".jwt";
    writeFileSync(join(opts.output, filename), jwt);
    signed++;
  }

  console.log(`Signed ${signed} reviews to ${opts.output}/`);

  // Write manifest
  const manifest = {
    issuer: opts.did,
    publicKey: keyData.publicKey,
    reviewCount: signed,
    reviews: result.reviews.map((r) => ({
      reviewId: r.reviewId,
      place: r.itemReviewed.name,
      rating: r.reviewRating.ratingValue,
      hasText: !!r.reviewBody,
      date: r.datePublished,
    })),
  };
  writeFileSync(
    join(opts.output, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`Manifest written to ${opts.output}/manifest.json`);
}
