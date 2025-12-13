import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  Account,
} from "@/hooks/useAccounts";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  FolderTree,
  Building2,
} from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset (Imovina)" },
  { value: "liability", label: "Liability (Obveze)" },
  { value: "equity", label: "Equity (Kapital)" },
  { value: "revenue", label: "Revenue (Prihodi)" },
  { value: "expense", label: "Expense (Rashodi)" },
];

interface AccountFormData {
  code: string;
  name: string;
  account_type: string;
  active: boolean;
  parent_id: string | null;
}

const emptyFormData: AccountFormData = {
  code: "",
  name: "",
  account_type: "",
  active: true,
  parent_id: null,
};

export default function ChartOfAccounts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>(emptyFormData);

  const { data: accounts = [], isLoading } = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  const filteredAccounts = accounts.filter(
    (account) =>
      account.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build hierarchy for display
  const getAccountHierarchy = (parentId: string | null, level: number = 0): (Account & { level: number })[] => {
    const children = filteredAccounts
      .filter((a) => a.parent_id === parentId)
      .sort((a, b) => a.code.localeCompare(b.code));
    
    return children.flatMap((account) => [
      { ...account, level },
      ...getAccountHierarchy(account.id, level + 1),
    ]);
  };

  const hierarchicalAccounts = searchQuery 
    ? filteredAccounts.map(a => ({ ...a, level: 0 }))
    : getAccountHierarchy(null);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormData(emptyFormData);
    setShowDialog(true);
  };

  const handleOpenEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      account_type: account.account_type || "",
      active: account.active ?? true,
      parent_id: account.parent_id,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editingAccount) {
      updateMutation.mutate(
        { id: editingAccount.id, ...formData },
        { onSuccess: () => setShowDialog(false) }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setShowDialog(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteAccountId) {
      deleteMutation.mutate(deleteAccountId, {
        onSuccess: () => setDeleteAccountId(null),
      });
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = accounts.find((a) => a.id === parentId);
    return parent ? `${parent.code} - ${parent.name}` : "-";
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <Header
        title="Chart of Accounts"
        subtitle="Kontni plan • Account Structure"
      />

      <div className="p-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>

        {/* Accounts Table */}
        <div className="module-card">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : hierarchicalAccounts.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <FolderTree className="mb-2 h-12 w-12" />
              <p>No accounts found</p>
              <p className="text-sm">Create your first account to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Parent</th>
                    <th>Status</th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {hierarchicalAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <div
                          className="flex items-center gap-2 font-mono font-medium"
                          style={{ paddingLeft: `${account.level * 1.5}rem` }}
                        >
                          {account.level > 0 && (
                            <span className="text-muted-foreground">└</span>
                          )}
                          {account.code}
                        </div>
                      </td>
                      <td>{account.name}</td>
                      <td>
                        {account.account_type ? (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                            {account.account_type}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-muted-foreground">
                        {getParentName(account.parent_id)}
                      </td>
                      <td>
                        {account.active ? (
                          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteAccountId(account.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "New Account"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? "Update account details"
                : "Add a new account to your chart of accounts"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Account Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., 1000"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Account Type</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, account_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Cash in Bank"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Account</Label>
              <Select
                value={formData.parent_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parent_id: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top level)</SelectItem>
                  {accounts
                    .filter((a) => a.id !== editingAccount?.id)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.code || !formData.name || isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAccount ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteAccountId}
        onOpenChange={() => setDeleteAccountId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account? This action cannot
              be undone. Accounts with GL entries cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
