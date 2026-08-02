#!/usr/bin/env node
/**
 * Encrypts the plaintext travel document vault into a blob that is safe to
 * commit to this public repository.
 *
 *   VAULT_PASSPHRASE='…' npm run encrypt-vault
 *
 * Reads  secrets/vault.plain.json   (gitignored)
 * Writes src/data/vault.encrypted.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptJson } from '../src/lib/vaultCrypto.js';
import { toDisneyQrPayload } from '../src/lib/qrPayload.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLAIN_PATH = resolve(ROOT, 'secrets/vault.plain.json');
const OUT_PATH = resolve(ROOT, 'src/data/vault.encrypted.json');

/**
 * Turns an authored entry into the uniform shape the UI renders. Disney
 * entries carry a printed ticket number and get their QR payload derived;
 * everything else supplies the payload verbatim.
 */
function normaliseItem(item, groupId) {
  const { ticketNumber, ...rest } = item;

  if (ticketNumber) {
    return { ...rest, sub: rest.sub ?? ticketNumber, payload: toDisneyQrPayload(ticketNumber) };
  }

  if (!rest.payload) {
    throw new Error(`Item "${rest.label}" in group "${groupId}" has neither ticketNumber nor payload`);
  }

  return rest;
}

function normaliseVault(plain) {
  if (!plain?.days || typeof plain.days !== 'object') {
    throw new Error('Vault source must have a "days" object keyed by day id');
  }

  const days = Object.fromEntries(
    Object.entries(plain.days).map(([dayId, groups]) => [
      dayId,
      groups.map((group) => ({
        ...group,
        items: group.items.map((item) => normaliseItem(item, group.id)),
      })),
    ])
  );

  return { days };
}

async function main() {
  const passphrase = process.env.VAULT_PASSPHRASE;
  if (!passphrase) {
    throw new Error('VAULT_PASSPHRASE is required, e.g. VAULT_PASSPHRASE=… npm run encrypt-vault');
  }

  const plain = JSON.parse(await readFile(PLAIN_PATH, 'utf8'));
  const vault = normaliseVault(plain);
  const envelope = await encryptJson(vault, passphrase);

  // Which days carry documents is not secret, and the UI needs it while locked
  // to know where to show the unlock prompt.
  const published = { ...envelope, dayIds: Object.keys(vault.days).map(Number) };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(published, null, 2)}\n`);

  const count = Object.values(vault.days)
    .flat()
    .reduce((total, group) => total + group.items.length, 0);
  console.log(`Encrypted ${count} QR codes across ${Object.keys(vault.days).length} days → ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(`encrypt-vault failed: ${error.message}`);
  process.exitCode = 1;
});
