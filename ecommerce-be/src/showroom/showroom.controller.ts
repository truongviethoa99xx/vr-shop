import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AddCartItemDto,
  CreateShowroomOrderDto,
  SessionQueryDto,
  ShowroomProductResponseDto,
} from './dto/showroom.dto';
import { ShowroomCartService } from './services/showroom-cart.service';
import { ShowroomCatalogService } from './services/showroom-catalog.service';
import { ShowroomOrderService } from './services/showroom-order.service';

/**
 * Anonymous by design: the showroom is walk-up shopping inside a 3D space, so
 * there is no JwtAuthGuard here. Ownership is scoped by the client-generated
 * session UUID, which is why every cart route requires one.
 *
 * Routes land on /api/showroom/*. Swagger is mounted at the exact path `/api`
 * in main.ts and registers only exact asset paths, so it does not shadow these.
 */
@ApiTags('Showroom 3D')
@Controller('api/showroom')
export class ShowroomController {
  constructor(
    private readonly cartService: ShowroomCartService,
    private readonly catalogService: ShowroomCatalogService,
    private readonly orderService: ShowroomOrderService,
  ) {}

  @Get('products/:sku')
  @ApiOperation({ summary: 'Resolve a Matterport tag SKU to product details' })
  @ApiParam({ name: 'sku', example: 'IP15PM-256' })
  @ApiResponse({ status: 200, type: ShowroomProductResponseDto })
  @ApiResponse({
    status: 404,
    description: 'SKU not mapped, or product missing',
  })
  getProduct(@Param('sku') sku: string) {
    return this.catalogService.findBySku(sku);
  }

  @Get('cart')
  @ApiOperation({ summary: 'Get the cart for a showroom session' })
  getCart(@Query() query: SessionQueryDto) {
    return this.cartService.getCart(query.sessionId);
  }

  @Post('cart')
  @ApiOperation({ summary: 'Add a product to the showroom cart' })
  @ApiResponse({ status: 201, description: 'Item added, price snapshotted' })
  @ApiResponse({ status: 404, description: 'SKU not mapped' })
  addToCart(@Body() dto: AddCartItemDto) {
    return this.cartService.addItem(dto);
  }

  @Delete('cart/:itemId')
  @ApiOperation({ summary: 'Remove one item from the showroom cart' })
  @ApiParam({ name: 'itemId', description: 'Cart item UUID' })
  async removeFromCart(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Query() query: SessionQueryDto,
  ) {
    await this.cartService.removeItem(itemId, query.sessionId);
    return { message: 'Item removed' };
  }

  @Post('orders')
  @ApiOperation({
    summary: 'Create an order from the session cart and get a payment QR',
  })
  @ApiResponse({ status: 201, description: 'Returns { order, qrCode }' })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  createOrder(@Body() dto: CreateShowroomOrderDto) {
    return this.orderService.createFromCart(dto);
  }

  @Get('orders/:orderId/status')
  @ApiOperation({ summary: 'Poll the payment status of a showroom order' })
  @ApiParam({ name: 'orderId', description: 'Showroom order UUID' })
  getOrderStatus(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.orderService.getStatus(orderId);
  }
}
