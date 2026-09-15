import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { bigintToNumber } from './numeric.transformer';

@Entity('showroom_cart_items')
@Index(['sessionId'])
export class ShowroomCartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Client-generated UUID. The showroom is anonymous - there is no login. */
  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 100 })
  sku: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  color: string | null;

  @Column({ type: 'int' })
  quantity: number;

  /** Price snapshot taken when the item was added, in whole VND. */
  @Column({
    type: 'bigint',
    name: 'unit_price_vnd',
    transformer: bigintToNumber,
  })
  unitPriceVnd: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
