import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  keyPairToBytes,
  keyPairFromBytes,
  contentHash,
  signReview,
  verifyReview,
  generateDidDocument,
} from "./index.js";
import type { Review } from "@4me2/schema";

const SAMPLE_REVIEW: Omit<Review, "reviewId"> = {
  itemReviewed: {
    type: "LocalBusiness",
    name: "DopiCo Specialty Coffee",
    address: "C. de Ferraz, 36, Madrid",
    geo: { latitude: 40.4262536, longitude: -3.7169153 },
    identifiers: [{ name: "googleCid", value: "0xee78edee1214fa1f" }],
    countryCode: "ES",
  },
  reviewRating: { ratingValue: 5, bestRating: 5 },
  reviewBody: "My fav local cafe",
  datePublished: "2026-01-13T12:42:41.911551Z",
  additionalRatings: [
    { category: "Food", ratingValue: 5 },
    { category: "Service", ratingValue: 5 },
  ],
  additionalInfo: [{ question: "Price per person", answer: "€20–30" }],
};

describe("keys", () => {
  it("generates a valid Ed25519 keypair", () => {
    const kp = generateKeyPair();
    expect(kp.privateKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.privateKey.length).toBe(32);
    expect(kp.publicKey.length).toBe(32);
  });

  it("round-trips keypair through serialization", () => {
    const kp = generateKeyPair();
    const serialized = keyPairToBytes(kp);
    const restored = keyPairFromBytes(serialized);
    expect(restored.privateKey).toEqual(kp.privateKey);
    expect(restored.publicKey).toEqual(kp.publicKey);
  });
});

describe("contentHash", () => {
  it("produces a sha256-prefixed hash", () => {
    const hash = contentHash(SAMPLE_REVIEW);
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    const a = contentHash(SAMPLE_REVIEW);
    const b = contentHash(SAMPLE_REVIEW);
    expect(a).toBe(b);
  });

  it("is order-independent for object keys", () => {
    const a = contentHash(SAMPLE_REVIEW);
    // Create with keys in different order
    const reordered = {
      reviewBody: SAMPLE_REVIEW.reviewBody,
      reviewRating: SAMPLE_REVIEW.reviewRating,
      itemReviewed: SAMPLE_REVIEW.itemReviewed,
      datePublished: SAMPLE_REVIEW.datePublished,
      additionalRatings: SAMPLE_REVIEW.additionalRatings,
      additionalInfo: SAMPLE_REVIEW.additionalInfo,
    };
    const b = contentHash(reordered as Omit<Review, "reviewId">);
    expect(a).toBe(b);
  });

  it("changes when content changes", () => {
    const a = contentHash(SAMPLE_REVIEW);
    const modified = { ...SAMPLE_REVIEW, reviewBody: "Different text" };
    const b = contentHash(modified);
    expect(a).not.toBe(b);
  });
});

describe("signReview + verifyReview", () => {
  it("round-trips a signed review", async () => {
    const kp = generateKeyPair();
    const hash = contentHash(SAMPLE_REVIEW);
    const review: Review = { reviewId: hash, ...SAMPLE_REVIEW };
    const issuerDid = "did:web:alice.reviews";

    const jwt = await signReview(review, issuerDid, kp);
    expect(typeof jwt).toBe("string");
    expect(jwt.split(".")).toHaveLength(3);

    const verified = await verifyReview(jwt, kp.publicKey);
    expect(verified.issuer).toBe(issuerDid);
    expect(verified.review.reviewId).toBe(hash);
    expect(verified.review.reviewBody).toBe("My fav local cafe");
    expect(verified.review.itemReviewed.name).toBe("DopiCo Specialty Coffee");
  });

  it("rejects verification with wrong key", async () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const hash = contentHash(SAMPLE_REVIEW);
    const review: Review = { reviewId: hash, ...SAMPLE_REVIEW };

    const jwt = await signReview(review, "did:web:alice.reviews", kp1);
    await expect(verifyReview(jwt, kp2.publicKey)).rejects.toThrow();
  });
});

describe("generateDidDocument", () => {
  it("generates a valid did:web document", () => {
    const kp = generateKeyPair();
    const doc = generateDidDocument("alice.reviews", kp.publicKey) as Record<
      string,
      unknown
    >;

    expect(doc["@context"]).toBe("https://www.w3.org/ns/did/v1");
    expect(doc.id).toBe("did:web:alice.reviews");

    const vm = (doc.verificationMethod as Array<Record<string, unknown>>)[0];
    expect(vm.id).toBe("did:web:alice.reviews#key-1");
    expect(vm.type).toBe("Ed25519VerificationKey2020");
    expect(vm.controller).toBe("did:web:alice.reviews");
    expect(typeof vm.publicKeyMultibase).toBe("string");
  });
});
