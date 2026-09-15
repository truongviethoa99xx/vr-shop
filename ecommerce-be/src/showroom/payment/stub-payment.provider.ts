import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ShowroomPaymentIntent,
  ShowroomPaymentProvider,
  ShowroomPaymentRequest,
} from './showroom-payment.provider';

/**
 * Placeholder provider so the showroom flow is complete end to end while the
 * real gateway work is deferred.
 *
 * It emits a VietQR-shaped payload built from config and issues no network call
 * and no signature, so it must not be treated as a settled payment: an order
 * only becomes `paid` when ShowroomOrderService.markPaid is called.
 *
 * To go live, implement ShowroomPaymentProvider against the chosen gateway and
 * swap the binding in showroom.module.ts - nothing else has to change.
 */
@Injectable()
export class StubPaymentProvider implements ShowroomPaymentProvider {
  private readonly logger = new Logger(StubPaymentProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async createPaymentIntent(
    request: ShowroomPaymentRequest,
  ): Promise<ShowroomPaymentIntent> {
    this.logger.warn(
      `StubPaymentProvider issued a non-binding QR for order ${request.orderId} ` +
        `(${request.amountVnd} VND via ${request.method}). No gateway was contacted.`,
    );

    return {
      qrCode: [
        'SHOWROOM-DEV',
        this.configService.get('SHOWROOM_STUB_BANK_BIN', '970436'),
        this.configService.get('SHOWROOM_STUB_BANK_ACCOUNT', '0000000000'),
        request.amountVnd,
        request.orderId,
      ].join('|'),
      qrIsImageUrl: false,
      gatewayTransactionId: null,
      payUrl: null,
    };
  }
}
