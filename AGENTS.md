# AGENTS.md — runbook for running Showroom 3D

Instructions for an AI agent (or anyone) bringing this stack up. Execute the
steps in order. Every step states how to verify it before moving on. If a
verification fails, stop and read **Troubleshooting** — do not continue.

## What this repository is

A **drop-in module**, not a runnable app. It holds a Matterport-powered 3D
showroom feature that belongs to two other repositories:

| Here | Belongs to |
| --- | --- |
| `ecommerce-be/src/showroom/` | `truongviethoa99xx/Ecommerce-BE` (NestJS 9 + TypeORM + Postgres) |
| `ecommerce-ui/src/showroom-3d/` | `truongviethoa99xx/Ecommerce-UI` (Vite + React + React Router) |

`scripts/setup-workspace.sh` clones both into `./workspace/`, copies the module
in, and applies the two integration patches. Docker then builds from those
checkouts. **Never edit anything under `workspace/`** — it is disposable and
regenerated; edit the sources here instead and re-run the script.

## Rules

1. Do not modify files in `workspace/`. Edit `ecommerce-be/src/showroom/` or
   `ecommerce-ui/src/showroom-3d/` here, then re-run `setup-workspace.sh`.
2. The two integration patches total **4 lines** across 2 files (2 in
   `app.module.ts`, 2 in `App.jsx`). If a diff against the upstream repos shows
   more, something is wrong — investigate rather than proceeding.
3. `VITE_*` variables are **build-time**. Changing one requires
   `docker compose build web`; a restart does nothing.
4. Never commit `.env` or `workspace/` (both are gitignored).

## Prerequisites

- Docker with the Compose plugin, and a **running daemon** (`docker ps` must
  succeed — not just `docker --version`)
- `git`, `python3`, `bash`
- Ports 3000, 8080, 5433 free (all overridable, see step 2)

## Step 1 — Prepare the workspace

```bash
./scripts/setup-workspace.sh
```

**Verify:** last line reads `Workspace ready.` and the run printed
`ok all checks passed`. The script is idempotent; re-running is safe and prints
`already has:` for patches that are in place.

## Step 2 — Configure

```bash
cp .env.docker.example .env
```

Edit `.env` and set `JWT_SECRET` to any non-empty random string. Compose refuses
to start without it.

Leave the Matterport variables empty for now — step 4 covers them. Change
`API_PORT` / `WEB_PORT` / `DB_PORT_HOST` only if a port is taken; if you change
`API_PORT`, change `VITE_SHOWROOM_API_BASE` to match.

**Verify:**

```bash
docker compose config >/dev/null && echo OK
```

## Step 3 — Start

```bash
docker compose up -d --build
```

First build pulls base images and installs npm dependencies, so allow several
minutes.

**Verify** all three containers are healthy or running:

```bash
docker compose ps
```

Then confirm the API is serving and the showroom routes registered:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api   # expect 200
curl -s http://localhost:3000/api-json | grep -c showroom            # expect > 0
```

The three showroom tables are created by the module's migration when `api`
boots. Confirm:

```bash
docker compose exec -T db psql -U postgres -d ecommerce_db -c '\dt showroom*'
```

Expect `showroom_cart_items`, `showroom_orders`, `showroom_product_map`.

## Step 4 — Seed a product and check the flow

```bash
./scripts/seed-demo.sh
```

**Verify:**

```bash
curl -s http://localhost:3000/api/showroom/products/IP15PM-256
```

Expect JSON with `"priceVnd": 31491000` — 34,990,000 less the 10% discount.
`products.discount` is a **percentage** in this codebase, and this number
confirms the module reads it the same way the existing UI does.

Now the web app:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/showroom-3d
```

Expect **200**, not 404. A 404 means the nginx SPA fallback is broken — React
Router routes only exist client-side.

At this point http://localhost:8080/showroom-3d renders the page with a
"Chưa cấu hình không gian 3D" card. That is correct: no Matterport space is
configured yet. It is deliberate, so a config problem never looks like a code
problem.

## Step 5 — Connect the real Matterport space

Requires **Developer Tools / an SDK Key** on the Matterport plan. Without it the
showcase still renders but no tag clicks arrive, and the whole feature is inert.

