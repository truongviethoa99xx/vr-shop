import { create } from 'zustand';
import { showroomApi } from '../api/showroomApi';

/**
 * Showroom cart state.
 *
 * Server-authoritative on purpose: the price snapshot lives in
 * showroom_cart_items, so the store holds no persisted copy of the cart and
 * re-reads it after every mutation. Only the session id is persisted, by
 * useShowroomSession. This is a separate store from src/store/cart.js so the
 * main site's cart is untouched.
 */
export const useShowroomCartStore = create((set, get) => ({
  items: [],
  totalVnd: 0,
  loading: false,
  error: null,

  order: null,
  qrCode: null,
  qrIsImageUrl: false,
  payUrl: null,
  orderStatus: null,
  placingOrder: false,

  refresh: async (sessionId) => {
    if (!sessionId) return;
    set({ loading: true, error: null });
    try {
      const cart = await showroomApi.getCart(sessionId);
      set({
        items: cart.items ?? [],
        totalVnd: cart.totalVnd ?? 0,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: readError(err) });
    }
  },

  addItem: async (sessionId, { sku, color, quantity = 1 }) => {
    set({ error: null });
    try {
      await showroomApi.addToCart({ sessionId, sku, color, quantity });
      await get().refresh(sessionId);
      return true;
    } catch (err) {
      set({ error: readError(err) });
      return false;
    }
  },

  removeItem: async (sessionId, itemId) => {
    set({ error: null });
    try {
      await showroomApi.removeCartItem({ sessionId, itemId });
      await get().refresh(sessionId);
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  createOrder: async (sessionId, paymentMethod) => {
    set({ placingOrder: true, error: null });
    try {
      const result = await showroomApi.createOrder({ sessionId, paymentMethod });
      set({
        order: result.order,
        qrCode: result.qrCode,
        qrIsImageUrl: !!result.qrIsImageUrl,
        payUrl: result.payUrl ?? null,
        orderStatus: result.order?.status ?? 'pending',
        placingOrder: false,
        // The server clears the cart once the order freezes its line items.
        items: [],
        totalVnd: 0,
      });
      return result.order;
    } catch (err) {
      set({ placingOrder: false, error: readError(err) });
      return null;
    }
  },

  setOrderStatus: (orderStatus) => set({ orderStatus }),

  resetOrder: () =>
    set({
      order: null,
      qrCode: null,
      qrIsImageUrl: false,
      payUrl: null,
      orderStatus: null,
    }),
}));

/** Surfaces the Nest error message instead of a bare "Request failed". */
const readError = (err) => {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || err?.message || 'Có lỗi xảy ra, vui lòng thử lại';
};

export default useShowroomCartStore;
