import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/hooks/useFixedAssets";
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
} from "lucide-react";

export default function AssetView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: asset, isLoading } = useFixedAsset(id);
  const { data: depreciationRecords } = useDepreciationRecords(id);
  const createDepreciation = useCreateDepreciationRecord();
  const updateAsset = useUpdateFixedAsset();

  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depDate, setDepDate] = useState(format(new Date(), "yyyy-MM-dd"));

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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
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
          <Button onClick={() => navigate(`/assets/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Asset
          </Button>
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
        </div>

        {/* Depreciation History */}
        <div className="module-card mt-6">
          <h3 className="mb-4 text-lg font-semibold">Depreciation History</h3>

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
    </div>
  );
}
