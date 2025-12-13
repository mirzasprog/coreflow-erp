import { useState } from 'react';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NavLink } from "@/components/NavLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Loader2, Eye, FileText, Download, Filter, Trash2 } from "lucide-react";
import { useGLEntries, useDeleteGLEntry, exportGLEntriesToCSV, GLEntryFilters } from "@/hooks/useGLEntries";
import { useAccounts, usePartners } from "@/hooks/useMasterData";
import { format } from "date-fns";

const REFERENCE_TYPES = [
  { value: 'invoice', label: 'Invoice / Faktura' },
  { value: 'payment', label: 'Payment / Uplata' },
  { value: 'depreciation', label: 'Depreciation / Amortizacija' },
  { value: 'pos_z_report', label: 'POS Z-Report' },
  { value: 'inventory', label: 'Inventory / Inventura' },
  { value: 'adjustment', label: 'Adjustment / Korekcija' },
  { value: 'other', label: 'Other / Ostalo' },
];

export default function GLEntryList() {
  const [filters, setFilters] = useState<GLEntryFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const { data: entries, isLoading } = useGLEntries(filters);
  const { data: accounts } = useAccounts();
  const { data: partners } = usePartners();
  const deleteEntry = useDeleteGLEntry();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <span className="badge-success">Posted</span>;
      case 'cancelled':
        return <span className="badge-danger">Cancelled</span>;
      default:
        return <span className="badge-warning">Draft</span>;
    }
  };

  const handleExport = () => {
    if (entries) {
      exportGLEntriesToCSV(entries);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      await deleteEntry.mutateAsync(id);
    }
  };

  return (
    <div>
      <Header title="General Ledger Entries" subtitle="Temeljnice • Journal entries" />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <NavLink to="/finance" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Finance
          </NavLink>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={!entries?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <NavLink to="/finance/gl-entries/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Button>
            </NavLink>
          </div>
        </div>

        {showFilters && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Filters
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select
                    value={filters.accountId || ''}
                    onValueChange={(value) => setFilters({ ...filters, accountId: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All accounts</SelectItem>
                      {accounts?.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select
                    value={filters.referenceType || ''}
                    onValueChange={(value) => setFilters({ ...filters, referenceType: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      {REFERENCE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status || ''}
                    onValueChange={(value) => setFilters({ ...filters, status: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="module-card">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!entries?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      No GL entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium font-mono">
                        {entry.document_number || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.entry_date), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                      <TableCell>
                        {REFERENCE_TYPES.find(t => t.value === entry.reference_type)?.label || entry.reference_type || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{(entry.total_debit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{(entry.total_credit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <NavLink to={`/finance/gl-entries/${entry.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </NavLink>
                          {entry.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(entry.id)}
                              disabled={deleteEntry.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
