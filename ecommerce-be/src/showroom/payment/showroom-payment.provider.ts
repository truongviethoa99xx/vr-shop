import { ShowroomPaymentMethod } from '../showroom.constants';

export interface ShowroomPaymentRequest {
  orderId: string;
  amountVnd: number;
  method: ShowroomPaymentMethod;
  description: string;
}

export interface ShowroomPaymentIntent {
  /**
   * What the sidebar renders as a QR code. Either a payload string to encode
   * client-side, or an absolute image URL when the gateway returns one.
   */
  qrCode: string;
  /** True when `qrCode` is already an image URL rather than a payload. */
  qrIsImageUrl: boolean;
  /** Gateway-side id, when the gateway issues one at creation time. */
  gatewayTransactionId: string | null;
  /** Optional redirect/deeplink, for wallets that prefer app handoff. */
  payUrl: string | null;
}

/**
 * The seam where a real gateway gets wired in later.
 *
 * The existing PaymentsService in src/payments is CRUD over the `payments`
 * table only - it has no QR creation, no Momo/VNPay/ZaloPay client and no
 * IPN/webhook handler to branch into, and its create() requires an
 * authenticated userId plus a row in `orders`, neither of which an anonymous
 * showroom session has. So the showroom owns this port instead of reusing it.
 */
export interface ShowroomPaymentProvider {
  createPaymentIntent(
    request: ShowroomPaymentRequest,
  ): Promise<ShowroomPaymentIntent>;
}
