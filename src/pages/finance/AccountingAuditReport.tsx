import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AccountingAuditReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-audit'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('erp_accounting_audit');
      if (error) throw error;
      return data;
    },
  });
  return <div><Header title="Kontrola knjiženja" subtitle="Postojeće neuravnotežene temeljnice i sumnjiva kontiranja" />
    <div className="space-y-6 p-6">
      <NavLink to="/finance" className="inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="mr-2 h-4 w-4" />Financije</NavLink>
      <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Pregled prije korekcije</AlertTitle><AlertDescription>Ovo je samo izvještaj. Povijesni dokumenti nisu automatski izmijenjeni.</AlertDescription></Alert>
      <Card><CardHeader><CardTitle>Nalazi ({data?.length || 0})</CardTitle></CardHeader><CardContent>
        {isLoading ? <p>Učitavanje…</p> : error ? <p className="text-destructive">{error.message}</p> : <Table><TableHeader><TableRow><TableHead>Temeljnica</TableHead><TableHead>Izvor</TableHead><TableHead className="text-right">Duguje</TableHead><TableHead className="text-right">Potražuje</TableHead><TableHead>Nalaz</TableHead></TableRow></TableHeader><TableBody>
          {data?.map((row) => <TableRow key={row.entry_id}><TableCell><NavLink className="text-primary" to={`/finance/gl-entries/${row.entry_id}`}>{row.document_number}</NavLink></TableCell><TableCell>{row.reference_type || 'Ručno'}</TableCell><TableCell className="text-right">{Number(row.debit).toFixed(2)}</TableCell><TableCell className="text-right">{Number(row.credit).toFixed(2)}</TableCell><TableCell><Badge variant="destructive">{row.finding}</Badge></TableCell></TableRow>)}
          {!data?.length && <TableRow><TableCell colSpan={5}>Nema pronađenih nepravilnosti.</TableCell></TableRow>}
        </TableBody></Table>}
      </CardContent></Card>
    </div>
  </div>;
}
