import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Delete,
  Trash2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const categories = [
  { id: "drinks", name: "Drinks", color: "bg-blue-500" },
  { id: "food", name: "Food", color: "bg-green-500" },
  { id: "snacks", name: "Snacks", color: "bg-yellow-500" },
  { id: "other", name: "Other", color: "bg-purple-500" },
];

const products: Record<string, { id: string; name: string; price: number }[]> = {
  drinks: [
    { id: "d1", name: "Coffee", price: 2.50 },
    { id: "d2", name: "Tea", price: 2.00 },
    { id: "d3", name: "Cola", price: 2.50 },
    { id: "d4", name: "Water", price: 1.50 },
    { id: "d5", name: "Juice", price: 3.00 },
    { id: "d6", name: "Latte", price: 3.50 },
  ],
  food: [
    { id: "f1", name: "Sandwich", price: 5.50 },
    { id: "f2", name: "Salad", price: 6.00 },
    { id: "f3", name: "Soup", price: 4.50 },
    { id: "f4", name: "Pizza Slice", price: 3.50 },
    { id: "f5", name: "Burger", price: 7.00 },
    { id: "f6", name: "Hot Dog", price: 4.00 },
  ],
  snacks: [
    { id: "s1", name: "Chips", price: 1.50 },
    { id: "s2", name: "Chocolate", price: 2.00 },
    { id: "s3", name: "Cookies", price: 2.50 },
    { id: "s4", name: "Candy Bar", price: 1.80 },
    { id: "s5", name: "Nuts", price: 3.00 },
    { id: "s6", name: "Popcorn", price: 2.50 },
  ],
  other: [
    { id: "o1", name: "Newspaper", price: 2.00 },
    { id: "o2", name: "Magazine", price: 5.00 },
    { id: "o3", name: "Lottery", price: 2.00 },
    { id: "o4", name: "Phone Card", price: 10.00 },
  ],
};

export default function TouchPOS() {
  const [activeCategory, setActiveCategory] = useState("drinks");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [numpadValue, setNumpadValue] = useState("");

  const addToCart = (product: { id: string; name: string; price: number }) => {
    const qty = numpadValue ? parseInt(numpadValue) : 1;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, { ...product, qty }];
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

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

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
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-4">
            {products[activeCategory]?.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex h-24 flex-col items-center justify-center rounded-xl border-2 bg-card text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-95"
              >
                <span className="text-lg font-semibold">{product.name}</span>
                <span className="mt-1 text-xl font-bold text-primary">
                  €{product.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Cart & Numpad */}
      <div className="flex w-80 flex-col border-l bg-card lg:w-96">
        {/* Cart Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <h2 className="text-lg font-semibold">Cart</h2>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
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
                      {item.qty} × €{item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-lg font-bold">€{(item.price * item.qty).toFixed(2)}</p>
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
                  "touch-numpad-btn",
                  key === "C" && "bg-warning/20 text-warning",
                  key === "DEL" && "bg-destructive/20 text-destructive"
                )}
              >
                {key === "DEL" ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>
        </div>

        {/* Total & Payment */}
        <div className="border-t p-4">
          <div className="mb-4 flex items-center justify-between text-2xl font-bold">
            <span>Total</span>
            <span className="text-primary">€{total.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-16 text-lg"
              disabled={cart.length === 0}
            >
              <DollarSign className="mr-2 h-6 w-6" />
              Cash
            </Button>
            <Button className="h-16 text-lg" disabled={cart.length === 0}>
              <CreditCard className="mr-2 h-6 w-6" />
              Card
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
