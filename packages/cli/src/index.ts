#!/usr/bin/env node

import { Command } from "commander";
import { keygen } from "./commands/keygen.js";
import { importReviews } from "./commands/import.js";
import { verify } from "./commands/verify.js";

const program = new Command();

program
  .name("4me2")
  .description("Import, sign, and verify your reviews")
  .version("0.1.0");

program
  .command("keygen")
  .description("Generate a new Ed25519 keypair")
  .option("-o, --output <path>", "Output file path", "author.key.json")
  .action(keygen);

program
  .command("import")
  .description("Import Google Takeout reviews and sign them")
  .argument("<takeout-json>", "Path to Reviews.json from Google Takeout")
  .requiredOption("-k, --key <path>", "Path to keypair file (from keygen)")
  .requiredOption("-d, --did <did>", "Your DID (e.g. did:web:alice.reviews)")
  .option("-o, --output <dir>", "Output directory", "reviews")
  .action(importReviews);

program
  .command("verify")
  .description("Verify signed review files")
  .argument("<dir>", "Directory containing signed review JWT files")
  .requiredOption("-k, --key <path>", "Path to keypair file (public key used for verification)")
  .action(verify);

program.parse();
