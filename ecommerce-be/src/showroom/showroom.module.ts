import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { showroomEntities } from './entities';
import { CreateShowroomTables1757923200000 } from './migrations/1757923200000-CreateShowroomTables';
import {
  SHOWROOM_DATA_SOURCE,
  SHOWROOM_PAYMENT_PROVIDER,
} from './showroom.constants';
import { StubPaymentProvider } from './payment';
import { ShowroomController } from './showroom.controller';
import { ShowroomCartService } from './services/showroom-cart.service';
import { ShowroomCatalogService } from './services/showroom-catalog.service';
import { ShowroomOrderService } from './services/showroom-order.service';

/**
 * Self-contained Showroom 3D module.
 *
 * It registers its OWN named TypeORM DataSource ('showroom') pointing at the
 * same database, using the same DB_* env vars as the root connection. That is
 * what keeps the footprint on existing code down to a single import:
 *
 *   - the root TypeOrmModule.forRootAsync config is untouched (no
 *     `autoLoadEntities`, no new entries in its `entities` array),
 *   - src/entities/index.ts is untouched,
 *   - the root connection keeps `synchronize: true` in dev but never sees the
 *     showroom entities, so it will not manage or drop the showroom tables,
 *   - this connection runs `synchronize: false` - the three tables are created
 *     only by the migration in ./migrations.
 *
 * Cost of the approach: one extra connection pool (capped small below). If you
 * would rather share the root pool, see INTEGRATION.md for the alternative.
 */
@Module({
  imports: [
    // Provides the existing ProductsService; ProductsModule already exports it.
    ProductsModule,

    TypeOrmModule.forRootAsync({
      name: SHOWROOM_DATA_SOURCE,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        name: SHOWROOM_DATA_SOURCE,
        type: 'postgres' as const,
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'ecommerce_db'),
        entities: showroomEntities,
        migrations: [CreateShowroomTables1757923200000],
        migrationsRun: configService.get('SHOWROOM_RUN_MIGRATIONS') === 'true',
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        extra: { max: Number(configService.get('SHOWROOM_DB_POOL_MAX', 5)) },
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forFeature(showroomEntities, SHOWROOM_DATA_SOURCE),
  ],
  controllers: [ShowroomController],
  providers: [
    ShowroomCatalogService,
    ShowroomCartService,
    ShowroomOrderService,
    // Swap this binding for a real gateway adapter when payment is picked up.
    { provide: SHOWROOM_PAYMENT_PROVIDER, useClass: StubPaymentProvider },
  ],
  // Exported so a future payment callback can call markPaid(orderId, txnId).
  exports: [ShowroomOrderService],
})
export class ShowroomModule {}
