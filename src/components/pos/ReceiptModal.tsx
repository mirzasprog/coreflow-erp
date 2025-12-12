import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, X, CheckCircle } from "lucide-react";
import { ReceiptData } from "@/hooks/usePOS";
import { format } from "date-fns";

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export function ReceiptModal({ open, onClose, receipt }: ReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Sale Complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receipt Preview */}
          <div className="rounded-lg border bg-card p-4 font-mono text-sm">
            <div className="text-center">
              <h3 className="text-lg font-bold">RECEIPT</h3>
              <p className="text-muted-foreground">Fiskalni račun</p>
              <Separator className="my-2" />
            </div>

            <div className="mb-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <span className="font-semibold">{receipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{format(new Date(receipt.receipt_date), "dd.MM.yyyy HH:mm")}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="uppercase">{receipt.payment_type}</span>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Items */}
            <div className="space-y-2">
              {receipt.items.map((item, index) => (
                <div key={index} className="text-xs">
                  <div className="flex justify-between">
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="ml-2 font-semibold">
                      {(item.selling_price * item.qty * (1 - item.discount_percent / 100)).toFixed(2)} KM
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {item.qty} x {item.selling_price.toFixed(2)} KM
                    {item.discount_percent > 0 && ` (-${item.discount_percent}%)`}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-2" />

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal (bez PDV):</span>
                <span>{receipt.subtotal.toFixed(2)} KM</span>
              </div>
              <div className="flex justify-between">
                <span>PDV:</span>
                <span>{receipt.vat_amount.toFixed(2)} KM</span>
              </div>
              {receipt.discount_amount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount:</span>
                  <span>-{receipt.discount_amount.toFixed(2)} KM</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-base font-bold">
                <span>TOTAL:</span>
                <span>{receipt.total.toFixed(2)} KM</span>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="text-center text-xs text-muted-foreground">
              <p>Hvala na kupovini!</p>
              <p>Thank you for your purchase!</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
            <Button className="flex-1" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
