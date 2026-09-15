import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import {
  SHOWROOM_PAYMENT_METHODS,
  ShowroomPaymentMethod,
} from '../showroom.constants';

/**
 * main.ts installs a global ValidationPipe with
 * `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`, so every
 * accepted property must be decorated here or the request is rejected with 400.
 */

export class SessionQueryDto {
  @ApiProperty({
    description: 'Client-generated session UUID (no login required)',
    example: '3f1a6d5e-8b2c-4f7a-9d1e-0c5b7a2e4f60',
  })
  @IsUUID()
  sessionId: string;
}

export class AddCartItemDto {
  @ApiProperty({ example: '3f1a6d5e-8b2c-4f7a-9d1e-0c5b7a2e4f60' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'SKU read from the Matterport tag label (`SKU:<sku>`)',
    example: 'IP15PM-256',
  })
  @IsString()
  @MaxLength(100)
  sku: string;

  @ApiPropertyOptional({ example: 'Titan tự nhiên' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string;

  @ApiProperty({ minimum: 1, maximum: 99, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class CreateShowroomOrderDto {
  @ApiProperty({ example: '3f1a6d5e-8b2c-4f7a-9d1e-0c5b7a2e4f60' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ enum: SHOWROOM_PAYMENT_METHODS, example: 'vnpay' })
  @IsIn(SHOWROOM_PAYMENT_METHODS as unknown as string[])
  paymentMethod: ShowroomPaymentMethod;
}

export class ShowroomProductResponseDto {
  @ApiProperty() sku: string;
  @ApiProperty() productId: number;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ description: 'Unit price after discount, whole VND' })
  priceVnd: number;
  @ApiProperty({ description: 'List price before discount, whole VND' })
  listPriceVnd: number;
  @ApiProperty({ description: 'Discount percentage applied (0-100)' })
  discountPercent: number;
  @ApiProperty({ type: [String] }) images: string[];
  @ApiProperty({ type: [String] }) colors: string[];
  @ApiProperty() stock: number;
  @ApiProperty({ nullable: true }) categoryName: string | null;
}
