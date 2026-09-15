import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the three showroom-owned tables. Touches nothing that already exists:
 * no ALTER on products / orders / payments, no shared enum types.
 *
 * `gen_random_uuid()` is built into PostgreSQL 13+. On PostgreSQL 12 or older,
 * run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first.
 */
export class CreateShowroomTables1757923200000 implements MigrationInterface {
  name = 'CreateShowroomTables1757923200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "showroom_product_map" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sku" character varying(100) NOT NULL,
        "product_id" integer NOT NULL,
        "colors" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_showroom_product_map" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_showroom_product_map_sku" UNIQUE ("sku")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_showroom_product_map_sku" ON "showroom_product_map" ("sku")`,
    );

    await queryRunner.query(`
      CREATE TABLE "showroom_cart_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL,
        "sku" character varying(100) NOT NULL,
        "color" character varying(100),
        "quantity" integer NOT NULL,
        "unit_price_vnd" bigint NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_showroom_cart_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_showroom_cart_items_quantity" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_showroom_cart_items_price" CHECK ("unit_price_vnd" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_showroom_cart_items_session" ON "showroom_cart_items" ("session_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "showroom_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL,
        "items" jsonb NOT NULL,
        "total_vnd" bigint NOT NULL,
        "payment_method" character varying(20) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "gateway_transaction_id" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_showroom_orders" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_showroom_orders_method"
          CHECK ("payment_method" IN ('momo','vnpay','zalopay')),
        CONSTRAINT "CHK_showroom_orders_status"
          CHECK ("status" IN ('pending','paid','failed','cancelled')),
        CONSTRAINT "CHK_showroom_orders_total" CHECK ("total_vnd" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_showroom_orders_session" ON "showroom_orders" ("session_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_showroom_orders_session"`);
    await queryRunner.query(`DROP TABLE "showroom_orders"`);
    await queryRunner.query(`DROP INDEX "IDX_showroom_cart_items_session"`);
    await queryRunner.query(`DROP TABLE "showroom_cart_items"`);
    await queryRunner.query(`DROP INDEX "IDX_showroom_product_map_sku"`);
    await queryRunner.query(`DROP TABLE "showroom_product_map"`);
  }
}
