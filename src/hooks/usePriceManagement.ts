import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Module settings
export function useModuleSettings(moduleName: string) {
  return useQuery({
    queryKey: ['module-settings', moduleName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_settings')
        .select('*')
        .eq('module_name', moduleName)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });
}

export function useToggleModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ moduleName, enabled }: { moduleName: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('module_settings')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('module_name', moduleName);
      
      if (error) throw error;
    },
    onSuccess: (_, { moduleName }) => {
      queryClient.invalidateQueries({ queryKey: ['module-settings', moduleName] });
    }
  });
}

// Price lists
export function usePriceLists() {
  return useQuery({
    queryKey: ['price-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_lists')
        .select(`
          *,
          price_list_locations(
            location_id,
            locations(id, name, code)
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
}

export function usePriceList(id: string | undefined) {
  return useQuery({
    queryKey: ['price-list', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('price_lists')
        .select(`
          *,
          price_list_locations(
            location_id,
            locations(id, name, code)
          ),
          price_list_items(
            *,
            items(id, code, name, purchase_price, selling_price)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
}

export function useCreatePriceList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      description?: string;
      valid_from?: string;
      valid_to?: string;
      is_default?: boolean;
      location_ids?: string[];
    }) => {
      const { location_ids, ...listData } = data;
      
      const { data: priceList, error } = await supabase
        .from('price_lists')
        .insert(listData)
        .select()
        .single();
      
      if (error) throw error;
      
      if (location_ids && location_ids.length > 0) {
        const locationRecords = location_ids.map(loc_id => ({
          price_list_id: priceList.id,
          location_id: loc_id
        }));
        
        const { error: locError } = await supabase
          .from('price_list_locations')
          .insert(locationRecords);
        
        if (locError) throw locError;
      }
      
      return priceList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
    }
  });
}

export function useUpdatePriceList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      code?: string;
      name?: string;
      description?: string;
      valid_from?: string | null;
      valid_to?: string | null;
      is_default?: boolean;
      active?: boolean;
      location_ids?: string[];
    }) => {
      const { location_ids, ...listData } = data;
      
      const { error } = await supabase
        .from('price_lists')
        .update({ ...listData, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      if (location_ids !== undefined) {
        // Delete existing locations
        await supabase
          .from('price_list_locations')
          .delete()
          .eq('price_list_id', id);
        
        // Insert new locations
        if (location_ids.length > 0) {
          const locationRecords = location_ids.map(loc_id => ({
            price_list_id: id,
            location_id: loc_id
          }));
          
          const { error: locError } = await supabase
            .from('price_list_locations')
            .insert(locationRecords);
          
          if (locError) throw locError;
        }
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
      queryClient.invalidateQueries({ queryKey: ['price-list', id] });
    }
  });
}

// Price list items
export function useUpdatePriceListItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      price_list_id: string;
      item_id: string;
      selling_price: number;
      min_price?: number;
      max_price?: number;
      margin_percent?: number;
    }) => {
      // Upsert price list item
      const { error } = await supabase
        .from('price_list_items')
        .upsert(data, { onConflict: 'price_list_id,item_id' });
      
      if (error) throw error;
      
      // Record price change
      const { data: item } = await supabase
        .from('items')
        .select('selling_price')
        .eq('id', data.item_id)
        .single();
      
      await supabase
        .from('price_changes_history')
        .insert({
          item_id: data.item_id,
          price_list_id: data.price_list_id,
          old_price: item?.selling_price || 0,
          new_price: data.selling_price,
          change_type: 'manual',
          change_reason: 'Price list update'
        });
    },
    onSuccess: (_, { price_list_id }) => {
      queryClient.invalidateQueries({ queryKey: ['price-list', price_list_id] });
      queryClient.invalidateQueries({ queryKey: ['price-changes-history'] });
    }
  });
}

