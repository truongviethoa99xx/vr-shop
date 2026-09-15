import { useCallback, useEffect, useRef, useState } from 'react';
import ProductSidebar from './components/ProductSidebar';
import ShowroomViewer from './components/ShowroomViewer';
import { showroomApi } from './api/showroomApi';
import { useMatterportSdk } from './hooks/useMatterportSdk';
import { useShowroomSession } from './hooks/useShowroomSession';
import { useShowroomCartStore } from './store/useShowroomCartStore';
import { ORDER_POLL_INTERVAL_MS, ORDER_POLL_TIMEOUT_MS } from './constants';

/**
 * Route entry for /showroom-3d.
 *
 * Standalone by design: rendered outside MainLayout so the 3D space gets the
 * whole viewport, and it imports nothing from the rest of the app.
 */
const ShowroomPage = () => {
  const iframeRef = useRef(null);
  const sessionId = useShowroomSession();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [productError, setProductError] = useState(null);

  const {
    addItem,
    createOrder,
    order,
    qrCode,
    qrIsImageUrl,
    payUrl,
    orderStatus,
    placingOrder,
    setOrderStatus,
    resetOrder,
    error: cartError,
  } = useShowroomCartStore();

  /** A tag was tapped in the 3D space. */
  const handleTagSku = useCallback(async ({ sku }) => {
    setSidebarOpen(true);
    resetOrder();

    if (!sku) {
      setProduct(null);
      setProductError(
        'Tag này chưa gắn SKU. Thêm "SKU:<mã>" vào nhãn tag trong Matterport dashboard.',
      );
      return;
    }

    setLoadingProduct(true);
    setProductError(null);
    try {
      setProduct(await showroomApi.getProductBySku(sku));
    } catch (err) {
      setProduct(null);
      setProductError(
        err?.response?.status === 404
          ? `Chưa map SKU "${sku}" sang sản phẩm nào.`
          : (err?.response?.data?.message ?? 'Không tải được thông tin sản phẩm'),
      );
    } finally {
      setLoadingProduct(false);
    }
  }, [resetOrder]);

  const { status: sdkStatus, error: sdkError } = useMatterportSdk({
    iframeRef,
    onTagSku: handleTagSku,
  });

  const handleBuyNow = useCallback(
    async ({ color, quantity, paymentMethod }) => {
      if (!sessionId || !product) return;

      const added = await addItem(sessionId, {
        sku: product.sku,
        color,
        quantity,
      });
      if (!added) return;

      await createOrder(sessionId, paymentMethod);
    },
    [sessionId, product, addItem, createOrder],
  );

  const handleClose = useCallback(() => {
    setSidebarOpen(false);
    setProductError(null);
  }, []);

  // Poll the order until it settles, then close the sidebar on success.
  useEffect(() => {
    if (!order?.id || orderStatus !== 'pending') return undefined;

    let cancelled = false;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > ORDER_POLL_TIMEOUT_MS) {
        clearInterval(timer);
        return;
      }

      try {
        const result = await showroomApi.getOrderStatus(order.id);
        if (cancelled || result.status === 'pending') return;

        setOrderStatus(result.status);
        clearInterval(timer);

        if (result.status === 'paid') {
          // Let the success state be read before the panel slides away.
          setTimeout(() => {
            if (cancelled) return;
            setSidebarOpen(false);
            resetOrder();
            setProduct(null);
          }, 2500);
        }
      } catch {
        // Transient failure: keep polling until the timeout.
      }
    }, ORDER_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [order?.id, orderStatus, setOrderStatus, resetOrder]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <ShowroomViewer ref={iframeRef} status={sdkStatus} error={sdkError} />

      <ProductSidebar
        open={sidebarOpen}
        loading={loadingProduct}
        error={productError ?? cartError}
        product={product}
        order={order}
        qrCode={qrCode}
        qrIsImageUrl={qrIsImageUrl}
        payUrl={payUrl}
        orderStatus={orderStatus}
        placingOrder={placingOrder}
        onClose={handleClose}
        onBuyNow={handleBuyNow}
        onResetOrder={resetOrder}
      />
    </div>
  );
};

export default ShowroomPage;
