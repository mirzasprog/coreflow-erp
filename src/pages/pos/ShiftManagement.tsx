import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCurrentShift,
  useOpenShift,
  useCloseShift,
  usePOSShifts,
  useShiftSummary,
  usePOSTerminals,
} from "@/hooks/usePOS";
import { useGenerateXReport, type XReportData } from "@/hooks/useFiscalization";
import { XReportModal } from "@/components/pos/XReportModal";
import { ZReportModal } from "@/components/pos/ZReportModal";
import { format } from "date-fns";
import {
  Loader2,
  PlayCircle,
  StopCircle,
  Clock,
  DollarSign,
  CreditCard,
  Receipt,
  ArrowDownCircle,
  FileText,
  Calendar,
  FileBarChart,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ShiftManagement() {
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<string>("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [viewShiftId, setViewShiftId] = useState<string | null>(null);
  const [xReportData, setXReportData] = useState<XReportData | null>(null);
  const [showXReport, setShowXReport] = useState(false);
  const [showZReport, setShowZReport] = useState(false);
  const [zReportData, setZReportData] = useState<any>(null);

  const { data: terminals = [] } = usePOSTerminals();
  const { data: currentShift, isLoading: loadingCurrent } = useCurrentShift();
  const { data: shifts = [], isLoading: loadingShifts } = usePOSShifts();
  const { data: shiftSummary } = useShiftSummary(viewShiftId || currentShift?.id);

  const openShiftMutation = useOpenShift();
  const closeShiftMutation = useCloseShift();
  const generateXReportMutation = useGenerateXReport();

  const handleOpenShift = () => {
    if (!selectedTerminal) return;
    openShiftMutation.mutate(
      {
        terminalId: selectedTerminal,
        openingAmount: parseFloat(openingAmount) || 0,
      },
      {
        onSuccess: () => {
          setOpenShiftDialog(false);
          setSelectedTerminal("");
          setOpeningAmount("");
        },
      }
    );
  };

  const handleGenerateXReport = () => {
    if (!currentShift) return;
    generateXReportMutation.mutate(currentShift.id, {
      onSuccess: (data) => {
        setXReportData(data);
        setShowXReport(true);
      },
    });
  };

  const handleCloseShift = () => {
    if (!currentShift || !shiftSummary) return;
    const closingAmt = parseFloat(closingAmount) || 0;
    
    closeShiftMutation.mutate(
      {
        shiftId: currentShift.id,
        closingAmount: closingAmt,
      },
      {
        onSuccess: (data) => {
          setCloseShiftDialog(false);
          setClosingAmount("");
          // Show Z-Report
          setZReportData({
            shiftId: currentShift.id,
            startTime: currentShift.start_time,
            endTime: new Date().toISOString(),
            openingAmount: currentShift.opening_amount || 0,
            closingAmount: closingAmt,
            cashSales: data.cashSales,
            cardSales: data.cardSales,
            totalSales: data.totalSales,
            totalVat: data.totalVat,
            netSales: data.totalSales - data.totalVat,
            transactionCount: shiftSummary.transactionCount || 0,
            expectedCash: (currentShift.opening_amount || 0) + data.cashSales,
            cashDifference: closingAmt - ((currentShift.opening_amount || 0) + data.cashSales),
            glDocumentNumber: data.documentNumber,
          });
          setShowZReport(true);
        },
      }
    );
  };

  const activeTerminalName = terminals.find(
    (t) => t.id === currentShift?.terminal_id
  )?.name;

  return (
    <div>
      <Header
        title="Shift Management"
        subtitle="Upravljanje smjenama • Z-Report"
      />

      <div className="p-6">
        {/* Current Shift Status */}
        <div className="mb-6">
          <div className="module-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Current Shift</h3>
                <p className="text-sm text-muted-foreground">Trenutna smjena</p>
              </div>

              {loadingCurrent ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : currentShift ? (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                    <span className="font-medium text-success">Active</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Terminal: <span className="font-medium text-foreground">{activeTerminalName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Started: <span className="font-medium text-foreground">
                      {format(new Date(currentShift.start_time), "dd.MM.yyyy HH:mm")}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleGenerateXReport}
                    disabled={generateXReportMutation.isPending}
                  >
                    {generateXReportMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileBarChart className="mr-2 h-4 w-4" />
                    )}
                    X-Report
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setCloseShiftDialog(true)}
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Close Shift
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">No active shift</span>
                  <Button onClick={() => setOpenShiftDialog(true)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Open Shift
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Shift Stats */}
        {currentShift && shiftSummary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Sales"
              value={`${(shiftSummary.totalSales || 0).toFixed(2)} KM`}
              change={`${shiftSummary.transactionCount || 0} transactions`}
              icon={Receipt}
              iconColor="bg-module-pos/10 text-module-pos"
            />
            <StatCard
              title="Cash Sales"
              value={`${(shiftSummary.cashSales || 0).toFixed(2)} KM`}
              change="Cash payments"
              icon={DollarSign}
              iconColor="bg-success/10 text-success"
            />
            <StatCard
              title="Card Sales"
              value={`${(shiftSummary.cardSales || 0).toFixed(2)} KM`}
              change="Card payments"
              icon={CreditCard}
              iconColor="bg-primary/10 text-primary"
            />
            <StatCard
              title="Opening Balance"
              value={`${(currentShift.opening_amount || 0).toFixed(2)} KM`}
              change="Initial cash"
              icon={ArrowDownCircle}
              iconColor="bg-info/10 text-info"
            />
          </div>
        )}

        {/* Shift History */}
        <div className="module-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Shift History</h3>
              <p className="text-sm text-muted-foreground">
                Povijest smjena • Z-Reports
              </p>
            </div>
          </div>

          {loadingShifts ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <Clock className="mb-2 h-12 w-12" />
              <p>No shift history</p>
              <p className="text-sm">Open a shift to start recording sales</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Terminal</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="text-right">Opening</th>
                    <th className="text-right">Cash Sales</th>
                    <th className="text-right">Card Sales</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Closing</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => {
                    const terminal = terminals.find(
                      (t) => t.id === shift.terminal_id
                    );
                    return (
                      <tr key={shift.id}>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(shift.start_time), "dd.MM.yyyy")}
                          </div>
                        </td>
                        <td>{terminal?.name || "-"}</td>
                        <td>{format(new Date(shift.start_time), "HH:mm")}</td>
                        <td>
                          {shift.end_time
                            ? format(new Date(shift.end_time), "HH:mm")
                            : "-"}
                        </td>
                        <td className="text-right">
                          {(shift.opening_amount || 0).toFixed(2)} KM
                        </td>
                        <td className="text-right">
                          {(shift.cash_sales || 0).toFixed(2)} KM
                        </td>
                        <td className="text-right">
                          {(shift.card_sales || 0).toFixed(2)} KM
                        </td>
                        <td className="text-right font-medium">
                          {(shift.total_sales || 0).toFixed(2)} KM
                        </td>
                        <td className="text-right">
                          {shift.closing_amount !== null
                            ? `${shift.closing_amount.toFixed(2)} KM`
                            : "-"}
                        </td>
                        <td>
                          {shift.status === "open" ? (
                            <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                              Open
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              Closed
                            </span>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewShiftId(shift.id)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Open Shift Dialog */}
      <Dialog open={openShiftDialog} onOpenChange={setOpenShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open New Shift</DialogTitle>
            <DialogDescription>
              Otvaranje nove smjene • Start a new POS shift
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Terminal</Label>
              <Select
                value={selectedTerminal}
                onValueChange={setSelectedTerminal}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select terminal" />
                </SelectTrigger>
                <SelectContent>
                  {terminals.map((terminal) => (
                    <SelectItem key={terminal.id} value={terminal.id}>
                      {terminal.name} ({terminal.terminal_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Opening Amount (KM)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Initial cash in drawer
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenShiftDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOpenShift}
              disabled={!selectedTerminal || openShiftMutation.isPending}
            >
              {openShiftMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Open Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeShiftDialog} onOpenChange={setCloseShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift (Z-Report)</DialogTitle>
            <DialogDescription>
              Zatvaranje smjene • End current shift and generate Z-report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {shiftSummary && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sales:</span>
                  <span className="font-medium">
                    {(shiftSummary.totalSales || 0).toFixed(2)} KM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Sales:</span>
                  <span>{(shiftSummary.cashSales || 0).toFixed(2)} KM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card Sales:</span>
                  <span>{(shiftSummary.cardSales || 0).toFixed(2)} KM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span>{shiftSummary.transactionCount || 0}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">
                    Expected Cash:
                  </span>
                  <span className="font-medium">
                    {(
                      (currentShift?.opening_amount || 0) +
                      (shiftSummary.cashSales || 0)
                    ).toFixed(2)}{" "}
                    KM
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Closing Amount (KM)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Actual cash count in drawer
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseShiftDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseShift}
              disabled={closeShiftMutation.isPending}
            >
              {closeShiftMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Close Shift & Generate Z-Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Z-Report Dialog */}
      <Dialog
        open={!!viewShiftId && viewShiftId !== currentShift?.id}
        onOpenChange={() => setViewShiftId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Z-Report</DialogTitle>
            <DialogDescription>Shift summary report</DialogDescription>
          </DialogHeader>
          {shiftSummary && (
            <div className="space-y-4 py-4">
              <div className="text-center border-b pb-4">
                <h4 className="font-semibold">POS Z-REPORT</h4>
                <p className="text-sm text-muted-foreground">
                  {viewShiftId &&
                    shifts.find((s) => s.id === viewShiftId) &&
                    format(
                      new Date(
                        shifts.find((s) => s.id === viewShiftId)!.start_time
                      ),
                      "dd.MM.yyyy"
                    )}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Opening Amount:</span>
                  <span>{(shiftSummary.openingAmount || 0).toFixed(2)} KM</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>{(shiftSummary.cashSales || 0).toFixed(2)} KM</span>
                </div>
                <div className="flex justify-between">
                  <span>Card Sales:</span>
                  <span>{(shiftSummary.cardSales || 0).toFixed(2)} KM</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Total Sales:</span>
                  <span>{(shiftSummary.totalSales || 0).toFixed(2)} KM</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Count:</span>
                  <span>{shiftSummary.transactionCount || 0}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Expected Cash:</span>
                  <span>
                    {(
                      (shiftSummary.openingAmount || 0) +
                      (shiftSummary.cashSales || 0)
                    ).toFixed(2)}{" "}
                    KM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Closing Amount:</span>
                  <span>
                    {(shiftSummary.closingAmount || 0).toFixed(2)} KM
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Difference:</span>
                  <span
                    className={
                      (shiftSummary.closingAmount || 0) -
                        ((shiftSummary.openingAmount || 0) +
                          (shiftSummary.cashSales || 0)) ===
                      0
                        ? "text-success"
                        : "text-destructive"
                    }
                  >
                    {(
                      (shiftSummary.closingAmount || 0) -
                      ((shiftSummary.openingAmount || 0) +
                        (shiftSummary.cashSales || 0))
                    ).toFixed(2)}{" "}
                    KM
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewShiftId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* X-Report Modal */}
      <XReportModal
        open={showXReport}
        onClose={() => setShowXReport(false)}
        data={xReportData}
      />

      {/* Z-Report Modal */}
      <ZReportModal
        open={showZReport}
        onClose={() => setShowZReport(false)}
        data={zReportData}
      />
    </div>
  );
}
