#!/usr/bin/env bash
#
# Seeds one demo product and its SKU mapping so the showroom has something to
# click immediately.
#
# Run AFTER `docker compose up -d` — showroom_product_map is created by the
# module's migration when the api container boots, not by Postgres init.
#
# Idempotent: re-running updates the same rows rather than duplicating them.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKU="${SKU:-IP15PM-256}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_NAME="${DB_NAME:-ecommerce_db}"

# Load .env so DB_USERNAME / DB_NAME overrides are picked up.
if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

psql_run() {
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -q \
    -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-ecommerce_db}" "$@"
}

printf '\033[1;34m==>\033[0m Waiting for the showroom tables (created by the api migration)\n'
for i in $(seq 1 60); do
  if psql_run -tAc "SELECT to_regclass('public.showroom_product_map') IS NOT NULL" 2>/dev/null | grep -qx t; then
    printf '\033[1;32m  ok\033[0m tables present\n'
    break
  fi
  if [ "$i" -eq 60 ]; then
    printf '\033[1;31mERROR\033[0m showroom_product_map never appeared.\n' >&2
    printf 'Check: docker compose logs api | tail -40\n' >&2
    exit 1
  fi
  sleep 2
done

printf '\033[1;34m==>\033[0m Seeding demo product + SKU map\n'
psql_run <<SQL
-- products has no natural unique key, so match on name to stay idempotent.
INSERT INTO products (name, description, price, discount, stock, images, no_of_sell, created_at, updated_at)
SELECT 'iPhone 15 Pro Max 256GB',
       'Khung titan, chip A17 Pro. San pham demo cho Showroom 3D.',
       34990000, 10, 25,
       '["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800"]',
       0, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'iPhone 15 Pro Max 256GB');

INSERT INTO showroom_product_map (sku, product_id, colors)
SELECT '${SKU}', p.id, '["Titan tu nhien","Titan xanh","Titan trang"]'::jsonb
FROM products p WHERE p.name = 'iPhone 15 Pro Max 256GB'
ON CONFLICT (sku) DO UPDATE
  SET product_id = EXCLUDED.product_id,
      colors     = EXCLUDED.colors,
      updated_at = now();
SQL

printf '\033[1;32m  ok\033[0m seeded\n\n'
psql_run -c "SELECT m.sku, m.product_id, p.name, p.price, p.discount
             FROM showroom_product_map m JOIN products p ON p.id = m.product_id;"

API_PORT="${API_PORT:-3000}"
cat <<TXT

Tag a Matterport hotspot with:  SKU:${SKU}

Verify the API resolves it:
  curl -s http://localhost:${API_PORT}/api/showroom/products/${SKU}

Expected priceVnd: 31491000  (34,990,000 less the 10% discount)
TXT
