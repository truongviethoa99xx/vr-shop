import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShowroomCartItem } from '../entities';
import { AddCartItemDto } from '../dto/showroom.dto';
import { SHOWROOM_DATA_SOURCE } from '../showroom.constants';
import { ShowroomCatalogService } from './showroom-catalog.service';

export interface ShowroomCartView {
  sessionId: string;
  items: Array<
    ShowroomCartItem & {
      name: string;
      image: string | null;
      lineTotalVnd: number;
    }
  >;
  totalVnd: number;
}

@Injectable()
export class ShowroomCartService {
  constructor(
    @InjectRepository(ShowroomCartItem, SHOWROOM_DATA_SOURCE)
    private readonly cartRepository: Repository<ShowroomCartItem>,
    private readonly catalogService: ShowroomCatalogService,
  ) {}

  async getCart(sessionId: string): Promise<ShowroomCartView> {
    const items = await this.cartRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    const decorated = await Promise.all(
      items.map(async (item) => {
        // Name/image are display-only and read live; the PRICE stays snapshotted.
        const product = await this.catalogService
          .findBySku(item.sku)
          .catch(() => null);

        return {
          ...item,
          name: product?.name ?? item.sku,
          image: product?.images[0] ?? null,
          lineTotalVnd: item.unitPriceVnd * item.quantity,
        };
      }),
    );

    return {
      sessionId,
      items: decorated,
      totalVnd: decorated.reduce((sum, i) => sum + i.lineTotalVnd, 0),
    };
  }

  async addItem(dto: AddCartItemDto): Promise<ShowroomCartItem> {
    const { sessionId, sku, quantity } = dto;
    const color = dto.color ?? null;

    // Throws NotFound if the SKU is unmapped or the product is gone.
    const unitPriceVnd = await this.catalogService.resolveUnitPriceVnd(sku);

    const existing = await this.cartRepository.findOne({
      where: { sessionId, sku, color },
    });

    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, 99);
      // Re-snapshot so the cart reflects the price just shown in the sidebar.
      existing.unitPriceVnd = unitPriceVnd;
      return this.cartRepository.save(existing);
    }

    return this.cartRepository.save(
      this.cartRepository.create({
        sessionId,
        sku,
        color,
        quantity,
        unitPriceVnd,
      }),
    );
  }

  /** sessionId is required so one session cannot delete another's row. */
  async removeItem(itemId: string, sessionId: string): Promise<void> {
    const result = await this.cartRepository.delete({ id: itemId, sessionId });

    if (!result.affected) {
      throw new NotFoundException(
        `Cart item ${itemId} not found for this session`,
      );
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.cartRepository.delete({ sessionId });
  }
}
