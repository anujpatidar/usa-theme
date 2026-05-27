#!/usr/bin/env node
/**
 * Upload Cloud Comfort color media to Shopify product + link to variants.
 *
 * Auth (first match):
 *   SHOPIFY_ADMIN_TOKEN / SHOPIFY_ACCESS_TOKEN / SHOP_ACCESS_TOKEN
 *   or token from `shopify store auth` (~/Library/Preferences/shopify-cli-store-nodejs/config.json)
 *
 * If products API is denied, re-auth once:
 *   shopify store auth --store frido-usa.myshopify.com --scopes read_products,write_products
 *
 * Optional: SHOPIFY_STORE=frido-usa.myshopify.com (default)
 *           DRY_RUN=1 to preview only
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, 'cloud-comfort-media.json');
const MEDIA_DIR = path.join(__dirname, 'product-media/cloud-comfort');

const STORE = process.env.SHOPIFY_STORE || 'frido-usa.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';
const DRY_RUN = process.env.DRY_RUN === '1';

function tokenFromShopifyStoreAuth(store) {
  const configPath = path.join(
    os.homedir(),
    'Library/Preferences/shopify-cli-store-nodejs/config.json'
  );
  if (!fs.existsSync(configPath)) return null;

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }

  for (const entry of Object.values(config)) {
    const sessions = entry?.myshopify?.com?.sessionsByUserId;
    if (!sessions) continue;
    for (const session of Object.values(sessions)) {
      if (session.store === store && session.accessToken) {
        return { token: session.accessToken, scopes: session.scopes || [] };
      }
    }
  }
  return null;
}

function resolveAuth() {
  const envToken =
    process.env.SHOPIFY_ADMIN_TOKEN ||
    process.env.SHOPIFY_ACCESS_TOKEN ||
    process.env.SHOP_ACCESS_TOKEN;
  if (envToken) return { token: envToken, source: 'environment', scopes: [] };

  const storeAuth = tokenFromShopifyStoreAuth(STORE);
  if (storeAuth) {
    return { token: storeAuth.token, source: 'shopify store auth', scopes: storeAuth.scopes };
  }

  return null;
}

const auth = resolveAuth();
if (!auth) {
  console.error(
    'No Shopify Admin token found.\n' +
      'Either export SHOPIFY_ADMIN_TOKEN (or SHOP_ACCESS_TOKEN), or run:\n' +
      `  shopify store auth --store ${STORE} --scopes read_products,write_products`
  );
  process.exit(1);
}

const TOKEN = auth.token;
const needsProductScopes =
  auth.scopes.length > 0 &&
  !auth.scopes.some((s) => s === 'write_products' || s.includes('write_products'));
if (needsProductScopes) {
  console.warn(
    `Token from ${auth.source} has scopes: ${auth.scopes.join(', ')}\n` +
      'Product upload needs read_products,write_products. Re-run:\n' +
      `  shopify store auth --store ${STORE} --scopes read_products,write_products\n`
  );
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

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
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  const data = Object.values(json.data || {})[0];
  if (data?.userErrors?.length) {
    throw new Error(data.userErrors.map((e) => e.message).join('; '));
  }
  if (data?.mediaUserErrors?.length) {
    throw new Error(data.mediaUserErrors.map((e) => e.message).join('; '));
  }
  if (data?.stagedUploadsCreateUserErrors?.length) {
    throw new Error(data.stagedUploadsCreateUserErrors.map((e) => e.message).join('; '));
  }
  return json.data;
}

async function findProduct(title) {
  const q = `
    query($query: String!) {
      products(first: 5, query: $query) {
        edges {
          node {
            id
            title
            options { name values }
            media(first: 250) {
              edges {
                node {
                  id
                  alt
                }
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  selectedOptions { name value }
                  media(first: 1) {
                    edges {
                      node {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const data = await gql(q, { query: `title:${JSON.stringify(title).slice(1, -1)}` });
  const products = data.products.edges.map((e) => e.node);
  const exact = products.find((p) => p.title === title);
  return exact || products[0] || null;
}

function colorKey(product) {
  const opt = product.options.find((o) => /colou?r/i.test(o.name));
  return opt ? opt.name : 'Color';
}

function mediaIdForAlt(product, alt) {
  const edge = (product.media?.edges || []).find((e) => e.node.alt === alt);
  return edge?.node?.id ?? null;
}

function firstImageBasename(files) {
  const image = files.find((f) => !/\.mp4$/i.test(f));
  return image ? path.basename(image) : null;
}

function isImageFile(filePath) {
  return !/\.mp4$/i.test(filePath);
}

function variantsWithoutMedia(variants) {
  return variants.filter((v) => !(v.media?.edges?.length));
}

function variantsForColor(product, colorName, colorValue) {
  const ck = colorKey(product);
  return product.variants.edges
    .map((e) => e.node)
    .filter((v) => {
      const so = v.selectedOptions.find((o) => o.name === ck);
      return so && so.value === colorValue;
    });
}

function mimeFor(filePath) {
  if (filePath.endsWith('.mp4')) return 'video/mp4';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.webp')) return 'image/webp';
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
    `mutation($input: [StagedUploadInput!]!) {
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
  // GCS signed POST rejects Content-Disposition from a filename arg (403). Blob only.
  form.append('file', new Blob([body], { type: contentType }));

  const up = await fetch(target.url, { method: 'POST', body: form });
  if (!up.ok) {
    const detail = (await up.text()).replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`Staged upload failed ${up.status} for ${filePath}: ${detail}`);
  }
  return target.resourceUrl;
}

async function createProductMedia(productId, resourceUrl, alt, mime) {
  const mediaContentType = mime.startsWith('video/') ? 'VIDEO' : 'IMAGE';
  const data = await gql(
    `mutation($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
          id
          ... on MediaImage { image { url } }
          ... on Video { sources { url } }
        }
        mediaUserErrors { field message }
      }
    }`,
    {
      productId,
      media: [
        {
          originalSource: resourceUrl,
          alt,
          mediaContentType,
        },
      ],
    }
  );
  return data.productCreateMedia.media[0];
}

/** One mediaId per variant (API limit). Links the same media to every variant in the color group. */
async function linkMediaToColorVariants(productId, variants, mediaId) {
  if (!variants.length || !mediaId) return;
  await gql(
    `mutation($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
      productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
        product { id }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variantMedia: variants.map((variant) => ({
        variantId: variant.id,
        mediaIds: [mediaId],
      })),
    }
  );
}

function localFiles(color) {
  const dir = path.join(MEDIA_DIR, color.toLowerCase());
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp|mp4)$/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

async function main() {
  console.log(`Store: ${STORE}`);
  console.log(`Auth: ${auth.source}`);
  if (DRY_RUN) console.log('DRY_RUN=1 — no uploads\n');

  const product = await findProduct(manifest.productTitle);
  if (!product) {
    throw new Error(`Product not found: "${manifest.productTitle}"`);
  }
  console.log(`Product: ${product.title} (${product.id})\n`);

  const ck = colorKey(product);
  const existingAlts = new Set(
    (product.media?.edges || []).map((e) => e.node.alt).filter(Boolean)
  );

  for (const color of Object.keys(manifest.colors)) {
    const files = localFiles(color);
    if (!files.length) {
      console.warn(`No local files for ${color} — run: bash scripts/download-cloud-comfort-media.sh`);
      continue;
    }

    const variants = variantsForColor(product, ck, color);
    if (!variants.length) {
      console.warn(`No variants for color "${color}" — check option values match exactly.`);
      continue;
    }

    console.log(`\n=== ${color} (${files.length} files, ${variants.length} variants) ===`);
    const imageMediaIds = [];

    for (const filePath of files) {
      const alt = `${product.title} — ${color} — ${path.basename(filePath)}`;
      console.log(`  ${path.basename(filePath)}`);

      if (DRY_RUN) continue;

      if (existingAlts.has(alt)) {
        console.log(`    skip (already on product)`);
        continue;
      }

      const resourceUrl = await stagedUpload(filePath);
      const mime = mimeFor(filePath);
      const media = await createProductMedia(product.id, resourceUrl, alt, mime);
      if (isImageFile(filePath)) {
        imageMediaIds.push(media.id);
      }
      existingAlts.add(alt);
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!DRY_RUN) {
      // Variants accept images only; video stays on product, gallery uses alt tags in PDP JS.
      const imageBasename = firstImageBasename(files);
      const featuredAlt = imageBasename
        ? `${product.title} — ${color} — ${imageBasename}`
        : null;
      const featuredMediaId =
        imageMediaIds[0] || (featuredAlt ? mediaIdForAlt(product, featuredAlt) : null);
      const variantsToLink = variantsWithoutMedia(variants);
      if (!featuredMediaId) {
        console.log(`  skip variant link (no image for ${color})`);
      } else if (!variantsToLink.length) {
        console.log(`  skip variant link (${color} variants already have media)`);
      } else {
        await linkMediaToColorVariants(product.id, variantsToLink, featuredMediaId);
        console.log(`  linked featured image → ${variantsToLink.length} ${color} variant(s)`);
      }
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