// Promo activities
export function usePromoActivities() {
  return useQuery({
    queryKey: ['promo-activities'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // First get all promos
      const { data, error } = await supabase
        .from('promo_activities')
        .select(`
          *,
          promo_activity_locations(
            location_id,
            locations(id, name, code)
          ),
          promo_items(count)
        `)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      
      // Auto-transition statuses based on dates
      if (data) {
        for (const promo of data) {
          let newStatus: string | null = null;
          
          // Draft -> Active when start_date arrives
          if (promo.status === 'draft' && promo.start_date <= today && promo.end_date >= today) {
            newStatus = 'active';
          }
          // Active -> Completed when end_date passes
          else if (promo.status === 'active' && promo.end_date < today) {
            newStatus = 'completed';
          }
          
          if (newStatus) {
            // If becoming active, apply promo prices
            if (newStatus === 'active') {
              const { data: promoItems } = await supabase
                .from('promo_items')
                .select('item_id, promo_price')
                .eq('promo_activity_id', promo.id);
              
              if (promoItems && promoItems.length > 0) {
                for (const pi of promoItems) {
                  await supabase
                    .from('items')
                    .update({ selling_price: pi.promo_price })
                    .eq('id', pi.item_id);
                }
              }
            }
            
            // If becoming completed, restore original prices
            if (newStatus === 'completed') {
              const { data: promoItems } = await supabase
                .from('promo_items')
                .select('item_id, original_price')
                .eq('promo_activity_id', promo.id);
              
              if (promoItems && promoItems.length > 0) {
                for (const pi of promoItems) {
                  await supabase
                    .from('items')
                    .update({ selling_price: pi.original_price })
                    .eq('id', pi.item_id);
                }
              }
            }
            
            // Update promo status
            await supabase
              .from('promo_activities')
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', promo.id);
            
            promo.status = newStatus;
          }
        }
      }
      
      return data;
    }
  });
}

