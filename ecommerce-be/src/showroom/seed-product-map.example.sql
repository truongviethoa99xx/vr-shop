-- Maps Matterport tag SKUs to rows in the existing `products` table.
--
-- `products` has no `sku` column and stores no colour data, so the showroom
-- keeps this mapping instead of altering that table.
--
-- Tag convention: put `SKU:<code>` anywhere in the Matterport tag's label or
-- description, e.g. "iPhone 15 Pro Max SKU:IP15PM-256".

INSERT INTO showroom_product_map (sku, product_id, colors) VALUES
  ('IP15PM-256', 1, '["Titan tự nhiên","Titan xanh","Titan trắng"]'::jsonb),
  ('SS-S24U-512', 2, '["Xám Titan","Tím Titan"]'::jsonb),
  -- An empty array simply hides the colour picker in the sidebar.
  ('AIRPODS-PRO2', 3, '[]'::jsonb)
ON CONFLICT (sku) DO UPDATE
  SET product_id = EXCLUDED.product_id,
      colors     = EXCLUDED.colors,
      updated_at = now();

-- Sanity check: every mapped SKU should resolve to a real product.
-- SELECT m.sku, m.product_id, p.name
-- FROM showroom_product_map m
-- LEFT JOIN products p ON p.id = m.product_id
-- ORDER BY m.sku;
