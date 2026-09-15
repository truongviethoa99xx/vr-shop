import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../../products/products.service';
import { ShowroomProductMap } from '../entities';
import { ShowroomProductResponseDto } from '../dto/showroom.dto';
import { SHOWROOM_DATA_SOURCE } from '../showroom.constants';

/**
 * Read-only view of the existing catalogue, keyed by showroom SKU.
 *
 * Product lookup itself is not reimplemented here: resolution goes
 * SKU -> showroom_product_map.product_id -> ProductsService.findOne(id), which
 * is the existing service exported by ProductsModule.
 */
@Injectable()
export class ShowroomCatalogService {
  constructor(
    private readonly productsService: ProductsService,
    @InjectRepository(ShowroomProductMap, SHOWROOM_DATA_SOURCE)
    private readonly mapRepository: Repository<ShowroomProductMap>,
  ) {}

  async findBySku(sku: string): Promise<ShowroomProductResponseDto> {
    const mapping = await this.mapRepository.findOne({ where: { sku } });

    if (!mapping) {
      throw new NotFoundException(
        `SKU "${sku}" is not mapped to a product. Add a showroom_product_map row for it.`,
      );
    }

    // Reuses the existing service, including its own NotFoundException.
    const product = await this.productsService.findOne(mapping.productId);

    const listPriceVnd = this.toVnd(product.price);
    const discountPercent = this.toPercent(product.discount);

    return {
      sku: mapping.sku,
      productId: product.id,
      name: product.name,
      description: product.description ?? null,
      priceVnd: this.applyDiscount(listPriceVnd, discountPercent),
      listPriceVnd,
      discountPercent,
      images: this.normalizeImages(product.images),
      colors: Array.isArray(mapping.colors) ? mapping.colors : [],
      stock: product.stock,
      categoryName: product.category?.name ?? null,
    };
  }

  /** Unit price actually charged, in whole VND. */
  async resolveUnitPriceVnd(sku: string): Promise<number> {
    const product = await this.findBySku(sku);
    return product.priceVnd;
  }

  /**
   * `products.discount` is a PERCENTAGE in this codebase - ProductCard.jsx
   * renders `price - (price * discount) / 100`. Same formula here so the
   * snapshot matches what the shopper was shown.
   */
  private applyDiscount(listPriceVnd: number, discountPercent: number): number {
    if (discountPercent <= 0) return listPriceVnd;
    return Math.round(listPriceVnd - (listPriceVnd * discountPercent) / 100);
  }

  /** TypeORM returns `decimal` columns as strings. */
  private toVnd(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }

  private toPercent(value: unknown): number {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), 100);
  }

  /** `products.images` is a text column holding a JSON array. */
  private normalizeImages(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.filter((i): i is string => !!i);
    if (typeof raw !== 'string' || !raw.trim()) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        return parsed.filter((i) => typeof i === 'string');
      return typeof parsed === 'string' ? [parsed] : [];
    } catch {
      // Older rows store a single bare URL rather than JSON.
      return [raw];
    }
  }
}
