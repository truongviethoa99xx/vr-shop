import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShowroomOrder, ShowroomOrderItem } from '../entities';
import { CreateShowroomOrderDto } from '../dto/showroom.dto';
import {
  SHOWROOM_DATA_SOURCE,
  SHOWROOM_PAYMENT_PROVIDER,
} from '../showroom.constants';
import { ShowroomPaymentProvider } from '../payment';
import { ShowroomCartService } from './showroom-cart.service';

export interface CreatedShowroomOrder {
  order: ShowroomOrder;
  qrCode: string;
  qrIsImageUrl: boolean;
  payUrl: string | null;
}

@Injectable()
export class ShowroomOrderService {
  private readonly logger = new Logger(ShowroomOrderService.name);

  constructor(
    @InjectRepository(ShowroomOrder, SHOWROOM_DATA_SOURCE)
    private readonly orderRepository: Repository<ShowroomOrder>,
    private readonly cartService: ShowroomCartService,
    @Inject(SHOWROOM_PAYMENT_PROVIDER)
    private readonly paymentProvider: ShowroomPaymentProvider,
  ) {}

  async createFromCart(
    dto: CreateShowroomOrderDto,
  ): Promise<CreatedShowroomOrder> {
    const { sessionId, paymentMethod } = dto;
    const cart = await this.cartService.getCart(sessionId);

    if (!cart.items.length) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    // getCart has already resolved the display name and line totals, so the
    // order is frozen straight from that view rather than re-reading each SKU.
    const items: ShowroomOrderItem[] = cart.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      color: item.color,
      quantity: item.quantity,
      unitPriceVnd: item.unitPriceVnd,
      lineTotalVnd: item.lineTotalVnd,
    }));

    const totalVnd = cart.totalVnd;

    const order = await this.orderRepository.save(
      this.orderRepository.create({
        sessionId,
        items,
        totalVnd,
        paymentMethod,
        status: 'pending',
        gatewayTransactionId: null,
      }),
    );

    const intent = await this.paymentProvider.createPaymentIntent({
      orderId: order.id,
      amountVnd: totalVnd,
      method: paymentMethod,
      description: `Showroom 3D - don ${order.id}`,
    });

    if (intent.gatewayTransactionId) {
      order.gatewayTransactionId = intent.gatewayTransactionId;
      await this.orderRepository.update(order.id, {
        gatewayTransactionId: intent.gatewayTransactionId,
      });
    }

    // The cart is cleared only once the order has frozen its own line items.
    await this.cartService.clearSession(sessionId);

    return {
      order,
      qrCode: intent.qrCode,
      qrIsImageUrl: intent.qrIsImageUrl,
      payUrl: intent.payUrl,
    };
  }

  async findOne(orderId: string): Promise<ShowroomOrder> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Showroom order ${orderId} not found`);
    }

    return order;
  }

  async getStatus(orderId: string) {
    const order = await this.findOne(orderId);

    return {
      orderId: order.id,
      status: order.status,
      totalVnd: order.totalVnd,
      paymentMethod: order.paymentMethod,
      gatewayTransactionId: order.gatewayTransactionId,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Settles a showroom order. This is the single entry point a payment callback
   * should call once it has verified the gateway signature.
   *
   * Idempotent: replaying the same callback is a no-op, and an order that
   * already failed or was cancelled is not silently resurrected.
   */
  async markPaid(
    orderId: string,
    transactionId: string,
  ): Promise<ShowroomOrder> {
    const order = await this.findOne(orderId);

    if (order.status === 'paid') {
      this.logger.log(`Order ${orderId} already paid; ignoring replay.`);
      return order;
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Order ${orderId} is ${order.status} and cannot be marked paid`,
      );
    }

    await this.orderRepository.update(orderId, {
      status: 'paid',
      gatewayTransactionId: transactionId,
    });

    this.logger.log(`Order ${orderId} marked paid (txn ${transactionId}).`);
    return this.findOne(orderId);
  }

  async markFailed(orderId: string, reason?: string): Promise<ShowroomOrder> {
    const order = await this.findOne(orderId);

    if (order.status !== 'pending') return order;

    await this.orderRepository.update(orderId, { status: 'failed' });
    this.logger.warn(`Order ${orderId} marked failed. ${reason ?? ''}`.trim());
    return this.findOne(orderId);
  }
}
