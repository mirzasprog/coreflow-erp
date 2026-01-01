import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FEFOLot {
  id: string;
  item_id: string;
  location_id: string;
  lot_number: string;
  expiry_date: string | null;
  production_date: string | null;
  quantity: number;
  reserved_quantity: number;
  bin_location: string | null;
  bin_zone: string | null;
  available_quantity: number;
  expiry_status: 'expired' | 'expiring' | 'ok';
  days_until_expiry: number | null;
}

// FEFO = First Expired, First Out
// FIFO = First In, First Out (by production date if no expiry)
export function useFEFOPicker(itemId: string | undefined, locationId: string | undefined, requiredQuantity: number = 0) {
  return useQuery({
    queryKey: ['fefo-picker', itemId, locationId, requiredQuantity],
    queryFn: async () => {
      if (!itemId || !locationId) return { lots: [], suggestion: [] };

      const { data: lots, error } = await supabase
        .from('stock_lots')
        .select('*')
        .eq('item_id', itemId)
        .eq('location_id', locationId)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })
        .order('production_date', { ascending: true, nullsFirst: true });

      if (error) throw error;

      const today = new Date();
      const warningDays = 30;

      const enrichedLots: FEFOLot[] = (lots || []).map(lot => {
        const available = lot.quantity - lot.reserved_quantity;
        let expiryStatus: 'expired' | 'expiring' | 'ok' = 'ok';
        let daysUntilExpiry: number | null = null;

        if (lot.expiry_date) {
          const expiryDate = new Date(lot.expiry_date);
          daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry < 0) {
            expiryStatus = 'expired';
          } else if (daysUntilExpiry <= warningDays) {
            expiryStatus = 'expiring';
          }
        }

        return {
          id: lot.id,
          item_id: lot.item_id,
          location_id: lot.location_id,
          lot_number: lot.lot_number,
          expiry_date: lot.expiry_date,
          production_date: lot.production_date,
          quantity: lot.quantity,
          reserved_quantity: lot.reserved_quantity,
          bin_location: lot.bin_location,
          bin_zone: lot.bin_zone,
          available_quantity: available,
          expiry_status: expiryStatus,
          days_until_expiry: daysUntilExpiry
        };
      });

      // Filter out expired lots for suggestions
      const validLots = enrichedLots.filter(lot => lot.expiry_status !== 'expired' && lot.available_quantity > 0);

      // FEFO logic: suggest lots with earliest expiry first
      const suggestion: Array<{ lot: FEFOLot; pickQuantity: number }> = [];
      let remaining = requiredQuantity;

      for (const lot of validLots) {
        if (remaining <= 0) break;
        
        const pickQty = Math.min(lot.available_quantity, remaining);
        suggestion.push({ lot, pickQuantity: pickQty });
        remaining -= pickQty;
      }

      return {
        lots: enrichedLots,
        suggestion,
        totalAvailable: validLots.reduce((sum, lot) => sum + lot.available_quantity, 0),
        canFulfill: remaining <= 0
      };
    },
    enabled: !!itemId && !!locationId
  });
}

// Hook to get all expiring stock across all locations
export function useExpiringStockAlerts(days: number = 30) {
  return useQuery({
    queryKey: ['expiring-stock-alerts', days],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from('stock_lots')
        .select(`
          *,
          items:item_id(id, code, name),
          locations:location_id(id, code, name)
        `)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      
      return (data || []).map(lot => {
        const expiryDate = new Date(lot.expiry_date!);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...lot,
          days_until_expiry: daysUntilExpiry,
          is_expired: daysUntilExpiry < 0,
          urgency: daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 14 ? 'warning' : 'info'
        };
      });
    }
  });
}
