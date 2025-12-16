import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Barcode,
  CreditCard,
  DollarSign,
  Loader2,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  usePOSItems,
  usePOSItemByBarcode,
  useCreateReceipt,
  CartItem,
  POSItem,
  useCurrentShift,
} from "@/hooks/usePOS";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { toast } from "sonner";

export default function ClassicPOS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const { data: items = [], isLoading } = usePOSItems(searchQuery);
  const createReceipt = useCreateReceipt();
  const findByBarcode = usePOSItemByBarcode();
  const { data: currentShift, isLoading: loadingShift } = useCurrentShift();
  const shiftLocked = !currentShift;

  const addToCart = (product: POSItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1, discount_percent: 0 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    const product = await findByBarcode(barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    } else {
      toast.error(`Product not found: ${barcode}`);
    }
  }, [findByBarcode]);

  const { subtotal, vatTotal, total } = useMemo(() => {
    const sub = cart.reduce(
      (sum, item) => sum + item.selling_price * item.qty * (1 - item.discount_percent / 100),
      0
    );
    const vat = cart.reduce((sum, item) => {
      const itemTotal = item.selling_price * item.qty * (1 - item.discount_percent / 100);
      return sum + (itemTotal * item.vat_rate) / (100 + item.vat_rate);
    }, 0);
    return { subtotal: sub - vat, vatTotal: vat, total: sub };
  }, [cart]);

  const handlePayment = async (paymentType: "cash" | "card") => {
    try {
      if (!currentShift) {
        toast.error("Open a shift before issuing receipts.");
        setShowPayment(false);
        return;
      }

      const receipt = await createReceipt.mutateAsync({
        cart,
        paymentType,
        shiftId: currentShift.id,
      });
      setLastReceipt(receipt);
      setShowPayment(false);
      setCart([]);
      toast.success("Sale completed successfully!");
    } catch (error) {
      toast.error("Failed to process payment");
    }
  };

  if (loadingShift) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading shift status...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {!currentShift && (
        <div className="absolute left-0 right-0 top-0 z-20 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div>
              <p className="font-medium">Smjena nije otvorena</p>
              <p className="text-amber-800">
                Možete pregledati artikle i pripremiti košaricu, ali izdavanje računa je zaključano dok ne otvorite smjenu.
              </p>
            </div>
            <NavLink to="/pos/shifts">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                Otvori smjenu
              </Button>
            </NavLink>
          </div>
        </div>
      )}
      {/* Left Panel - Products */}
      <div className="flex flex-1 flex-col border-r">
        {/* Header */}
        <div className="flex h-14 items-center gap-4 border-b bg-card px-4">
          <NavLink to="/pos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </NavLink>
          <h1 className="text-lg font-semibold">Classic POS</h1>
          <span className="text-sm text-muted-foreground">Klasična blagajna</span>
        </div>

        {/* Search */}
        <div className="border-b bg-card p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products or scan barcode..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowScanner(true)}
              disabled={shiftLocked}
            >
              <Barcode className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Search className="mb-2 h-12 w-12" />
              <p>No products found</p>
              {searchQuery && (
                <Button variant="link" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={shiftLocked}
                  className="flex flex-col items-center justify-center rounded-xl border-2 bg-card p-4 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-95 disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted-foreground disabled:hover:border-muted"
                >
                  <span className="text-xs text-muted-foreground">{product.code}</span>
                  <span className="mt-1 line-clamp-2 px-2 text-sm font-medium">
                    {product.name}
                  </span>
                  <span className="mt-1 text-lg font-bold text-primary">
                    {product.selling_price.toFixed(2)} KM
                  </span>
                  {product.vat_rate > 0 && (
                    <span className="text-xs text-muted-foreground">
                      PDV {product.vat_rate}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="flex w-96 flex-col bg-card">
        {/* Cart Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <h2 className="font-semibold">Current Sale</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-destructive"
            disabled={cart.length === 0}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>No items in cart</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.selling_price.toFixed(2)} KM × {item.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQty(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQty(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="w-20 text-right font-medium">
                    {(item.selling_price * item.qty).toFixed(2)} KM
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="border-t bg-muted/30 p-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal (bez PDV)</span>
              <span>{subtotal.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PDV</span>
              <span>{vatTotal.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{total.toFixed(2)} KM</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12"
              disabled={cart.length === 0 || !currentShift}
              onClick={() => setShowPayment(true)}
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Cash
            </Button>
            <Button
              className="h-12"
              disabled={cart.length === 0 || !currentShift}
              onClick={() => setShowPayment(true)}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Card
            </Button>
          </div>
          {shiftLocked && (
            <p className="mt-2 text-xs text-amber-700">
              Otvorite smjenu kako biste omogućili naplatu i izdavanje računa.
            </p>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        cart={cart}
        total={total}
        onConfirm={handlePayment}
        isProcessing={createReceipt.isPending}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        open={!!lastReceipt}
        onClose={() => setLastReceipt(null)}
        receipt={lastReceipt}
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}
