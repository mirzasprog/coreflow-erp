import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { differenceInDays, format } from 'date-fns';

interface ExpiringLot {
  id: string;
  lot_number: string;
  expiry_date: string;
  quantity: number;
  item_id: string;
  location_id: string;
  items?: { code: string; name: string };
  locations?: { name: string };
  daysUntilExpiry: number;
}

export function useExpiryWarnings() {
  return useQuery({
    queryKey: ['expiry-warnings'],
    queryFn: async () => {
      const today = new Date();
      const in90Days = new Date(today);
      in90Days.setDate(in90Days.getDate() + 90);

      const { data, error } = await supabase
        .from('stock_lots')
        .select(`
          id,
          lot_number,
          expiry_date,
          quantity,
          item_id,
          location_id,
          items:item_id (code, name),
          locations:location_id (name)
        `)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', in90Days.toISOString().split('T')[0])
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      const lotsWithDays = (data || []).map(lot => ({
        ...lot,
        items: lot.items as { code: string; name: string } | null,
        locations: lot.locations as { name: string } | null,
        daysUntilExpiry: differenceInDays(new Date(lot.expiry_date!), today)
      }));

      return {
        expired: lotsWithDays.filter(l => l.daysUntilExpiry < 0),
        critical: lotsWithDays.filter(l => l.daysUntilExpiry >= 0 && l.daysUntilExpiry <= 30),
        warning: lotsWithDays.filter(l => l.daysUntilExpiry > 30 && l.daysUntilExpiry <= 60),
        notice: lotsWithDays.filter(l => l.daysUntilExpiry > 60 && l.daysUntilExpiry <= 90)
      };
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
}

export function ExpiryWarnings() {
  const { data, isLoading } = useExpiryWarnings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upozorenja na rokove
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Učitavanje...</div>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts = (data?.expired.length || 0) + (data?.critical.length || 0) + 
                      (data?.warning.length || 0) + (data?.notice.length || 0);

  if (totalAlerts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upozorenja na rokove
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Nema artikala s isteklim ili skorim rokom trajanja
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderLotItem = (lot: ExpiringLot, type: 'expired' | 'critical' | 'warning' | 'notice') => {
    const bgColor = {
      expired: 'bg-destructive/10 border-destructive/30',
      critical: 'bg-red-500/10 border-red-500/30',
      warning: 'bg-orange-500/10 border-orange-500/30',
      notice: 'bg-yellow-500/10 border-yellow-500/30'
    }[type];

    const textColor = {
      expired: 'text-destructive',
      critical: 'text-red-600',
      warning: 'text-orange-600',
      notice: 'text-yellow-600'
    }[type];

    const Icon = type === 'expired' ? XCircle : AlertTriangle;

    return (
      <div key={lot.id} className={`flex items-center justify-between p-3 rounded-lg border ${bgColor}`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${textColor}`} />
          <div>
            <p className="font-medium text-sm">
              {lot.items?.code} - {lot.items?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              LOT: {lot.lot_number} | {lot.locations?.name} | Kol: {lot.quantity}
            </p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant={type === 'expired' ? 'destructive' : 'secondary'} className={textColor}>
            {type === 'expired' 
              ? `Isteklo ${Math.abs(lot.daysUntilExpiry)} dana` 
              : `${lot.daysUntilExpiry} dana`
            }
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(lot.expiry_date), 'dd.MM.yyyy')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upozorenja na rokove
          </span>
          <div className="flex gap-2">
            {(data?.expired.length || 0) > 0 && (
              <Badge variant="destructive">{data?.expired.length} isteklo</Badge>
            )}
            {(data?.critical.length || 0) > 0 && (
              <Badge className="bg-red-500">{data?.critical.length} kritično</Badge>
            )}
            {(data?.warning.length || 0) > 0 && (
              <Badge className="bg-orange-500">{data?.warning.length} upozorenje</Badge>
            )}
            {(data?.notice.length || 0) > 0 && (
              <Badge className="bg-yellow-500">{data?.notice.length} obavijest</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {data?.expired.map(lot => renderLotItem(lot, 'expired'))}
            {data?.critical.map(lot => renderLotItem(lot, 'critical'))}
            {data?.warning.map(lot => renderLotItem(lot, 'warning'))}
            {data?.notice.map(lot => renderLotItem(lot, 'notice'))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