Put both values in `.env`:

```
VITE_MATTERPORT_MODEL_SID=<the m= value from the showcase URL>
VITE_MATTERPORT_SDK_KEY=<SDK key>
```

Rebuild — these are compiled into the bundle:

```bash
docker compose up -d --build web
```

In the Matterport dashboard, tag a product with `SKU:IP15PM-256` anywhere in the
tag's label or description. Then open http://localhost:8080/showroom-3d and
click the tag: the sidebar should slide in from the right with the product.

## Step 6 — Exercise the purchase flow

Click **Mua ngay**. An order is created and a placeholder QR appears.

Payment is **deliberately unfinished** — there is no gateway, so an order never
settles on its own. Drive it manually:

```bash
docker compose exec -T db psql -U postgres -d ecommerce_db \
  -c "UPDATE showroom_orders SET status='paid' WHERE status='pending';"
```

The sidebar polls every 3s, so within a few seconds it shows
"Thanh toán thành công" and closes itself. That is the full flow working.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `docker ps` fails, "Cannot connect to the Docker daemon" | Daemon is not running. Start Docker Desktop / `systemctl start docker`. |
| `JWT_SECRET is required` | Step 2 not done. `cp .env.docker.example .env` and set it. |
| `port is already allocated` | Change `API_PORT` / `WEB_PORT` / `DB_PORT_HOST` in `.env`. If you change `API_PORT`, update `VITE_SHOWROOM_API_BASE` too and rebuild `web`. |
| `npm ci` fails during build, lockfile out of sync | In `docker/Dockerfile.api` or `.web`, change `npm ci` to `npm install`, then re-run step 3. |
| `api` restarts repeatedly | `docker compose logs api`. Usually Postgres not ready (compose waits on a healthcheck, so suspect credentials) or a migration error. |
| `gen_random_uuid() does not exist` | Postgres older than 13. The bundled image is 16; only an issue against an external DB. Run `CREATE EXTENSION IF NOT EXISTS pgcrypto;`. |
| `/showroom-3d` returns 404 | nginx SPA fallback missing. Confirm `workspace/Ecommerce-UI/docker-nginx.conf` exists, then rebuild `web`. |
| Sidebar never opens on tag click | Either no SDK Key on the plan, or the tag has no `SKU:` in its label. The on-screen badge reports connection failures — read it. |
| SKU 404s | No `showroom_product_map` row. Run `./scripts/seed-demo.sh`, or insert one (see `ecommerce-be/src/showroom/seed-product-map.example.sql`). |
| Matterport env change had no effect | `VITE_*` is build-time. `docker compose build web` — restarting is not enough. |

Reset everything, including the database:

```bash
docker compose down -v && rm -rf workspace && ./scripts/setup-workspace.sh
```

## Known limits

These are real and were not worked around:

- **Payment is a stub.** `StubPaymentProvider` contacts no gateway and signs
  nothing. `ShowroomPaymentProvider` is the interface to implement, and
  `ShowroomOrderService.markPaid()` is the settlement entry point. The existing
  `PaymentsService` could not be reused: it is CRUD over the `payments` table
  with no QR creation, and it requires an authenticated `userId` plus a row in
  `orders`, which an anonymous showroom visitor has neither of.
- **The Matterport SDK call names are unverified against a live model.** The SDK
  renamed `Mattertag` to `Tag` around 3.1.70, so `useMatterportSdk.js` resolves
  the namespace at runtime and subscribes to both click paths, de-duplicated.
  This still wants one pass against the real space.
- **`products` has no `sku` column and no colour data**, which is why
  `showroom_product_map` exists. Verified: zero matches for `sku`/`colour`
  anywhere in the backend source.
- **This stack has never been run.** It was authored in an environment with no
  Docker daemon and with the npm registry blocked, so no image was ever built.
  What was verified: the full-project `tsc` typecheck on the patched backend,
  `docker compose config`, and `setup-workspace.sh` executed end to end
  (including idempotency) with the patch output diffed against upstream.

## Reference

`INTEGRATION.md` — the manual, non-Docker integration path, the API surface, and
the full spec-versus-reality survey.
