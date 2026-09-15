/**
 * ShowroomModule runs on its own named TypeORM DataSource so that the module
 * can be added to AppModule without touching the root TypeOrmModule.forRootAsync
 * config or src/entities/index.ts.
 *
 * The root connection keeps `synchronize: true` in dev and only knows about the
 * entities exported from src/entities/index.ts, so it will never see - or try to
 * alter - the showroom tables. Those are owned exclusively by the migration in
 * ./migrations.
 */
export const SHOWROOM_DATA_SOURCE = 'showroom';

/** Injection token for the pluggable payment provider. */
export const SHOWROOM_PAYMENT_PROVIDER = 'SHOWROOM_PAYMENT_PROVIDER';

export const SHOWROOM_PAYMENT_METHODS = ['momo', 'vnpay', 'zalopay'] as const;
export type ShowroomPaymentMethod = (typeof SHOWROOM_PAYMENT_METHODS)[number];

export const SHOWROOM_ORDER_STATUSES = [
  'pending',
  'paid',
  'failed',
  'cancelled',
] as const;
export type ShowroomOrderStatus = (typeof SHOWROOM_ORDER_STATUSES)[number];
