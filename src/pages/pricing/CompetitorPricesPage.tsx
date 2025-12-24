import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useCompetitorPrices } from '@/hooks/usePriceManagement';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function CompetitorPricesPage() {
  const { data: prices, isLoading } = useCompetitorPrices();

  return (
    <div>
      <Header title="Cijene Konkurencije" subtitle="Competitor Price Tracking" />
      <div className="p-6">
        <NavLink to="/pricing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Nazad
        </NavLink>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Praćenje Cijena</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Učitavanje...</div>
            ) : prices?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Nema unesenih cijena konkurencije</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Artikal</TableHead>
                    <TableHead>Konkurent</TableHead>
                    <TableHead className="text-right">Cijena</TableHead>
                    <TableHead>Izvor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.observed_date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell>{p.items?.code} - {p.items?.name}</TableCell>
                      <TableCell>{p.competitor_name}</TableCell>
                      <TableCell className="text-right font-medium">{p.price.toFixed(2)} KM</TableCell>
                      <TableCell><Badge variant="outline">{p.source || 'manual'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}