#!/usr/bin/env node
/**
 * Link men's and women's products for PDP gender toggle (Option B).
 *
 * Usage:
 *   node link-gender-products.mjs --men HANDLE --women HANDLE
 *   node link-gender-products.mjs --men HANDLE --women HANDLE --dry-run
 *
 * Auth: same as upload-cloud-comfort-media.mjs (SHOPIFY_ADMIN_TOKEN or shopify store auth).
 * Requires metafield definitions: custom.mens_product, custom.womens_product (product_reference),
 * optional custom.gender (single_line_text_field).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE = process.env.SHOPIFY_STORE || 'frido-usa.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';
const DRY_RUN = process.argv.includes('--dry-run');

function parseArgs() {
  const args = process.argv.slice(2);
  let men = null;
  let women = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--men' && args[i + 1]) men = args[++i];
    if (args[i] === '--women' && args[i + 1]) women = args[++i];
  }
  if (!men || !women) {
    console.error('Usage: node link-gender-products.mjs --men MEN_HANDLE --women WOMEN_HANDLE');
    process.exit(1);
  }
  return { men, women };
}

function tokenFromShopifyStoreAuth(store) {
  const configPath = path.join(
    os.homedir(),
    'Library/Preferences/shopify-cli-store-nodejs/config.json'
  );
  if (!fs.existsSync(configPath)) return null;
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    for (const entry of Object.values(config)) {
      const sessions = entry?.myshopify?.com?.sessionsByUserId;
      if (!sessions) continue;
      for (const session of Object.values(sessions)) {
        if (session.store === store && session.accessToken) return session.accessToken;
      }
    }
  } catch {
    return null;
  }
  return null;
}

const TOKEN =
  process.env.SHOPIFY_ADMIN_TOKEN ||
  process.env.SHOPIFY_ACCESS_TOKEN ||
  process.env.SHOP_ACCESS_TOKEN ||
  tokenFromShopifyStoreAuth(STORE);

if (!TOKEN) {
  console.error('No Admin API token. Export SHOPIFY_ADMIN_TOKEN or run shopify store auth.');
  process.exit(1);
}

const { men: menHandle, women: womenHandle } = parseArgs();

async function gql(query, variables) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

async function productByHandle(handle) {
  const data = await gql(
    `query ($handle: String!) {
      productByHandle(handle: $handle) { id title handle }
    }`,
    { handle }
  );
  const p = data.productByHandle;
  if (!p) throw new Error(`Product not found: ${handle}`);
  return p;
}

async function metafieldsSet(metafields) {
  if (DRY_RUN) {
    console.log('[dry-run] metafieldsSet', JSON.stringify(metafields, null, 2));
    return;
  }
  const data = await gql(
    `mutation ($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key namespace }
        userErrors { field message }
      }
    }`,
    { metafields }
  );
  const errs = data.metafieldsSet?.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join('; '));
}

async function main() {
  const men = await productByHandle(menHandle);
  const women = await productByHandle(womenHandle);

  console.log(`Linking:\n  Men:   ${men.title} (${men.handle})\n  Women: ${women.title} (${women.handle})`);

  const pairs = [
  {
      ownerId: men.id,
      namespace: 'custom',
      key: 'mens_product',
      type: 'product_reference',
      value: men.id,
    },
    {
      ownerId: men.id,
      namespace: 'custom',
      key: 'womens_product',
      type: 'product_reference',
      value: women.id,
    },
    {
      ownerId: men.id,
      namespace: 'custom',
      key: 'gender',
      type: 'single_line_text_field',
      value: 'men',
    },
    {
      ownerId: women.id,
      namespace: 'custom',
      key: 'mens_product',
      type: 'product_reference',
      value: men.id,
    },
    {
      ownerId: women.id,
      namespace: 'custom',
      key: 'womens_product',
      type: 'product_reference',
      value: women.id,
    },
    {
      ownerId: women.id,
      namespace: 'custom',
      key: 'gender',
      type: 'single_line_text_field',
      value: 'women',
    },
  ];

  await metafieldsSet(pairs);
  console.log(DRY_RUN ? 'Dry run complete.' : 'Metafields saved. Open each PDP to verify MEN / WOMEN toggle.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
