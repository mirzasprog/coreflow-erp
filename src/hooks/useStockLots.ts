import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StockLot {
  id: string;
  item_id: string;
  location_id: string;
  lot_number: string;
  expiry_date: string | null;
  production_date: string | null;
  bin_location: string | null;
  bin_zone: string | null;
  quantity: number;
  reserved_quantity: number;
  created_at: string;
  updated_at: string;
  items?: { code: string; name: string } | null;
  locations?: { name: string; code: string } | null;
}

export function useStockLots(filters?: { 
  itemId?: string; 
  locationId?: string; 
  expiringDays?: number;
  lotNumber?: string;
}) {
  return useQuery({
    queryKey: ['stock-lots', filters],
    queryFn: async () => {
      let query = supabase
        .from('stock_lots')
        .select(`
          *,
          items(code, name),
          locations(name, code)
        `)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      if (filters?.itemId) {
        query = query.eq('item_id', filters.itemId);
      }
      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters?.lotNumber) {
        query = query.ilike('lot_number', `%${filters.lotNumber}%`);
      }
      if (filters?.expiringDays) {
        const expiryThreshold = new Date();
        expiryThreshold.setDate(expiryThreshold.getDate() + filters.expiringDays);
        query = query.lte('expiry_date', expiryThreshold.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockLot[];
    }
  });
}

export function useExpiringStock(days: number = 30) {
  return useQuery({
    queryKey: ['expiring-stock', days],
    queryFn: async () => {
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + days);
      
      const { data, error } = await supabase
        .from('stock_lots')
        .select(`
          *,
          items(code, name),
          locations(name, code)
        `)
        .gt('quantity', 0)
        .lte('expiry_date', expiryThreshold.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return data as unknown as StockLot[];
    }
  });
}

export function useItemBinLocations(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-bin-locations', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      
      const { data, error } = await supabase
        .from('stock_lots')
        .select(`
          *,
          items(code, name),
          locations(name, code)
        `)
        .eq('item_id', itemId)
        .gt('quantity', 0)
        .order('bin_location');

      if (error) throw error;
      return data as unknown as StockLot[];
    },
    enabled: !!itemId
  });
}

export function useUpdateStockLot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      itemId,
      locationId,
      lotNumber,
      binLocation,
      binZone,
      expiryDate,
      productionDate,
      quantityChange
    }: {
      itemId: string;
      locationId: string;
      lotNumber: string;
      binLocation?: string;
      binZone?: string;
      expiryDate?: string;
      productionDate?: string;
      quantityChange: number;
    }) => {
      // Try to find existing stock lot
      let query = supabase
        .from('stock_lots')
        .select('*')
        .eq('item_id', itemId)
        .eq('location_id', locationId)
        .eq('lot_number', lotNumber);
      
      if (binLocation) {
        query = query.eq('bin_location', binLocation);
      } else {
        query = query.is('bin_location', null);
      }

      const { data: existing, error: findError } = await query.maybeSingle();
      
      if (findError) throw findError;

      if (existing) {
        // Update existing
        const newQuantity = Math.max(0, existing.quantity + quantityChange);
        const { error } = await supabase
          .from('stock_lots')
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else if (quantityChange > 0) {
        // Create new stock lot
        const { error } = await supabase
          .from('stock_lots')
          .insert({
            item_id: itemId,
            location_id: locationId,
            lot_number: lotNumber,
            bin_location: binLocation || null,
            bin_zone: binZone || null,
            expiry_date: expiryDate || null,
            production_date: productionDate || null,
            quantity: quantityChange
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-lots'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-stock'] });
      queryClient.invalidateQueries({ queryKey: ['item-bin-locations'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stock lot: ${error.message}`);
    }
  });
}
