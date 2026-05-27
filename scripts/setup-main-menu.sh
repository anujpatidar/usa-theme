#!/usr/bin/env bash
# Create / replace the Shopify "main-menu" navigation via Admin GraphQL API.
# Requires one-time: shopify store auth (see below)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STORE="${SHOPIFY_STORE:-frido-usa.myshopify.com}"
MENU_HANDLE="${MENU_HANDLE:-main-menu}"
MENU_TITLE="${MENU_TITLE:-Main menu}"

echo "Store: $STORE"
echo "Menu handle: $MENU_HANDLE"
echo ""

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required. Install with: brew install jq"
  exit 1
fi

echo "→ Fetching menu id..."
if ! GET_RESULT=$(shopify store execute \
  --store "$STORE" \
  --json \
  --query-file "$ROOT/scripts/graphql/get-menu.graphql" \
  --variables "$(jq -nc --arg q "handle:$MENU_HANDLE" '{query: $q}')" 2>/dev/null); then
  echo "Failed to query menu. If auth is missing, run once:"
  echo "  shopify store auth --store $STORE --scopes read_online_store_navigation,write_online_store_navigation"
  exit 1
fi

if echo "$GET_RESULT" | jq -e '.errors' >/dev/null 2>&1; then
  echo "GraphQL errors:"
  echo "$GET_RESULT" | jq '.errors'
  exit 1
fi

MENU_ID=$(echo "$GET_RESULT" | jq -r '.menus.edges[0].node.id // .data.menus.edges[0].node.id // empty')
if [[ -z "$MENU_ID" ]]; then
  echo "Menu '$MENU_HANDLE' not found. Create it in Admin → Navigation first, or change MENU_HANDLE."
  echo "$GET_RESULT" | jq .
  exit 1
fi

echo "Found menu: $MENU_ID"

ITEMS=$(cat "$ROOT/scripts/menu-items.json")
VARS=$(jq -nc \
  --arg id "$MENU_ID" \
  --arg title "$MENU_TITLE" \
  --argjson items "$ITEMS" \
  '{id: $id, title: $title, items: $items}')

echo "→ Updating menu structure (this replaces all top-level items)..."
if ! UPDATE_RESULT=$(shopify store execute \
  --store "$STORE" \
  --json \
  --allow-mutations \
  --query-file "$ROOT/scripts/graphql/update-menu.graphql" \
  --variables "$VARS" 2>/dev/null); then
  echo "Failed to update menu."
  exit 1
fi

ERRORS=$(echo "$UPDATE_RESULT" | jq -r '(.menuUpdate.userErrors // .data.menuUpdate.userErrors // []) | length')
if [[ "$ERRORS" != "0" ]]; then
  echo "Shopify returned errors:"
  echo "$UPDATE_RESULT" | jq '.menuUpdate.userErrors // .data.menuUpdate.userErrors'
  exit 1
fi

echo "✓ Menu updated successfully."
echo "$UPDATE_RESULT" | jq '.menuUpdate.menu // .data.menuUpdate.menu'
echo ""
echo "Next steps:"
echo "  1. Theme editor → Frido header → confirm Menu = $MENU_HANDLE"
echo "  2. Add blocks from scripts/theme-header-blocks.json (badges, featured image, product cards)"
echo "  3. Add Mobile nav tile blocks for category/activity images on phone"
echo "  4. Fix collection URLs in Admin → Navigation if handles differ"
echo ""
echo "Push theme:"
echo "  cd $ROOT && shopify theme push --environment second_store --unpublished"
