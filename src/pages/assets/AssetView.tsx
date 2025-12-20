import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, differenceInCalendarDays } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useFixedAsset,
  useDepreciationRecords,
  useCreateDepreciationRecord,
  useUpdateFixedAsset,
  useAssetTransfers,
  useCreateAssetTransfer,
} from "@/hooks/useFixedAssets";
import { useLocations, useEmployees } from "@/hooks/useMasterData";
import { useHSERelatedDocuments } from "@/hooks/useHSE";
import {
  ArrowLeft,
  Edit,
  TrendingDown,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  ArrowRightLeft,
  ArrowRight,
  Shield,
  Flame,
  Link2,
  ClipboardCheck,
  FileText,
} from "lucide-react";

export default function AssetView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: asset, isLoading } = useFixedAsset(id);
  const { data: depreciationRecords } = useDepreciationRecords(id);
  const { data: transfers } = useAssetTransfers(id);
  const { data: locations } = useLocations();
  const { data: employees } = useEmployees();
  const { data: hseRelated, isLoading: isHseRelatedLoading } = useHSERelatedDocuments(id);
  const safetyDevice = hseRelated?.device || null;
  const relatedInspections = hseRelated?.inspections || [];

  const createDepreciation = useCreateDepreciationRecord();
  const updateAsset = useUpdateFixedAsset();
  const createTransfer = useCreateAssetTransfer();

  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depDate, setDepDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [toLocationId, setToLocationId] = useState("");
  const [toCustodianId, setToCustodianId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  if (isLoading) {
    return (
      <div>
        <Header title="Loading..." />
        <div className="p-6">Loading asset details...</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div>
        <Header title="Not Found" />
        <div className="p-6">Asset not found.</div>
      </div>
    );
  }

  const accumulatedDepreciation =
    Number(asset.purchase_value || 0) - Number(asset.current_value || 0);

  const handleAddDepreciation = async () => {
    if (!depAmount || Number(depAmount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    try {
      const amount = Number(depAmount);
      const newCurrentValue = Math.max(0, Number(asset.current_value || 0) - amount);

      await createDepreciation.mutateAsync({
        asset_id: asset.id,
        period_date: depDate,
        amount,
      });

      await updateAsset.mutateAsync({
        id: asset.id,
        current_value: newCurrentValue,
      });

      toast({ title: "Depreciation recorded successfully" });
      setShowDepreciationModal(false);
      setDepAmount("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleTransfer = async () => {
    if (!toLocationId && !toCustodianId) {
      toast({ title: "Select a new location or custodian", variant: "destructive" });
      return;
    }

    try {
      // Create transfer record
      await createTransfer.mutateAsync({
        asset_id: asset.id,
        from_location_id: asset.location_id,
        to_location_id: toLocationId || null,
        from_custodian_id: asset.custodian_id,
        to_custodian_id: toCustodianId || null,
        transfer_date: transferDate,
        reason: transferReason || undefined,
        notes: transferNotes || undefined,
      });

      // Update asset with new location/custodian
      await updateAsset.mutateAsync({
        id: asset.id,
        location_id: toLocationId || asset.location_id,
        custodian_id: toCustodianId || asset.custodian_id,
      });

      toast({ title: "Asset transferred successfully" });
      setShowTransferModal(false);
      resetTransferForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const resetTransferForm = () => {
    setToLocationId("");
    setToCustodianId("");
    setTransferReason("");
    setTransferNotes("");
    setTransferDate(format(new Date(), "yyyy-MM-dd"));
  };

  const statusVariant =
    asset.status === "active" ? "default" : asset.status === "sold" ? "secondary" : "outline";

  return (
    <div>
      <Header title={asset.name} subtitle={`${asset.asset_code} • Asset Details`} />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/assets")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTransferModal(true)}
              disabled={asset.status !== "active"}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer
            </Button>
            <Button onClick={() => navigate(`/assets/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Asset
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Asset Details */}
          <div className="module-card lg:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">Asset Information</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Value</p>
                  <p className="font-medium">€{Number(asset.purchase_value || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-success/10 p-2">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="font-medium">€{Number(asset.current_value || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-warning/10 p-2">
                  <TrendingDown className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Accumulated Depreciation</p>
                  <p className="font-medium">€{accumulatedDepreciation.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Useful Life</p>
                  <p className="font-medium">{asset.useful_life_years} years ({asset.depreciation_method})</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{asset.locations?.name || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custodian</p>
                  <p className="font-medium">
                    {asset.employees
                      ? `${asset.employees.first_name} ${asset.employees.last_name}`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Date</p>
                  <p className="font-medium">
                    {asset.purchase_date
                      ? format(new Date(asset.purchase_date), "dd.MM.yyyy")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusVariant} className="mt-1">
                    {asset.status === "written_off" ? "Written Off" : asset.status}
                  </Badge>
                </div>
              </div>
            </div>

            {asset.notes && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-1">{asset.notes}</p>
              </div>
            )}
          </div>

          {/* Depreciation Summary */}
          <div className="module-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Depreciation</h3>
              <Button
                size="sm"
                onClick={() => setShowDepreciationModal(true)}
                disabled={asset.status === "written_off"}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Monthly Rate</p>
                <p className="text-lg font-semibold">
                  €{(Number(asset.purchase_value || 0) / (asset.useful_life_years || 5) / 12).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Annual Rate</p>
                <p className="text-lg font-semibold">
                  €{(Number(asset.purchase_value || 0) / (asset.useful_life_years || 5)).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Depreciation %</p>
                <p className="text-lg font-semibold">
                  {((accumulatedDepreciation / Number(asset.purchase_value || 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="module-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Safety & Inspections</h3>
              <Badge variant="outline" className="gap-2">
                <Shield className="h-4 w-4 text-module-hse" />
                HSE
              </Badge>
            </div>

            {safetyDevice ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-module-hse" />
                    <div>
                      <p className="font-medium">{safetyDevice.name || safetyDevice.device_code}</p>
                      <p className="text-sm text-muted-foreground">{safetyDevice.device_type}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    Interval: {safetyDevice.inspection_interval_months || "—"}m
                  </Badge>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Next inspection</p>
                      <p className="text-lg font-semibold">
                        {safetyDevice.next_inspection_date
                          ? format(new Date(safetyDevice.next_inspection_date), "dd.MM.yyyy")
                          : "Not scheduled"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Last:</p>
                      <p className="font-medium">
                        {safetyDevice.last_inspection_date
                          ? format(new Date(safetyDevice.last_inspection_date), "dd.MM.yyyy")
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {safetyDevice.next_inspection_date && (
                    <p
                      className={`mt-2 text-sm ${
                        differenceInCalendarDays(new Date(safetyDevice.next_inspection_date), new Date()) < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {differenceInCalendarDays(new Date(safetyDevice.next_inspection_date), new Date()) < 0
                        ? "Inspection overdue"
                        : `Due in ${differenceInCalendarDays(new Date(safetyDevice.next_inspection_date), new Date())} days`}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
                No safety device linked. Enable safety tracking in asset form.
              </div>
            )}
          </div>

          <div className="module-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Related documents</h3>
              <Badge variant="outline" className="gap-2">
                <Link2 className="h-4 w-4 text-module-hse" />
                HSE
              </Badge>
            </div>

            {isHseRelatedLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading related documents...</div>
            ) : safetyDevice || relatedInspections.length ? (
              <div className="space-y-3">
                {safetyDevice && (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Flame className="h-4 w-4 text-module-hse" />
                    <div>
                      <p className="text-sm font-medium">Safety device</p>
                      <p className="text-xs text-muted-foreground">
                        {safetyDevice.name || safetyDevice.device_code}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {safetyDevice.device_type || "Device"}
                    </Badge>
                  </div>
                )}

                {relatedInspections.length > 0 ? (
                  <div className="space-y-2">
                    {relatedInspections.slice(0, 3).map((inspection) => (
                      <div key={inspection.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                        <ClipboardCheck className="h-4 w-4 text-module-hse" />
                        <div className="min-w-[160px]">
                          <p className="text-sm font-medium">
                            {inspection.inspection_date
                              ? format(new Date(inspection.inspection_date), "dd.MM.yyyy")
                              : "Inspection"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {inspection.inspector_name || "Inspection record"}
                          </p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          {inspection.attachment_url && (
                            <a
                              href={inspection.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-primary"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Attachment
                            </a>
                          )}
                          {inspection.passed === false ? (
                            <Badge className="bg-destructive/20 text-destructive">Failed</Badge>
                          ) : inspection.passed === true ? (
                            <Badge className="bg-success/20 text-success">Passed</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {relatedInspections.length > 3 && (
                      <Button variant="outline" size="sm" onClick={() => navigate("/hse/inspections")}>
                        View all inspections
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No inspections recorded yet.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No related documents yet.</p>
            )}
          </div>
        </div>

        {/* History Tabs */}
        <div className="module-card mt-6">
          <Tabs defaultValue="depreciation">
            <TabsList>
              <TabsTrigger value="depreciation">Depreciation History</TabsTrigger>
              <TabsTrigger value="transfers">Transfer History</TabsTrigger>
            </TabsList>

            <TabsContent value="depreciation" className="mt-4">
              {depreciationRecords && depreciationRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depreciationRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.period_date), "MMMM yyyy")}</TableCell>
                        <TableCell className="text-right font-medium">
                          €{Number(record.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(record.created_at!), "dd.MM.yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No depreciation records yet.
                </p>
              )}
            </TabsContent>

            <TabsContent value="transfers" className="mt-4">
              {transfers && transfers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Custodian</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          {format(new Date(transfer.transfer_date), "dd.MM.yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {transfer.from_location?.name || "—"}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {transfer.to_location?.name || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {transfer.from_custodian
                                ? `${transfer.from_custodian.first_name} ${transfer.from_custodian.last_name}`
                                : "—"}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {transfer.to_custodian
                                ? `${transfer.to_custodian.first_name} ${transfer.to_custodian.last_name}`
                                : "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {transfer.reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No transfer history.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Depreciation Modal */}
      <Dialog open={showDepreciationModal} onOpenChange={setShowDepreciationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Depreciation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Period Date</Label>
              <Input
                type="date"
                value={depDate}
                onChange={(e) => setDepDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Suggested monthly: €
                {(Number(asset.purchase_value || 0) / (asset.useful_life_years || 5) / 12).toFixed(2)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepreciationModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDepreciation} disabled={createDepreciation.isPending}>
              Record Depreciation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={(open) => {
        setShowTransferModal(open);
        if (!open) resetTransferForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Transfer Date</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>New Location</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.filter(l => l.id !== asset.location_id).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current: {asset.locations?.name || "None"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>New Custodian</Label>
              <Select value={toCustodianId} onValueChange={setToCustodianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new custodian" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.filter(e => e.id !== asset.custodian_id).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current: {asset.employees ? `${asset.employees.first_name} ${asset.employees.last_name}` : "None"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                placeholder="e.g., Relocation, Department change"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={createTransfer.isPending}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
