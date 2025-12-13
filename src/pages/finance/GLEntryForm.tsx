import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAccounts, usePartners } from '@/hooks/useMasterData';
import {
  useGLEntry,
  useCreateGLEntry,
  useUpdateGLEntry,
  usePostGLEntry,
  GLEntryLine
} from '@/hooks/useGLEntries';
import { toast } from 'sonner';

const REFERENCE_TYPES = [
  { value: 'invoice', label: 'Invoice / Faktura' },
  { value: 'payment', label: 'Payment / Uplata' },
  { value: 'depreciation', label: 'Depreciation / Amortizacija' },
  { value: 'pos_z_report', label: 'POS Z-Report' },
  { value: 'inventory', label: 'Inventory / Inventura' },
  { value: 'adjustment', label: 'Adjustment / Korekcija' },
  { value: 'other', label: 'Other / Ostalo' },
];

export default function GLEntryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  
  const { data: accounts } = useAccounts();
  const { data: partners } = usePartners();
  const { data: existingEntry, isLoading: loadingEntry } = useGLEntry(isEdit ? id : undefined);
  
  const createEntry = useCreateGLEntry();
  const updateEntry = useUpdateGLEntry();
  const postEntry = usePostGLEntry();

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_type: '',
    reference_id: ''
  });

  const [lines, setLines] = useState<GLEntryLine[]>([]);
  const [newLine, setNewLine] = useState<Partial<GLEntryLine>>({
    account_id: '',
    debit: 0,
    credit: 0,
    description: '',
    partner_id: ''
  });

  useEffect(() => {
    if (existingEntry) {
      setFormData({
        entry_date: existingEntry.entry_date,
        description: existingEntry.description || '',
        reference_type: existingEntry.reference_type || '',
        reference_id: existingEntry.reference_id || ''
      });
      setLines(existingEntry.lines || []);
    }
  }, [existingEntry]);

  const handleDebitChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setNewLine({ 
      ...newLine, 
      debit: numValue,
      credit: numValue > 0 ? 0 : newLine.credit 
    });
  };

  const handleCreditChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setNewLine({ 
      ...newLine, 
      credit: numValue,
      debit: numValue > 0 ? 0 : newLine.debit 
    });
  };

  const addLine = () => {
    if (!newLine.account_id) {
      toast.error('Please select an account');
      return;
    }
    if ((newLine.debit || 0) === 0 && (newLine.credit || 0) === 0) {
      toast.error('Please enter a debit or credit amount');
      return;
    }

    const account = accounts?.find(a => a.id === newLine.account_id);
    const partner = partners?.find(p => p.id === newLine.partner_id);

    setLines([...lines, {
      account_id: newLine.account_id,
      debit: newLine.debit || 0,
      credit: newLine.credit || 0,
      description: newLine.description || null,
      partner_id: newLine.partner_id || null,
      accounts: account ? { code: account.code, name: account.name } : null,
      partners: partner ? { name: partner.name } : null
    }]);

    setNewLine({ account_id: '', debit: 0, credit: 0, description: '', partner_id: '' });
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01;
    return { totalDebit, totalCredit, difference, isBalanced };
  };

  const handleSave = async (shouldPost = false) => {
    if (lines.length === 0) {
      toast.error('Please add at least one line');
      return;
    }

    const { isBalanced } = calculateTotals();
    if (shouldPost && !isBalanced) {
      toast.error('Debits and credits must be equal to post');
      return;
    }

    const entry = {
      entry_date: formData.entry_date,
      description: formData.description || null,
      reference_type: formData.reference_type || null,
      reference_id: formData.reference_id || null,
      status: 'draft' as const
    };

    try {
      if (isEdit) {
        await updateEntry.mutateAsync({ id, entry, lines });
        if (shouldPost) {
          await postEntry.mutateAsync(id);
        }
      } else {
        const result = await createEntry.mutateAsync({ entry, lines });
        if (shouldPost && result?.id) {
          await postEntry.mutateAsync(result.id);
        }
      }
      navigate('/finance/gl-entries');
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (loadingEntry) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isPosted = existingEntry?.status === 'posted';
  const isCancelled = existingEntry?.status === 'cancelled';
  const isLocked = isPosted || isCancelled;
  const totals = calculateTotals();

  return (
    <div>
      <Header 
        title={isEdit ? 'Edit GL Entry' : 'New GL Entry'} 
        subtitle="Temeljnica • Journal entry" 
      />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/finance/gl-entries" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to GL Entries
          </NavLink>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Entry Header</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entry_date">Entry Date / Datum knjiženja</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_type">Document Type / Tip dokumenta</Label>
                <Select
                  value={formData.reference_type}
                  onValueChange={(value) => setFormData({ ...formData, reference_type: value })}
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description / Opis knjiženja</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLocked}
                  placeholder="Enter description..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary / Pregled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Debit:</span>
                  <span className="font-medium">€{totals.totalDebit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Credit:</span>
                  <span className="font-medium">€{totals.totalCredit.toFixed(2)}</span>
                </div>
                <div className={`flex items-center justify-between border-t pt-3 ${totals.isBalanced ? 'text-success' : 'text-destructive'}`}>
                  <span className="font-medium flex items-center gap-1">
                    {!totals.isBalanced && <AlertTriangle className="h-4 w-4" />}
                    Difference / Razlika:
                  </span>
                  <span className="font-bold">
                    €{totals.difference.toFixed(2)}
                  </span>
                </div>
                {!totals.isBalanced && (
                  <p className="text-xs text-destructive">
                    Entry must be balanced to post
                  </p>
                )}
              </div>
              {!isLocked && (
                <div className="mt-4 space-y-2">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleSave(false)} 
                    disabled={createEntry.isPending || updateEntry.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft / Spremi
                  </Button>
                  <Button 
                    className="w-full" 
                    onClick={() => handleSave(true)} 
                    disabled={createEntry.isPending || updateEntry.isPending || postEntry.isPending || !totals.isBalanced}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save & Post / Spremi i Proknjiži
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Entry Lines / Stavke</CardTitle>
          </CardHeader>
          <CardContent>
            {!isLocked && (
              <div className="mb-4 grid gap-2 sm:grid-cols-6 items-end">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Account / Konto</Label>
                  <Select
                    value={newLine.account_id || ''}
                    onValueChange={(value) => setNewLine({ ...newLine, account_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Debit / Duguje</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newLine.debit || ''}
                    onChange={(e) => handleDebitChange(e.target.value)}
                    disabled={(newLine.credit || 0) > 0}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Credit / Potražuje</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newLine.credit || ''}
                    onChange={(e) => handleCreditChange(e.target.value)}
                    disabled={(newLine.debit || 0) > 0}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Partner</Label>
                  <Select
                    value={newLine.partner_id || '__none__'}
                    onValueChange={(value) => setNewLine({ ...newLine, partner_id: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {partners?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account / Konto</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Debit / Duguje</TableHead>
                  <TableHead className="text-right">Credit / Potražuje</TableHead>
                  {!isLocked && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isLocked ? 4 : 5} className="py-8 text-center text-muted-foreground">
                      No lines added / Nema stavki
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {line.accounts?.code} - {line.accounts?.name}
                      </TableCell>
                      <TableCell>{line.partners?.name || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {line.debit > 0 ? `€${line.debit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {line.credit > 0 ? `€${line.credit.toFixed(2)}` : '-'}
                      </TableCell>
                      {!isLocked && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeLine(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
                {lines.length > 0 && (
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={2}>Total / Ukupno</TableCell>
                    <TableCell className="text-right font-mono">€{totals.totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">€{totals.totalCredit.toFixed(2)}</TableCell>
                    {!isLocked && <TableCell></TableCell>}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