export function usePromoActivity(id: string | undefined) {
  return useQuery({
    queryKey: ['promo-activity', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('promo_activities')
        .select(`
          *,
          promo_activity_locations(
            location_id,
            locations(id, name, code)
          ),
          promo_items(
            *,
            items(id, code, name, purchase_price, selling_price)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
}

export function useCreatePromoActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      description?: string;
      promo_type: string;
      discount_percent?: number;
      discount_amount?: number;
      start_date: string;
      end_date: string;
      is_weekend_only?: boolean;
      is_holiday_promo?: boolean;
      season?: string;
      location_ids?: string[];
    }) => {
      const { location_ids, ...promoData } = data;
      
      const { data: promo, error } = await supabase
        .from('promo_activities')
        .insert(promoData)
        .select()
        .single();
      
      if (error) throw error;
      
      if (location_ids && location_ids.length > 0) {
        const locationRecords = location_ids.map(loc_id => ({
          promo_activity_id: promo.id,
          location_id: loc_id
        }));
        
        const { error: locError } = await supabase
          .from('promo_activity_locations')
          .insert(locationRecords);
        
        if (locError) throw locError;
      }
      
      return promo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-activities'] });
    }
  });
}

export function useUpdatePromoActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      description?: string;
      status?: string;
      discount_percent?: number;
      discount_amount?: number;
      start_date?: string;
      end_date?: string;
      is_weekend_only?: boolean;
      is_holiday_promo?: boolean;
      season?: string;
      location_ids?: string[];
    }) => {
      const { location_ids, ...promoData } = data;
      
      // Check if status is changing to active - apply promo prices to items
      if (data.status === 'active') {
        // Get promo items and apply their promo prices to items table
        const { data: promoItems } = await supabase
          .from('promo_items')
          .select('item_id, promo_price, original_price')
          .eq('promo_activity_id', id);
        
        if (promoItems && promoItems.length > 0) {
          for (const pi of promoItems) {
            await supabase
              .from('items')
              .update({ selling_price: pi.promo_price })
              .eq('id', pi.item_id);
          }
        }
      }
      
      // If changing back from active to another status, restore original prices
      if (data.status && data.status !== 'active') {
        // First check current status
        const { data: currentPromo } = await supabase
          .from('promo_activities')
          .select('status')
          .eq('id', id)
          .single();
        
        if (currentPromo?.status === 'active') {
          // Restore original prices
          const { data: promoItems } = await supabase
            .from('promo_items')
            .select('item_id, original_price')
            .eq('promo_activity_id', id);
          
          if (promoItems && promoItems.length > 0) {
            for (const pi of promoItems) {
              await supabase
                .from('items')
                .update({ selling_price: pi.original_price })
                .eq('id', pi.item_id);
            }
          }
        }
      }
      
      const { error } = await supabase
        .from('promo_activities')
        .update({ ...promoData, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      if (location_ids !== undefined) {
        await supabase
          .from('promo_activity_locations')
          .delete()
          .eq('promo_activity_id', id);
        
        if (location_ids.length > 0) {
          const locationRecords = location_ids.map(loc_id => ({
            promo_activity_id: id,
            location_id: loc_id
          }));
          
          await supabase
            .from('promo_activity_locations')
            .insert(locationRecords);
        }
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['promo-activities'] });
      queryClient.invalidateQueries({ queryKey: ['promo-activity', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items-list'] });
    }
  });
}

export function useAddPromoItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      promo_activity_id: string;
      item_id: string;
      original_price: number;
      promo_price: number;
      ai_suggested_price?: number;
      ai_suggestion_reason?: string;
    }) => {
      const { error } = await supabase
        .from('promo_items')
        .upsert(data, { onConflict: 'promo_activity_id,item_id' });
      
      if (error) throw error;
      
      // Record price change
      await supabase
        .from('price_changes_history')
        .insert({
          item_id: data.item_id,
          old_price: data.original_price,
          new_price: data.promo_price,
          change_type: 'promo',
          change_reason: 'Promotional activity'
        });
    },
    onSuccess: (_, { promo_activity_id }) => {
      queryClient.invalidateQueries({ queryKey: ['promo-activity', promo_activity_id] });
      queryClient.invalidateQueries({ queryKey: ['price-changes-history'] });
    }
  });
}

// Price history
export function usePriceChangesHistory(itemId?: string) {
  return useQuery({
    queryKey: ['price-changes-history', itemId],
    queryFn: async () => {
      let query = supabase
        .from('price_changes_history')
        .select(`
          *,
          items(id, code, name),
          price_lists(id, code, name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (itemId) {
        query = query.eq('item_id', itemId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

// Competitor prices
export function useCompetitorPrices(itemId?: string) {
  return useQuery({
    queryKey: ['competitor-prices', itemId],
    queryFn: async () => {
      let query = supabase
        .from('competitor_prices')
        .select(`
          *,
          items(id, code, name)
        `)
        .order('observed_date', { ascending: false });
      
      if (itemId) {
        query = query.eq('item_id', itemId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

export function useAddCompetitorPrice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      item_id: string;
      competitor_name: string;
      price: number;
      source?: string;
      observed_date?: string;
      location?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('competitor_prices')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: (_, { item_id }) => {
      queryClient.invalidateQueries({ queryKey: ['competitor-prices'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-prices', item_id] });
    }
  });
}

// AI Price Analysis
export async function analyzePriceWithAI(params: {
  itemId: string;
  itemName: string;
  currentPrice: number;
  proposedPrice: number;
  purchasePrice: number;
  locationName?: string;
  competitorPrices?: { name: string; price: number }[];
  isWeekend?: boolean;
  isHoliday?: boolean;
  season?: string;
  promoType?: string;
}) {
  const { data, error } = await supabase.functions.invoke('analyze-price', {
    body: params
  });
  
  if (error) throw error;
  return data as {
    recommendation: 'approve' | 'adjust' | 'reject' | 'error';
    suggestedPrice: number | null;
    confidence: number;
    reasoning: string;
    warnings: string[] | null;
    tips: string[] | null;
    error?: string;
  };
}