import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Delete,
  Trash2,
  Loader2,
  Package,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { usePOSItems, useCreateReceipt, CartItem, POSItem } from "@/hooks/usePOS";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { toast } from "sonner";

// Define product categories based on VAT rates or other criteria
const categories = [
  { id: "all", name: "All Products", color: "bg-primary" },
  { id: "food", name: "Food", color: "bg-green-500" },
  { id: "drinks", name: "Drinks", color: "bg-blue-500" },
  { id: "other", name: "Other", color: "bg-purple-500" },
];

export default function TouchPOS() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [numpadValue, setNumpadValue] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const { data: items = [], isLoading } = usePOSItems("");
  const createReceipt = useCreateReceipt();

  // Filter items by category (based on name patterns for demo)
  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items;
    
    return items.filter((item) => {
      const name = item.name.toLowerCase();
      if (activeCategory === "drinks") {
        return name.includes("cola") || name.includes("fanta") || name.includes("sprite") || 
               name.includes("voda") || name.includes("sok") || name.includes("mlijeko") ||
               name.includes("čaj") || name.includes("kafa");
      }
      if (activeCategory === "food") {
        return name.includes("kruh") || name.includes("brašno") || name.includes("jaja") ||
               name.includes("šećer") || name.includes("ulje") || name.includes("čips") ||
               name.includes("čokolada");
      }
      return true;
    });
  }, [items, activeCategory]);

  const addToCart = (product: POSItem) => {
    const qty = numpadValue ? parseInt(numpadValue) : 1;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, { ...product, qty, discount_percent: 0 }];
    });
    setNumpadValue("");
  };

  const clearCart = () => {
    setCart([]);
    setNumpadValue("");
  };

  const handleNumpad = (value: string) => {
    if (value === "C") {
      setNumpadValue("");
    } else if (value === "DEL") {
      setNumpadValue((prev) => prev.slice(0, -1));
    } else {
      setNumpadValue((prev) => (prev + value).slice(0, 3));
    }
  };

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
      const receipt = await createReceipt.mutateAsync({
        cart,
        paymentType,
      });
      setLastReceipt(receipt);
      setShowPayment(false);
      setCart([]);
      toast.success("Sale completed successfully!");
    } catch (error) {
      toast.error("Failed to process payment");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left - Categories & Products */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex h-16 items-center gap-4 border-b bg-card px-4">
          <NavLink to="/pos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </NavLink>
          <h1 className="text-xl font-bold">Touch POS</h1>
          <span className="text-muted-foreground">Touch screen blagajna</span>
        </div>

        {/* Categories */}
        <div className="flex gap-2 border-b bg-card p-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-1 rounded-lg py-4 text-lg font-semibold text-white transition-all",
                cat.color,
                activeCategory === cat.id ? "ring-4 ring-primary ring-offset-2" : "opacity-70"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Package className="mb-2 h-16 w-16" />
              <p className="text-lg">No products in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-4">
              {filteredItems.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex h-24 flex-col items-center justify-center rounded-xl border-2 bg-card text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-95"
                >
                  <span className="line-clamp-2 px-2 text-lg font-semibold">{product.name}</span>
                  <span className="mt-1 text-xl font-bold text-primary">
                    {product.selling_price.toFixed(2)} KM
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right - Cart & Numpad */}
      <div className="flex w-80 flex-col border-l bg-card lg:w-96">
        {/* Cart Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <h2 className="text-lg font-semibold">Cart</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-destructive"
            disabled={cart.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>Empty cart</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.qty} × {item.selling_price.toFixed(2)} KM
                    </p>
                  </div>
                  <p className="text-lg font-bold">
                    {(item.selling_price * item.qty).toFixed(2)} KM
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Numpad */}
        <div className="border-t p-3">
          <div className="mb-3 flex h-12 items-center justify-center rounded-lg bg-muted text-2xl font-bold">
            {numpadValue || "Qty"}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "DEL"].map((key) => (
              <button
                key={key}
                onClick={() => handleNumpad(key)}
                className={cn(
                  "flex h-12 items-center justify-center rounded-lg border-2 text-lg font-semibold transition-all active:scale-95",
                  key === "C" && "bg-warning/20 text-warning border-warning/30",
                  key === "DEL" && "bg-destructive/20 text-destructive border-destructive/30",
                  key !== "C" && key !== "DEL" && "bg-muted hover:bg-muted/80"
                )}
              >
                {key === "DEL" ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>
        </div>

        {/* Total & Payment */}
        <div className="border-t p-4">
          <div className="mb-2 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal (bez PDV)</span>
              <span>{subtotal.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>PDV</span>
              <span>{vatTotal.toFixed(2)} KM</span>
            </div>
          </div>
          <div className="mb-4 flex items-center justify-between text-2xl font-bold">
            <span>Total</span>
            <span className="text-primary">{total.toFixed(2)} KM</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-16 text-lg"
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              <DollarSign className="mr-2 h-6 w-6" />
              Cash
            </Button>
            <Button
              className="h-16 text-lg"
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              <CreditCard className="mr-2 h-6 w-6" />
              Card
            </Button>
          </div>
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
    </div>
  );
}
