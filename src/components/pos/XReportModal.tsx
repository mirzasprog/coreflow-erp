import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import type { XReportData } from "@/hooks/useFiscalization";

interface XReportModalProps {
  open: boolean;
  onClose: () => void;
  data: XReportData | null;
}

export function XReportModal({ open, onClose, data }: XReportModalProps) {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md print:shadow-none print:border-none">
        <DialogHeader>
          <DialogTitle className="text-center">
            X-IZVJEŠTAJ / X-REPORT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4" id="x-report-content">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <p className="text-sm text-muted-foreground">
              Izvještaj br. / Report #{data.reportNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(data.generatedAt), "dd.MM.yyyy HH:mm:ss")}
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Početno stanje / Opening:</span>
              <span className="font-medium">{data.openingAmount.toFixed(2)} KM</span>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gotovina / Cash:</span>
                <span>{data.currentCashSales.toFixed(2)} KM</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kartica / Card:</span>
                <span>{data.currentCardSales.toFixed(2)} KM</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>Ukupna prodaja / Total Sales:</span>
                <span>{data.currentTotalSales.toFixed(2)} KM</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PDV / VAT:</span>
                <span>{data.currentVatAmount.toFixed(2)} KM</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Broj transakcija / Transactions:</span>
                <span>{data.transactionCount}</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between font-semibold">
                <span>Očekivana gotovina / Expected Cash:</span>
                <span className="text-lg">{data.expectedCash.toFixed(2)} KM</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            <p>Presjek stanja • Interim Report</p>
            <p>Ovo nije fiskalni račun / This is not a fiscal receipt</p>
          </div>
        </div>

        <div className="flex gap-2 print:hidden">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Zatvori / Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Ispis / Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
