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

  const addLine = () => {
    if (!newLine.account_id) {
      toast.error('Please select an account');
      return;
    }
    if ((newLine.debit || 0) === 0 && (newLine.credit || 0) === 0) {
      toast.error('Please enter a debit or credit amount');
      return;
    }
    if ((newLine.debit || 0) > 0 && (newLine.credit || 0) > 0) {
      toast.error('A line cannot have both debit and credit');
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
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    return { totalDebit, totalCredit, isBalanced };
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
                <Label htmlFor="entry_date">Entry Date</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  disabled={isPosted}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_type">Reference Type</Label>
                <Select
                  value={formData.reference_type}
                  onValueChange={(value) => setFormData({ ...formData, reference_type: value })}
                  disabled={isPosted}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="depreciation">Depreciation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isPosted}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Debit:</span>
                  <span className="font-medium">€{totals.totalDebit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Credit:</span>
                  <span className="font-medium">€{totals.totalCredit.toFixed(2)}</span>
                </div>
                <div className={`flex items-center justify-between border-t pt-2 ${totals.isBalanced ? 'text-success' : 'text-destructive'}`}>
                  <span className="font-medium flex items-center gap-1">
                    {!totals.isBalanced && <AlertTriangle className="h-4 w-4" />}
                    Difference:
                  </span>
                  <span className="font-bold">
                    €{Math.abs(totals.totalDebit - totals.totalCredit).toFixed(2)}
                  </span>
                </div>
              </div>
              {!isPosted && (
                <div className="mt-4 space-y-2">
                  <Button className="w-full" onClick={() => handleSave(false)} disabled={createEntry.isPending || updateEntry.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="default" 
                    onClick={() => handleSave(true)} 
                    disabled={createEntry.isPending || updateEntry.isPending || postEntry.isPending || !totals.isBalanced}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save & Post
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Entry Lines</CardTitle>
          </CardHeader>
          <CardContent>
            {!isPosted && (
              <div className="mb-4 flex gap-2 flex-wrap">
                <Select
                  value={newLine.account_id || ''}
                  onValueChange={(value) => setNewLine({ ...newLine, account_id: value })}
                >
                  <SelectTrigger className="w-64">
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
                <Input
                  type="number"
                  placeholder="Debit"
                  className="w-28"
                  value={newLine.debit || ''}
                  onChange={(e) => setNewLine({ ...newLine, debit: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  type="number"
                  placeholder="Credit"
                  className="w-28"
                  value={newLine.credit || ''}
                  onChange={(e) => setNewLine({ ...newLine, credit: parseFloat(e.target.value) || 0 })}
                />
                <Select
                  value={newLine.partner_id || ''}
                  onValueChange={(value) => setNewLine({ ...newLine, partner_id: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Partner (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  {!isPosted && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isPosted ? 4 : 5} className="py-8 text-center text-muted-foreground">
                      No lines added
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {line.accounts?.code} - {line.accounts?.name}
                      </TableCell>
                      <TableCell>{line.partners?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {line.debit > 0 ? `€${line.debit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit > 0 ? `€${line.credit.toFixed(2)}` : '-'}
                      </TableCell>
                      {!isPosted && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeLine(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
