import { formatVnd } from '../constants';

/**
 * Payment panel shown after an order is created.
 *
 * A real gateway (VNPay/Momo/ZaloPay) returns a hosted QR image or a payUrl, so
 * `qrIsImageUrl` renders it directly and no QR-encoding dependency is needed.
 * The deferred stub provider returns a raw payload instead, which is shown as
 * text and clearly labelled - it is not a chargeable code.
 */
const QrPanel = ({ order, qrCode, qrIsImageUrl, payUrl, status, onReset }) => {
  const isPaid = status === 'paid';
  const isFailed = status === 'failed' || status === 'cancelled';

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-600">Tổng tiền</span>
          <span className="text-xl font-bold text-gray-900">
            {formatVnd(order?.totalVnd)}
          </span>
        </div>
        <p className="mt-1 break-all text-xs text-gray-500">
          Mã đơn: {order?.id}
        </p>
      </div>

      {!isPaid && (
        <div className="flex flex-col items-center gap-3">
          {qrIsImageUrl ? (
            <img
              src={qrCode}
              alt="Mã QR thanh toán"
              className="h-56 w-56 rounded-lg bg-white object-contain ring-1 ring-gray-200"
            />
          ) : (
            <div className="w-full rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                QR tạm thời (chưa gắn cổng thanh toán)
              </p>
              <code className="mt-2 block break-all text-xs text-amber-900">
                {qrCode}
              </code>
            </div>
          )}

          <p className="text-center text-sm text-gray-600">
            Quét mã bằng ứng dụng ngân hàng để hoàn tất thanh toán.
          </p>

          {payUrl && (
            <a
              href={payUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Hoặc mở ứng dụng thanh toán →
            </a>
          )}
        </div>
      )}

      <div
        className={
          isPaid
            ? 'rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800 ring-1 ring-green-200'
            : isFailed
              ? 'rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-200'
              : 'flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 ring-1 ring-blue-200'
        }
        role="status"
        aria-live="polite"
      >
        {isPaid ? (
          'Thanh toán thành công! Cảm ơn bạn.'
        ) : isFailed ? (
          `Thanh toán không thành công (${status}).`
        ) : (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Đang chờ thanh toán…
          </>
        )}
      </div>

      {isFailed && (
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Thử lại
        </button>
      )}
    </div>
  );
};

export default QrPanel;
