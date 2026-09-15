import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Bridges the SKU written on a Matterport tag to a row in the existing
 * `products` table.
 *
 * The existing Product entity has no `sku` column and carries no colour data
 * (verified: zero matches for sku/colour anywhere in src/). Rather than alter
 * that table, the showroom keeps its own mapping here, so the person tagging
 * products in the Matterport dashboard can use real MTM SKUs and declare the
 * colours that should be offered for each one.
 */
@Entity('showroom_product_map')
export class ShowroomProductMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The value written on the tag label as `SKU:<sku>`. */
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  sku: string;

  /** FK-by-value into the existing `products` table (products.id). */
  @Column({ type: 'int', name: 'product_id' })
  productId: number;

  /** Selectable colours for this SKU, e.g. ["Titan tự nhiên","Xanh mòng biển"]. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  colors: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
