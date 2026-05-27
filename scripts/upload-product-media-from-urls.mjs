#!/usr/bin/env node
/**
 * Attach PDP gallery media to a product from CDN URLs (manifest JSON).
 *
 * Usage:
 *   node upload-product-media-from-urls.mjs scripts/active-casual-sneakers-mens-media.json
 *   DRY_RUN=1 node upload-product-media-from-urls.mjs scripts/active-casual-sneakers-mens-media.json
 *
 * Auth: SHOPIFY_ADMIN_TOKEN or shopify store auth (read_products, write_products).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const { mkdtempSync, rmSync } = fs;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: node upload-product-media-from-urls.mjs <manifest.json>');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8'));
const STORE = process.env.SHOPIFY_STORE || manifest.store || 'frido-usa.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';
const DRY_RUN = process.env.DRY_RUN === '1';
const SKIP_VIDEOS = process.env.SKIP_VIDEOS === '1';

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
        if (session.store === store && session.accessToken) {
          return { token: session.accessToken, source: 'shopify store auth' };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

const envToken =
  process.env.SHOPIFY_ADMIN_TOKEN ||
  process.env.SHOPIFY_ACCESS_TOKEN ||
  process.env.SHOP_ACCESS_TOKEN;
const storeAuth = tokenFromShopifyStoreAuth(STORE);
const TOKEN = envToken || storeAuth?.token;
const authSource = envToken ? 'environment' : storeAuth?.source;

if (!TOKEN) {
  console.error('No Admin API token. Export SHOPIFY_ADMIN_TOKEN or run shopify store auth.');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    const errs = Array.isArray(json.errors)
      ? json.errors.map((e) => (typeof e === 'string' ? e : e.message)).join('; ')
      : String(json.errors);
    throw new Error(errs);
  }
  const data = json.data || {};
  for (const block of Object.values(data)) {
    if (!block || typeof block !== 'object') continue;
    const errs =
      block.userErrors ||
      block.mediaUserErrors ||
      block.stagedUploadsCreateUserErrors;
    if (errs?.length) {
      throw new Error(errs.map((e) => e.message).join('; '));
    }
  }
  return data;
}

function mimeFor(filePath) {
  if (/\.mp4$/i.test(filePath)) return 'video/mp4';
  if (/\.png$/i.test(filePath)) return 'image/png';
  if (/\.webp$/i.test(filePath)) return 'image/webp';
  return 'image/jpeg';
}

function stagedResource(filePath) {
  const stat = fs.statSync(filePath);
  const mime = mimeFor(filePath);
  const filename = path.basename(filePath);
  const base = {
    mimeType: mime,
    filename,
    fileSize: String(stat.size),
    httpMethod: 'POST',
  };
  if (mime.startsWith('video/')) {
    return { ...base, resource: 'VIDEO' };
  }
  return { ...base, resource: 'IMAGE' };
}

async function stagedUpload(filePath) {
  const input = stagedResource(filePath);
  const data = await gql(
    `mutation ($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    { input: [input] }
  );
  const target = data.stagedUploadsCreate.stagedTargets[0];
  const body = fs.readFileSync(filePath);
  const contentType =
    target.parameters.find((p) => p.name === 'Content-Type')?.value || input.mimeType;
  const form = new FormData();
  for (const p of target.parameters) {
    form.append(p.name, p.value);
  }
  form.append('file', new Blob([body], { type: contentType }));

  const up = await fetch(target.url, { method: 'POST', body: form });
  if (!up.ok) {
    const detail = (await up.text()).replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`Staged upload failed ${up.status}: ${detail}`);
  }
  return target.resourceUrl;
}

const videoFileCache = new Map();

async function localVideoFile(url, name) {
  if (videoFileCache.has(url)) return videoFileCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Video download failed ${res.status}: ${url}`);
  const dir = mkdtempSync(path.join(os.tmpdir(), 'frido-video-'));
  const filePath = path.join(dir, name.replace(/[^\w.-]+/g, '_') || 'hero.mp4');
  fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));
  videoFileCache.set(url, filePath);
  return filePath;
}

async function findProductByHandle(handle) {
  const data = await gql(
    `query ($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        options { name values }
        media(first: 250) {
          edges { node { id alt } }
        }
        variants(first: 100) {
          edges {
            node {
              id
              selectedOptions { name value }
              media(first: 1) { edges { node { id } } }
            }
          }
        }
      }
    }`,
    { handle }
  );
  return data.productByHandle;
}

function colorKey(product) {
  const opt = product.options.find((o) => /colou?r/i.test(o.name));
  return opt ? opt.name : 'Color';
}

function variantsForColor(product, colorValue) {
  const ck = colorKey(product);
  return product.variants.edges
    .map((e) => e.node)
    .filter((v) => {
      const so = v.selectedOptions.find((o) => o.name === ck);
      return so && so.value === colorValue;
    });
}

function variantsWithoutMedia(variants) {
  return variants.filter((v) => !(v.media?.edges?.length));
}

async function createProductMedia(productId, originalSource, alt, type) {
  const mediaContentType = type === 'video' ? 'VIDEO' : 'IMAGE';
  const data = await gql(
    `mutation ($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { id }
        mediaUserErrors { field message }
      }
    }`,
    {
      productId,
      media: [{ originalSource, alt, mediaContentType }],
    }
  );
  return data.productCreateMedia.media[0];
}

/** Images: CDN URL works. Videos: Shopify rejects /videos/c/o/v/ URLs — download + staged upload. */
async function attachMedia(productId, item, alt) {
  if (item.type === 'video') {
    const filePath = await localVideoFile(item.url, item.name || 'hero.mp4');
    const resourceUrl = await stagedUpload(filePath);
    return createProductMedia(productId, resourceUrl, alt, 'video');
  }
  return createProductMedia(productId, item.url, alt, 'image');
}

