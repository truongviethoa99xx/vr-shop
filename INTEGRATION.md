# Showroom 3D — drop-in module

Feature: a Matterport-powered 3D showroom where a visitor taps a product tag in
the space, a sidebar slides in with that product, and they can buy it without
leaving the room.

This repository holds **only the new module**, laid out at the exact paths it
occupies in the two target repos:

| Path here | Copy into |
| --- | --- |
| `ecommerce-be/src/showroom/**` | [`truongviethoa99xx/Ecommerce-BE`](https://github.com/truongviethoa99xx/Ecommerce-BE) → `src/showroom/` |
| `ecommerce-ui/src/showroom-3d/**` | [`truongviethoa99xx/Ecommerce-UI`](https://github.com/truongviethoa99xx/Ecommerce-UI) → `src/showroom-3d/` |

**Fastest path: Docker.** `AGENTS.md` is a step-by-step runbook that brings up
Postgres, the API and the web app with two commands, and it applies the two
integration patches for you. The manual path below is for integrating into an
existing checkout instead.

`vr-shop` was empty (one commit, one empty `READ.ME`), and this session had
read-only access to both target repos, so the module is delivered here rather
than committed into them.

---

## 1. Survey findings — where the spec and the codebase disagree

The spec was written against assumptions that mostly do not hold. Everything
below was verified by reading the code, not inferred.

| Spec assumed | Actually in the repo | Consequence |
| --- | --- | --- |
| Frontend is **Next.js**, route in `app/showroom-3d/` | **Vite + React Router v6**, plain `.jsx`, routes in `src/App.jsx` | Module is a React Router route in `src/showroom-3d/` |
| `NEXT_PUBLIC_*` env vars | Vite only exposes `VITE_*` | Renamed — see §4 |
| `ProductsService` looks up by **SKU** | `findOne(id: number)`; `products` has **no `sku` column** | Added `showroom_product_map` |
| Product carries **colour** data | No colour field anywhere (`grep -i 'sku\|colou\?r' src/` → 0 hits) | Colours declared per SKU in the map table |
| `PaymentService` has a **create-QR** method | `PaymentsService` is plain CRUD over `payments` | Payment port + stub (§6) |
| An existing **Momo/VNPay/ZaloPay webhook/IPN handler** to add a branch to | None exists — 0 hits for `momo`, `vnpay`, `zalopay`, `webhook`, `ipn`, `qr` | Nothing to branch into; `markPaid()` exposed instead |
| Tailwind carries MTM **design tokens** | `theme.extend` is `{}` | Styled with stock Tailwind + the palette `ProductCard.jsx` already uses |
| Migrations | No migration setup at all; root uses `synchronize: true` | Module ships its own migration + DataSource |
| ORM choice open | **TypeORM 0.3 + Postgres** (`pg`) | TypeORM, not Prisma |

Two further notes:

- `PaymentsService.create()` requires an authenticated `userId` **and** a row in
  `orders`. A showroom visitor is anonymous and has neither, so that service
  could not have been reused for showroom orders even as bookkeeping.
- `products.discount` is a **percentage**, not an amount — `ProductCard.jsx`
  renders `price - (price * discount) / 100`. `ShowroomCatalogService` uses the
  identical formula so the snapshotted price matches what the shopper saw.

---

## 2. Backend integration — the only change to an existing file

`src/app.module.ts`, two inserted lines (one `import`, one array entry — the
irreducible minimum for a Nest module; the spec's "exactly 1 line" is not
achievable for any module):

```diff
 import { ContactsModule } from './contacts/contacts.module';
+import { ShowroomModule } from './showroom/showroom.module';
 import * as entities from './entities';
@@
     ContactsModule,
+    ShowroomModule,
   ],
```

**Nothing else in the backend is touched** — not the root `TypeOrmModule`
config, not `src/entities/index.ts`, not any existing entity, service or
controller.

That is possible because `ShowroomModule` registers its **own named TypeORM
DataSource** (`'showroom'`) against the same database using the same `DB_*` env
vars. So:

- the root connection's `entities: Object.values(entities)` stays as-is, and
  `autoLoadEntities` is still not needed;
- the root connection keeps `synchronize: true` in dev but never sees the
  showroom entities, so it will never create, alter or drop the showroom tables;
- the showroom connection runs `synchronize: false` — its three tables come
  only from the migration.

The cost is one extra connection pool, capped via `SHOWROOM_DB_POOL_MAX`
(default 5). If you would rather share the root pool, add
`autoLoadEntities: true` to the root `TypeOrmModule.forRootAsync` factory and
drop the `TypeOrmModule.forRootAsync` block from `showroom.module.ts` — that
trades one extra line in `app.module.ts` for the saved pool.

### Migration

Three new tables, no `ALTER` on anything existing:

```bash
# one-off, via the module's own DataSource
npx typeorm-ts-node-commonjs migration:run -d src/showroom/data-source.ts

# or let the module run it on boot
SHOWROOM_RUN_MIGRATIONS=true npm run start:dev
```

Requires PostgreSQL 13+ for `gen_random_uuid()`. On 12 or older, run
`CREATE EXTENSION IF NOT EXISTS pgcrypto;` first.

Order ids are UUIDs deliberately: `GET /orders/:orderId/status` is
unauthenticated, and sequential integers would let anyone enumerate other
people's orders.

---

## 3. Frontend integration — the only change to an existing file

`src/App.jsx`, two inserted lines:

```diff
+// Showroom 3D (self-contained module)
+import ShowroomPage from "./showroom-3d";
+
 // 404 Page
 import NotFound from "./pages/NotFound";
@@
           </Route>
 
+          {/* Showroom 3D - standalone, outside MainLayout */}
+          <Route path="showroom-3d" element={<ShowroomPage />} />
+
           {/* Auth Routes (without main layout) */}
```

The route sits **outside** `MainLayout` (like `login`/`register`) so the 3D
space gets the full viewport with no site header or footer, and it is declared
before the `*` catch-all.

`src/showroom-3d/` imports nothing from the rest of the app — not the shared
`src/services/api.js` client (it must not attach the logged-in user's bearer
token to anonymous showroom calls, nor inherit that client's 401 handling), not
`src/store/cart.js`, and not `src/utils/cn.js` (a local `cx()` is used instead).
No file outside the folder imports into it except the one route line above.

---

## 4. Environment variables

Vite exposes only `VITE_`-prefixed vars to the browser, so the names in the spec
were remapped:

| Spec name | Actual name |
| --- | --- |
| `NEXT_PUBLIC_MATTERPORT_MODEL_SID` | `VITE_MATTERPORT_MODEL_SID` |
| `NEXT_PUBLIC_MATTERPORT_SDK_KEY` | `VITE_MATTERPORT_SDK_KEY` |
| `NEXT_PUBLIC_SHOWROOM_API_BASE` | `VITE_SHOWROOM_API_BASE` |

See `ecommerce-ui/.env.showroom.example` and
`ecommerce-be/.env.showroom.example`. No real values are committed.

Note the SDK key ships to the browser — that is how the Showcase SDK works, so
scope it to your domains in the Matterport dashboard.

---

## 5. Mapping SKUs to products

`products` has no `sku` column, so the showroom keeps its own mapping. Tag a
product in the Matterport dashboard with `SKU:<code>` anywhere in the tag label
or description (e.g. `iPhone 15 Pro Max SKU:IP15PM-256`), then insert a row:

```sql
INSERT INTO showroom_product_map (sku, product_id, colors) VALUES
  ('IP15PM-256', 42, '["Titan tự nhiên","Titan xanh"]'::jsonb);
```

An unmapped SKU returns 404 and the sidebar says so explicitly rather than
failing silently. A SKU with an empty `colors` array simply hides the colour
picker. See `ecommerce-be/src/showroom/seed-product-map.example.sql`.

---

## 6. Payment is deliberately unfinished

Per your instruction that the VR shop matters and payment can wait, the module
ships the **seam** but not a gateway:

- `ShowroomPaymentProvider` — the interface a real gateway implements.
- `StubPaymentProvider` — bound by default. Emits a non-binding placeholder
  payload, contacts nothing, signs nothing, and logs a warning each call.
- `ShowroomOrderService.markPaid(orderId, txnId)` — the single settlement entry
  point. Idempotent on replay, and refuses to resurrect a `failed`/`cancelled`
  order.

To go live: implement the interface, swap the `SHOWROOM_PAYMENT_PROVIDER`
binding in `showroom.module.ts`, and call `markPaid()` from the callback once
the gateway signature is verified. `ShowroomModule` exports
`ShowroomOrderService` for exactly that.

**A showroom order never becomes `paid` on its own.** Until a gateway is wired
in, drive it manually to exercise the flow:

```sql
UPDATE showroom_orders SET status = 'paid' WHERE id = '<order-uuid>';
```

The sidebar is polling, so it will pick that up and close itself.

When you do add a callback: the global `ValidationPipe` in `main.ts` uses
`forbidNonWhitelisted: true`, which would **reject** a gateway callback full of
`vnp_*`/Momo fields. Type the handler parameter as `Record<string, string>` (no
DTO class) so the pipe skips it, then validate the signature yourself.

---

## 7. API surface

All under `/api/showroom`, all anonymous, scoped by a client-generated session
UUID. (Swagger is mounted at the exact path `/api` and registers only exact
asset paths, so it does not shadow these.)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/products/:sku` | Thin read over `ProductsService.findOne` |
| `GET` | `/cart?sessionId=` | Cart for a session |
| `POST` | `/cart` | `{sessionId, sku, color?, quantity}`; snapshots price |
| `DELETE` | `/cart/:itemId?sessionId=` | `sessionId` required so one session cannot delete another's row |
| `POST` | `/orders` | `{sessionId, paymentMethod}` → `{order, qrCode, ...}` |
| `GET` | `/orders/:orderId/status` | Poll target |

---

## 8. Verified, and not verified

Verified in this session:

- Every backend file typechecks (`tsc`, repo's own compiler options).
- `src/showroom` compiles **against the real `Ecommerce-BE` sources** — the
  imports into `products/*` resolve and the fields read off `Product`
  (`price`, `discount`, `images`, `stock`, `category.name`) all typecheck.
- The patched `app.module.ts` and the patched `App.jsx` both compile/parse.
- Backend files pass `prettier --check` under the repo's `.prettierrc`.
- Every frontend file parses as JSX.

**Not** verified, and why:

- **Nothing was run.** npm tarballs are blocked by this environment's egress
  policy (`403` from `registry.npmjs.org`), so dependencies could not be
  installed — no `nest build`, no `vite build`, no server, no database, no
  browser. The checks above are static.
- **The Matterport SDK call names.** `matterport.github.io` and `github.com` are
  both blocked here, so the live SDK reference could not be read. Rather than
  commit to one spelling, `useMatterportSdk.js` resolves the namespace at
  runtime (`sdk.Tag`, falling back to `sdk.Mattertag` — renamed around SDK
  3.1.70) and wires up **both** click paths, the `CLICK` event and the
  `openTags.selected` observable, de-duplicated so a version firing both does
  not open the sidebar twice. This still needs one pass against the real model
  and SDK key; the status badge surfaces a connection failure on screen.
