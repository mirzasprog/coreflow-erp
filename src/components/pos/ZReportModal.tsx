import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, CheckCircle } from "lucide-react";

interface ZReportData {
  shiftId: string;
  startTime: string;
  endTime: string;
  openingAmount: number;
  closingAmount: number;
  cashSales: number;
  cardSales: number;
  totalSales: number;
  totalVat: number;
  netSales: number;
  transactionCount: number;
  expectedCash: number;
  cashDifference: number;
  glDocumentNumber: string | null;
  zReportNumber?: string;
  fiscalNumber?: string;
}

interface ZReportModalProps {
  open: boolean;
  onClose: () => void;
  data: ZReportData | null;
}

export function ZReportModal({ open, onClose, data }: ZReportModalProps) {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md print:shadow-none print:border-none">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <FileText className="h-5 w-5" />
            Z-IZVJEŠTAJ / Z-REPORT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4" id="z-report-content">
          {/* Header */}
          <div className="text-center border-b pb-4">
            {data.zReportNumber && (
              <p className="font-semibold">Z-Report: {data.zReportNumber}</p>
            )}
            {data.fiscalNumber && (
              <p className="text-sm text-success flex items-center justify-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Fiskalni br: {data.fiscalNumber}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Smjena / Shift: {format(new Date(data.startTime), "dd.MM.yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(data.startTime), "HH:mm")} - {format(new Date(data.endTime), "HH:mm")}
            </p>
          </div>

          {/* Opening & Closing */}
          <div className="space-y-2 border-b pb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Početno stanje / Opening:</span>
              <span>{data.openingAmount.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Završno stanje / Closing:</span>
              <span>{data.closingAmount.toFixed(2)} KM</span>
            </div>
          </div>

          {/* Sales Summary */}
          <div className="space-y-2 border-b pb-4">
            <h4 className="font-medium text-sm">Prodaja / Sales</h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gotovina / Cash:</span>
              <span>{data.cashSales.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kartica / Card:</span>
              <span>{data.cardSales.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t">
              <span>Ukupno / Total:</span>
              <span>{data.totalSales.toFixed(2)} KM</span>
            </div>
          </div>

          {/* Tax Summary */}
          <div className="space-y-2 border-b pb-4">
            <h4 className="font-medium text-sm">Porezi / Taxes</h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Neto prodaja / Net Sales:</span>
              <span>{data.netSales.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PDV / VAT:</span>
              <span>{data.totalVat.toFixed(2)} KM</span>
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div className="space-y-2 border-b pb-4">
            <h4 className="font-medium text-sm">Gotovinska usklada / Cash Reconciliation</h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Očekivano / Expected:</span>
              <span>{data.expectedCash.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stvarno / Actual:</span>
              <span>{data.closingAmount.toFixed(2)} KM</span>
            </div>
            <div className={`flex justify-between text-sm font-medium pt-2 border-t ${
              data.cashDifference === 0 ? 'text-success' : 
              data.cashDifference > 0 ? 'text-warning' : 'text-destructive'
            }`}>
              <span>Razlika / Difference:</span>
              <span>{data.cashDifference > 0 ? '+' : ''}{data.cashDifference.toFixed(2)} KM</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Broj transakcija / Transactions:</span>
              <span>{data.transactionCount}</span>
            </div>
            {data.glDocumentNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GL dokument / GL Entry:</span>
                <span className="font-mono text-xs">{data.glDocumentNumber}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            <p>Dnevni obračun • Daily Settlement</p>
            <p>Generisano / Generated: {format(new Date(), "dd.MM.yyyy HH:mm:ss")}</p>
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