async function linkMediaToVariants(productId, variants, mediaId) {
  if (!variants.length || !mediaId) return;
  await gql(
    `mutation ($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
      productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
        userErrors { field message }
      }
    }`,
    {
      productId,
      variantMedia: variants.map((v) => ({ variantId: v.id, mediaIds: [mediaId] })),
    }
  );
}

async function main() {
  const handle = manifest.productHandle;
  if (!handle) throw new Error('manifest.productHandle required');

  console.log(`Store: ${STORE}`);
  console.log(`Auth: ${authSource}`);
  if (DRY_RUN) console.log('DRY_RUN=1\n');
  if (SKIP_VIDEOS) console.log('SKIP_VIDEOS=1 — hero.mp4 entries will be skipped\n');

  const product = await findProductByHandle(handle);
  if (!product) throw new Error(`Product not found: ${handle}`);
  console.log(`Product: ${product.title} (${product.id})\n`);

  const existingAlts = new Set(
    (product.media?.edges || []).map((e) => e.node.alt).filter(Boolean)
  );

  for (const [color, items] of Object.entries(manifest.colors)) {
    const variants = variantsForColor(product, color);
    if (!variants.length) {
      console.warn(`No variants for color "${color}" — check option values match exactly.`);
      continue;
    }

    console.log(`\n=== ${color} (${items.length} files, ${variants.length} variants) ===`);
    let firstImageMediaId = null;

    for (const item of items) {
      const name = item.name || item.url.split('/').pop().split('?')[0];
      const alt = `${product.title} — ${color} — ${name}`;
      console.log(`  ${name}`);

      if (DRY_RUN) continue;

      if (item.type === 'video' && SKIP_VIDEOS) {
        console.log('    skip video (SKIP_VIDEOS)');
        continue;
      }

      if (existingAlts.has(alt)) {
        console.log('    skip (alt exists)');
        if (!firstImageMediaId && item.type === 'image') {
          const edge = (product.media?.edges || []).find((e) => e.node.alt === alt);
          if (edge) firstImageMediaId = edge.node.id;
        }
        continue;
      }

      try {
        const media = await attachMedia(product.id, item, alt);
        existingAlts.add(alt);
        if (item.type === 'image' && !firstImageMediaId) {
          firstImageMediaId = media.id;
        }
        if (item.type === 'video') {
          console.log('    video attached (staged upload)');
        }
      } catch (err) {
        console.error(`    FAILED: ${err.message}`);
        if (item.type === 'video') {
          console.error('    Tip: re-run with SKIP_VIDEOS=1 to upload images only.');
        }
      }
      await new Promise((r) => setTimeout(r, 450));
    }

    if (!DRY_RUN && firstImageMediaId) {
      const toLink = variantsWithoutMedia(variants);
      if (toLink.length) {
        await linkMediaToVariants(product.id, toLink, firstImageMediaId);
        console.log(`  linked featured image → ${toLink.length} variant(s)`);
      }
    }
  }

  for (const filePath of videoFileCache.values()) {
    try {
      rmSync(path.dirname(filePath), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
