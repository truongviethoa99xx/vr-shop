# `showroom-3d`

Self-contained React Router route for `/showroom-3d`. Imports nothing from the
rest of the app; only `src/App.jsx` reaches in, via one route line.

```
index.js                      public surface — App.jsx imports only this
ShowroomPage.jsx              route entry: viewer + sidebar + order polling
constants.js                  env reading, VND formatting, SKU regex, cx()
api/showroomApi.js            axios client for /api/showroom (no auth header)
store/useShowroomCartStore.js Zustand store, server-authoritative
hooks/useShowroomSession.js   persistent anonymous session UUID
hooks/useMatterportSdk.js     SDK connect + tag-click → SKU
components/ShowroomViewer.jsx the iframe
components/ProductSidebar.jsx the slide-over
components/QrPanel.jsx        payment panel
```

## Tagging products in Matterport

Put `SKU:<code>` anywhere in a tag's **label** or **description**:

- `iPhone 15 Pro Max SKU:IP15PM-256` ✅
- `SKU: IP15PM-256` ✅ (spaces around the colon are fine)
- `iPhone 15 Pro Max` ❌ — the sidebar opens and says the tag has no SKU

Every SKU also needs a `showroom_product_map` row — see `INTEGRATION.md` §5.

## Design notes

- **The sidebar overlays, it never resizes the viewer.** It is capped at
  `max-w-sm` and draws no backdrop, so the room stays visible and interactive
  behind it and the visitor does not lose their place.
- **Prices are snapshotted server-side** when an item enters the cart. The store
  deliberately keeps no persisted copy of the cart and re-reads it after every
  mutation — the price the shopper agreed to lives in `showroom_cart_items`.
- **Stock Tailwind only.** The app's `tailwind.config.js` has an empty
  `theme.extend`, so there were no MTM tokens to match; the red/gray palette
  follows what `ProductCard.jsx` already uses.
- **Colour picker hides itself** when a SKU declares no colours, because the
  existing `products` table carries no colour data at all.
- `cx()` duplicates `src/utils/cn.js` on purpose — importing it would couple
  this folder to the app.

## SDK version tolerance

Matterport renamed the `Mattertag` namespace to `Tag` around SDK 3.1.70.
`useMatterportSdk.js` resolves whichever is present at runtime and subscribes to
**both** click paths — the `CLICK` event and the `openTags.selected` observable —
de-duplicated so a version that fires both does not open the sidebar twice.

This still wants one pass against the real model and SDK key: the exact call
names could not be checked against Matterport's docs from the build environment.
Connection failures surface as an on-screen badge rather than a silent no-op, so
a mismatch is visible immediately.

Requires Developer Tools / SDK Key on the Matterport plan. Without it the
showcase still renders but no tag clicks arrive.
