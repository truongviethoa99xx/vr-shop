import axios from 'axios';
import { SHOWROOM_API_BASE } from '../constants';

/**
 * Dedicated axios instance.
 *
 * Deliberately NOT the shared src/services/api.js client: this folder must stay
 * independent of the rest of the app, and the showroom is anonymous - it must
 * not attach the logged-in user's bearer token or inherit that client's 401
 * redirect behaviour.
 */
const client = axios.create({
  baseURL: `${SHOWROOM_API_BASE}/api/showroom`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const unwrap = (promise) => promise.then((res) => res.data);

export const showroomApi = {
  getProductBySku: (sku) => unwrap(client.get(`/products/${encodeURIComponent(sku)}`)),

  getCart: (sessionId) => unwrap(client.get('/cart', { params: { sessionId } })),

  addToCart: ({ sessionId, sku, color, quantity = 1 }) =>
    unwrap(
      client.post('/cart', {
        sessionId,
        sku,
        quantity,
        // The backend ValidationPipe uses forbidNonWhitelisted, so `color` is
        // omitted entirely rather than sent as null when no colour is chosen.
        ...(color ? { color } : {}),
      }),
    ),

  removeCartItem: ({ sessionId, itemId }) =>
    unwrap(client.delete(`/cart/${itemId}`, { params: { sessionId } })),

  createOrder: ({ sessionId, paymentMethod }) =>
    unwrap(client.post('/orders', { sessionId, paymentMethod })),

  getOrderStatus: (orderId) => unwrap(client.get(`/orders/${orderId}/status`)),
};

export default showroomApi;
