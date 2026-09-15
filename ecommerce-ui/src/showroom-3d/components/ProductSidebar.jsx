import { useEffect, useState } from 'react';
import { PAYMENT_METHODS, cx, formatVnd } from '../constants';
import QrPanel from './QrPanel';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const ProductBody = ({
  product,
  color,
  onColorChange,
  quantity,
  onQuantityChange,
}) => (
  <>
    {product.images[0] && (
      <img
        src={product.images[0]}
        alt={product.name}
        className="h-48 w-full rounded-lg bg-gray-100 object-contain"
        loading="lazy"
      />
    )}

    <div>
      <h3 className="text-lg font-semibold leading-snug text-gray-900">
        {product.name}
      </h3>
      {product.categoryName && (
        <p className="mt-0.5 text-xs text-gray-500">{product.categoryName}</p>
      )}
    </div>

    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-red-600">
        {formatVnd(product.priceVnd)}
      </span>
      {product.discountPercent > 0 && (
        <>
          <span className="text-sm text-gray-400 line-through">
            {formatVnd(product.listPriceVnd)}
          </span>
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
            -{product.discountPercent}%
          </span>
        </>
      )}
    </div>

    {product.colors.length > 0 && (
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Màu sắc</p>
        <div className="flex flex-wrap gap-2">
          {product.colors.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onColorChange(option)}
              aria-pressed={color === option}
              className={cx(
                'rounded-full border px-3 py-1.5 text-sm transition',
                color === option
                  ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    )}

    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Số lượng</span>
      <div className="flex items-center rounded-lg ring-1 ring-gray-300">
        <button
          type="button"
          onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
          className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          disabled={quantity <= 1}
          aria-label="Giảm số lượng"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-medium">{quantity}</span>
        <button
          type="button"
          onClick={() => onQuantityChange(Math.min(99, quantity + 1))}
          className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          disabled={quantity >= 99}
          aria-label="Tăng số lượng"
        >
          +
        </button>
      </div>
      <span className="text-xs text-gray-500">
        {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
      </span>
    </div>
  </>
);

/**
 * Slide-over panel for the tapped product.
 *
 * Overlays the 3D space from the right and is deliberately narrow, with no
 * backdrop over the viewer, so the room stays visible and interactive behind it.
 */
const ProductSidebar = ({
  open,
  loading,
  error,
  product,
  order,
  qrCode,
  qrIsImageUrl,
  payUrl,
  orderStatus,
  placingOrder,
  onClose,
  onBuyNow,
  onResetOrder,
}) => {
  const [color, setColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState(PAYMENT_METHODS[0].value);

  // Reset the picker whenever a different product is opened.
  useEffect(() => {
    setColor(product?.colors?.[0] ?? null);
    setQuantity(1);
  }, [product?.sku]);

  // Esc closes the panel, matching the usual slide-over affordance.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const showOrder = !!order;
  const soldOut = !!product && product.stock <= 0;

  return (
    <aside
      aria-hidden={!open}
      aria-label="Chi tiết sản phẩm"
      className={cx(
        'absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col bg-white shadow-2xl',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      )}
    >
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {showOrder ? 'Thanh toán' : 'Sản phẩm'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Đóng"
        >
          <CloseIcon />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading && (
          <div className="space-y-3" aria-busy="true">
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-gray-100" />
            <div className="h-7 w-1/2 animate-pulse rounded bg-gray-100" />
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {!loading && !error && showOrder && (
          <QrPanel
            order={order}
            qrCode={qrCode}
            qrIsImageUrl={qrIsImageUrl}
            payUrl={payUrl}
            status={orderStatus}
            onReset={onResetOrder}
          />
        )}

        {!loading && !error && !showOrder && product && (
          <ProductBody
            product={product}
            color={color}
            onColorChange={setColor}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
        )}
      </div>

      {!showOrder && product && !loading && !error && (
        <footer className="space-y-3 border-t border-gray-200 p-4">
          <div>
            <label
              htmlFor="showroom-payment-method"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Phương thức thanh toán
            </label>
            <select
              id="showroom-payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="w-full rounded-lg border-gray-300 py-2 text-sm ring-1 ring-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={placingOrder || soldOut}
            onClick={() => onBuyNow({ color, quantity, paymentMethod: method })}
            className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {placingOrder
              ? 'Đang tạo đơn…'
              : soldOut
                ? 'Hết hàng'
                : `Mua ngay · ${formatVnd(product.priceVnd * quantity)}`}
          </button>
        </footer>
      )}
    </aside>
  );
};

export default ProductSidebar;
