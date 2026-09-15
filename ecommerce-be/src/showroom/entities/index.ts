import { ShowroomCartItem } from './showroom-cart-item.entity';
import { ShowroomOrder } from './showroom-order.entity';
import { ShowroomProductMap } from './showroom-product-map.entity';

export { ShowroomCartItem } from './showroom-cart-item.entity';
export { ShowroomOrder } from './showroom-order.entity';
export { ShowroomProductMap } from './showroom-product-map.entity';
export type { ShowroomOrderItem } from './showroom-order.entity';

/** Registered on the `showroom` DataSource only - never on the root one. */
export const showroomEntities = [
  ShowroomCartItem,
  ShowroomOrder,
  ShowroomProductMap,
];
