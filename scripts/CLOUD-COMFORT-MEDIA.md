# Cloud Comfort product media

Product: **Frido Women's Cloud Comfort Shoes - Lace ups**  
Store: `frido-usa.myshopify.com`

## 1. Download (done locally)

```bash
bash scripts/download-cloud-comfort-media.sh
```

Files land in `scripts/product-media/cloud-comfort/{white,pink,lavender,black}/`  
(01.mp4 + 02–13.jpg per color). This folder is gitignored.

## 2. Upload to Shopify

Uses your existing **`shopify store auth`** token automatically (same as `scripts/setup-main-menu.sh`).

If you only authenticated for menus, add product scopes once:

```bash
shopify store auth --store frido-usa.myshopify.com --scopes read_products,write_products
```

Or set any Admin token you already have:

```bash
export SHOPIFY_ADMIN_TOKEN="shpat_..."   # or SHOP_ACCESS_TOKEN
```

Then run:

```bash
# optional preview:
DRY_RUN=1 node scripts/upload-cloud-comfort-media.mjs
# upload + attach to each color's variants:
node scripts/upload-cloud-comfort-media.mjs
```

The script will:

- Find the product by exact title  
- Upload each file per color (video first, then 12 images)  
- Link all media for that color to **every variant** of that color (White, Pink, Lavender, Black)

Color option values on the product must match exactly: `White`, `Pink`, `Lavender`, `Black`.

## 3. PDP gallery

After upload, the Frido product section switches gallery by color using variant-linked media (including video as the first slide).
