import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { bigintToNumber } from './numeric.transformer';
import {
  ShowroomOrderStatus,
  ShowroomPaymentMethod,
} from '../showroom.constants';

/** Line items are frozen onto the order, so the cart can be cleared safely. */
export interface ShowroomOrderItem {
  sku: string;
  name: string;
  color: string | null;
  quantity: number;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

@Entity('showroom_orders')
@Index(['sessionId'])
export class ShowroomOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @Column({ type: 'jsonb' })
  items: ShowroomOrderItem[];

  @Column({ type: 'bigint', name: 'total_vnd', transformer: bigintToNumber })
  totalVnd: number;

  /** Constrained to momo | vnpay | zalopay by a CHECK in the migration. */
  @Column({ type: 'varchar', length: 20, name: 'payment_method' })
  paymentMethod: ShowroomPaymentMethod;

  /** Constrained to pending | paid | failed | cancelled by a CHECK. */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ShowroomOrderStatus;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'gateway_transaction_id',
    nullable: true,
  })
  gatewayTransactionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
