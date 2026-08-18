# 4me2 — user-owned reviews

You wrote your reviews. 4me2 lets you take them back: export them from Google Takeout, cryptographically sign them under an identity you control, and host them on your own domain. The end goal is that AI agents pay you directly, per request, when they use your words.

Website: [x4me2.com](https://x4me2.com) · Why this exists: [antimoloch.org/research](https://antimoloch.org/research/)

## Status

| Piece | State |
|---|---|
| Schema + validators (`@4me2/schema`) | Working |
| Crypto: Ed25519, JWT-VC, did:web (`@4me2/crypto`) | Working |
| Google Takeout parser (`@4me2/takeout-parser`) | Working |
| CLI: `keygen`, `import`, `verify` (`@4me2/cli`) | Working |
| Author node with x402 payment endpoints (`@4me2/author-node`) | Stub, in design |
| Discovery index (`@4me2/index`) | Stub, in design |

The signing pipeline is real today. The payment layer is the next milestone: each author node will serve reviews as x402 endpoints (HTTP 402, then USDC micropayment on Base, then content), with per-review pricing set by the author.

## Quickstart

Requires Node ≥ 20 and pnpm ≥ 9.

```bash
git clone https://github.com/tymrtn/4me2.git
cd 4me2
pnpm install
pnpm -r build
```

Run the pipeline against the included sample export:

```bash
node packages/cli/dist/index.js keygen -o author.key.json
node packages/cli/dist/index.js import fixtures/sample-takeout.json -k author.key.json -d did:web:example.reviews -o reviews
node packages/cli/dist/index.js verify reviews -k author.key.json
```

You should see `Verified 3 files: 3 valid, 0 invalid`. The fixture holds four entries: two reviews with text, one rating-only, and one that the parser deliberately skips because Takeout marked it incomplete. Each signed review is a small portable file carrying its own proof of authorship (in standards terms, a JWT verifiable credential), named by its content hash. `manifest.json` lists everything under your identity.

## Using your own reviews

1. Request your data at [takeout.google.com](https://takeout.google.com) — select Maps (your places). This is your right under GDPR and data-portability law.
2. Find `Takeout/Maps (your places)/Reviews.json` in the download.
3. Run `import` on that file with your own key and DID (for a domain you control, use `did:web:yourdomain.com`).

Signed reviews are plain files. Host them anywhere; they verify against your public key wherever they travel.

## How it works

- **Export.** Google Takeout gives you your reviews as GeoJSON. The parser normalizes them to [schema.org/Review](https://schema.org/Review) objects with stable `sha256` content hashes.
- **Sign.** Each review gets a stamp proving you wrote it, tied to an identity that lives at a domain you control. Anyone can check the stamp; nobody can forge it. (In standards terms: a JWT verifiable credential, Ed25519-signed, under your `did:web` identifier.)
- **Host.** Your domain, your server. Each author node is meant to be an independent endpoint no platform can revoke.
- **Get paid** (in design). Agents request a review, receive HTTP 402 with payment requirements, pay in USDC via [x402](https://www.x402.org/), and get the content. Pricing is per-review and author-set.

## Repository layout

```
packages/
  schema/          Zod schemas: Takeout input, canonical Review, manifest
  crypto/          Ed25519 keys, content hashing, JWT-VC sign/verify
  takeout-parser/  Google Takeout Reviews.json → canonical Review objects
  cli/             4me2 keygen | import | verify
  author-node/     x402-serving node (stub)
  index/           discovery index (stub)
fixtures/
  sample-takeout.json  synthetic Takeout export used by tests and the quickstart
```

`pnpm -r test` runs everything against the synthetic fixture; no personal data is required or included.

## Contributing

Issues and PRs are welcome, especially on the author-node design: payment flow, caching semantics, and what a discovery index owes to authors versus consumers. Apache 2.0, same license as x402, patent grant included.
