import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { usePriceChangesHistory } from '@/hooks/usePriceManagement';
import { format } from 'date-fns';

const changeTypeLabels: Record<string, string> = {
  manual: 'Ručno',
  promo: 'Promocija',
  import: 'Import',
  ai_suggested: 'AI Sugestija'
};

export default function PriceHistoryPage() {
  const { data: history, isLoading } = usePriceChangesHistory();

  return (
    <div>
      <Header title="Historija Cijena" subtitle="Price Changes History" />
      <div className="p-6">
        <NavLink to="/pricing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Nazad
        </NavLink>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Promjene Cijena</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Učitavanje...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Artikal</TableHead>
                    <TableHead>Cjenik</TableHead>
                    <TableHead className="text-right">Stara cijena</TableHead>
                    <TableHead className="text-right">Nova cijena</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Razlog</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nema historije</TableCell></TableRow>
                  ) : (
                    history?.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell>{format(new Date(h.created_at), 'dd.MM.yyyy HH:mm')}</TableCell>
                        <TableCell>{h.items?.code} - {h.items?.name}</TableCell>
                        <TableCell>{h.price_lists?.name || '-'}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{(h.old_price || 0).toFixed(2)} KM</TableCell>
                        <TableCell className="text-right font-medium">{h.new_price.toFixed(2)} KM</TableCell>
                        <TableCell><Badge variant="outline">{changeTypeLabels[h.change_type] || h.change_type}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate">{h.change_reason || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}