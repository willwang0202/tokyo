#!/usr/bin/env node
/**
 * Prints the buy-list write token derived from the vault passphrase, plus the
 * SQL that seeds it into Supabase.
 *
 *   VAULT_PASSPHRASE='…' npm run buy-list-token
 *
 * The token is what browsers send in the `x-buy-list-token` header; the row it
 * is compared against is readable by no API role. Re-run this after changing
 * the passphrase — old tokens stop working the moment the row is replaced.
 */

import { deriveWriteToken } from '../src/lib/buyListToken.js';

async function main() {
  const passphrase = process.env.VAULT_PASSPHRASE;
  if (!passphrase) {
    throw new Error('VAULT_PASSPHRASE is required, e.g. VAULT_PASSPHRASE=… npm run buy-list-token');
  }

  const token = await deriveWriteToken(passphrase);

  console.log('Run this in the Supabase SQL editor:\n');
  console.log(`insert into private.buy_list_secret (id, token) values (true, '${token}')`);
  console.log('  on conflict (id) do update set token = excluded.token;');
}

main().catch((error) => {
  console.error(`buy-list-token failed: ${error.message}`);
  process.exitCode = 1;
});
