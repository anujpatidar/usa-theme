# Gender toggle — Option B (linked Men’s / Women’s products)

The PDP **MEN / WOMEN** control switches between two separate Shopify products. Each product page only holds one gender’s variants (colors + sizes). The theme reads **product metafields** so you configure pairs once per style, not in the theme editor.

## 1. Create metafield definitions (one time)

In **Shopify Admin → Settings → Custom data → Products → Add definition**:

| Name | Namespace and key | Type |
|------|-------------------|------|
| Men's product | `custom.mens_product` | Product (reference) |
| Women's product | `custom.womens_product` | Product (reference) |
| Gender (optional) | `custom.gender` | Single line text |

Optional fallbacks the theme also reads: `custom.men_product`, `custom.women_product`, or `custom.gender_pair` + `custom.gender`.

**Gender** values: `men` or `women` (helps highlight the correct tab if both references point correctly but IDs are ambiguous).

## 2. Link each product pair

For every style (e.g. Cloud Comfort):

1. Open the **Men’s** product → Metafields:
   - **Men's product** → select the men’s product itself (or leave blank; theme detects by ID)
   - **Women's product** → select the **Women’s** product
   - **Gender** → `men` (optional)
2. Open the **Women’s** product → Metafields:
   - **Men's product** → select the **Men’s** product
   - **Women's product** → select the women’s product itself
   - **Gender** → `women` (optional)

Both products must reference each other so the toggle always has a URL for MEN and WOMEN.

## 3. Product structure (per gender product)

- **Do not** use a Gender variant option on these products (Option B replaces that).
- Use **Color** and **Size** only (e.g. `W 6`, `W 7` on women’s; `M 8` on men’s).
- Use the **same color names** on both products when you want the toggle to preserve color after switching.

## 4. Optional: link via script

With Admin API access:

```bash
cd scripts
node link-gender-products.mjs --men cloud-comfort-men --women cloud-comfort-women
```

Requires metafield definitions from step 1. Uses the same auth as `upload-cloud-comfort-media.mjs`.

## 5. Verify on the storefront

1. Open a men’s PDP → **MEN** should be active; **WOMEN** navigates to the women’s product.
2. Pick a color + size, switch gender → land on the other product with the same color/size when those variants exist.
3. Sticky bar and gallery should match the women’s/men’s product you landed on.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Toggle not visible | Set both `custom.mens_product` and `custom.womens_product` on the current product. |
| Wrong tab active | Set `custom.gender` to `men` or `women`, or add tags `gender-men` / `gender-women`. |
| Color not preserved | Use identical color option values on both products. |
| Still see Gender variant UI | Remove the Gender option from the product; Option B uses separate products only. |
