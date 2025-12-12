import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, DollarSign, Loader2 } from "lucide-react";
import { CartItem } from "@/hooks/usePOS";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  onConfirm: (paymentType: "cash" | "card") => void;
  isProcessing: boolean;
}

export function PaymentModal({
  open,
  onClose,
  cart,
  total,
  onConfirm,
  isProcessing,
}: PaymentModalProps) {
  const [paymentType, setPaymentType] = useState<"cash" | "card">("cash");
  const [cashReceived, setCashReceived] = useState<string>("");

  const cashAmount = parseFloat(cashReceived) || 0;
  const change = cashAmount - total;

  const canComplete = paymentType === "card" || (paymentType === "cash" && cashAmount >= total);

  const handleConfirm = () => {
    onConfirm(paymentType);
  };

  const quickCashAmounts = [
    Math.ceil(total),
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
    Math.ceil(total / 50) * 50,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= total).slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total */}
          <div className="rounded-lg bg-primary/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-3xl font-bold text-primary">{total.toFixed(2)} KM</p>
            <p className="text-xs text-muted-foreground">{cart.length} items</p>
          </div>

          {/* Payment Type */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={paymentType === "cash" ? "default" : "outline"}
              className="h-16"
              onClick={() => setPaymentType("cash")}
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Cash
            </Button>
            <Button
              variant={paymentType === "card" ? "default" : "outline"}
              className="h-16"
              onClick={() => setPaymentType("card")}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Card
            </Button>
          </div>

          {/* Cash Input */}
          {paymentType === "cash" && (
            <div className="space-y-3">
              <div>
                <Label>Cash Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount..."
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="mt-1 text-lg"
                  autoFocus
                />
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {quickCashAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setCashReceived(amount.toString())}
                  >
                    {amount.toFixed(2)} KM
                  </Button>
                ))}
              </div>

              {/* Change */}
              {cashAmount >= total && (
                <div className="rounded-lg bg-success/10 p-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Change:</span>
                    <span className="text-success">{change.toFixed(2)} KM</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentType === "card" && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <CreditCard className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Process card payment on terminal
              </p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!canComplete || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Complete Sale`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
