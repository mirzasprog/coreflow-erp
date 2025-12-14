import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";
import {
  useDeductionTypes,
  useCreateDeductionType,
  useUpdateDeductionType,
  useDeleteDeductionType,
  DeductionType,
} from "@/hooks/useDeductionTypes";

export default function DeductionTypesList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<DeductionType | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    percentage: "",
    fixed_amount: "",
    is_mandatory: false,
    active: true,
  });

  const { data: deductionTypes, isLoading } = useDeductionTypes();
  const createMutation = useCreateDeductionType();
  const updateMutation = useUpdateDeductionType();
  const deleteMutation = useDeleteDeductionType();

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      percentage: "",
      fixed_amount: "",
      is_mandatory: false,
      active: true,
    });
    setSelectedDeduction(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (deduction: DeductionType) => {
    setSelectedDeduction(deduction);
    setFormData({
      code: deduction.code,
      name: deduction.name,
      percentage: deduction.percentage?.toString() || "",
      fixed_amount: deduction.fixed_amount?.toString() || "",
      is_mandatory: deduction.is_mandatory || false,
      active: deduction.active ?? true,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (deduction: DeductionType) => {
    setSelectedDeduction(deduction);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name) {
      toast.error("Please fill in code and name");
      return;
    }

    const payload = {
      code: formData.code,
      name: formData.name,
      percentage: formData.percentage ? parseFloat(formData.percentage) : null,
      fixed_amount: formData.fixed_amount ? parseFloat(formData.fixed_amount) : null,
      is_mandatory: formData.is_mandatory,
      active: formData.active,
    };

    try {
      if (selectedDeduction) {
        await updateMutation.mutateAsync({ id: selectedDeduction.id, ...payload });
        toast.success("Deduction type updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Deduction type created");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save deduction type");
    }
  };

  const handleDelete = async () => {
    if (!selectedDeduction) return;

    try {
      await deleteMutation.mutateAsync(selectedDeduction.id);
      toast.success("Deduction type deleted");
      setDeleteDialogOpen(false);
      setSelectedDeduction(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete deduction type");
    }
  };

  return (
    <div>
      <Header
        title="Deduction Types"
        subtitle="Vrste odbitaka • Tax Rates & Social Contributions"
      />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="module-card">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Percentage-based</p>
                <p className="text-2xl font-semibold">
                  {deductionTypes?.filter((d) => d.percentage && d.percentage > 0).length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="module-card">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fixed Amount</p>
                <p className="text-2xl font-semibold">
                  {deductionTypes?.filter((d) => d.fixed_amount && d.fixed_amount > 0).length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="module-card">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2">
                <span className="text-destructive font-bold text-lg">M</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mandatory</p>
                <p className="text-2xl font-semibold">
                  {deductionTypes?.filter((d) => d.is_mandatory).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="module-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Deduction Types List</h3>
              <p className="text-sm text-muted-foreground">
                Configure payroll deductions, taxes, and social contributions
              </p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Deduction Type
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading deduction types...
            </div>
          ) : !deductionTypes?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No deduction types configured yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Rate/Amount</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductionTypes.map((deduction) => (
                    <TableRow key={deduction.id}>
                      <TableCell className="font-mono">{deduction.code}</TableCell>
                      <TableCell className="font-medium">{deduction.name}</TableCell>
                      <TableCell>
                        {deduction.percentage && deduction.percentage > 0 ? (
                          <Badge variant="outline">
                            <Percent className="mr-1 h-3 w-3" />
                            Percentage
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <DollarSign className="mr-1 h-3 w-3" />
                            Fixed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {deduction.percentage && deduction.percentage > 0
                          ? `${deduction.percentage}%`
                          : deduction.fixed_amount
                          ? `${deduction.fixed_amount.toLocaleString()} KM`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {deduction.is_mandatory ? (
                          <Badge variant="destructive">Mandatory</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {deduction.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(deduction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(deduction)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDeduction ? "Edit Deduction Type" : "Add Deduction Type"}
            </DialogTitle>
            <DialogDescription>
              Configure deduction parameters for payroll calculations
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., TAX, PIO, ZDR"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Income Tax"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="percentage">Percentage (%)</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 10.00"
                  value={formData.percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, percentage: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixed_amount">Fixed Amount (KM)</Label>
                <Input
                  id="fixed_amount"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 50.00"
                  value={formData.fixed_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, fixed_amount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_mandatory"
                  checked={formData.is_mandatory}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_mandatory: checked })
                  }
                />
                <Label htmlFor="is_mandatory">Mandatory deduction</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedDeduction ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deduction Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDeduction?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
