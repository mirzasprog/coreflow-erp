import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PriceRule {
  id: string;
  code: string;
  name: string;
  description?: string;
  rule_type: 'day_of_week' | 'stock_level' | 'expiry_proximity' | 'time_of_day' | 'combined';
  conditions: PriceRuleCondition[];
  action: PriceRuleAction;
  priority: number;
  active: boolean;
  valid_from?: string;
  valid_to?: string;
  item_ids?: string[];
  category_ids?: string[];
  location_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface PriceRuleCondition {
  type: 'day_of_week' | 'stock_quantity' | 'stock_percentage' | 'days_to_expiry' | 'time_range' | 'is_weekend' | 'is_holiday';
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: string | number | string[] | number[];
  value2?: string | number; // For 'between' operator
}

export interface PriceRuleAction {
  type: 'discount_percent' | 'discount_amount' | 'set_price' | 'markup_percent';
  value: number;
  max_discount_percent?: number; // Cap for automated discounts
  min_margin_percent?: number; // Minimum margin to maintain
}

// Get all price rules
export function usePriceRules() {
  return useQuery({
    queryKey: ['price-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_rules' as any)
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      
      return (data || []).map((rule: any) => ({
        ...rule,
        conditions: rule.conditions as PriceRuleCondition[],
        action: rule.action as PriceRuleAction
      })) as PriceRule[];
    }
  });
}

// Create price rule
export function useCreatePriceRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Omit<PriceRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('price_rules' as any)
        .insert({
          code: rule.code,
          name: rule.name,
          description: rule.description,
          rule_type: rule.rule_type,
          conditions: rule.conditions,
          action: rule.action,
          priority: rule.priority,
          active: rule.active,
          valid_from: rule.valid_from,
          valid_to: rule.valid_to,
          item_ids: rule.item_ids,
          category_ids: rule.category_ids,
          location_ids: rule.location_ids
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-rules'] });
      toast.success('Pravilo cijena kreirano');
    },
    onError: (error: Error) => {
      toast.error(`Greška: ${error.message}`);
    }
  });
}

// Update price rule
export function useUpdatePriceRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...rule }: Partial<PriceRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('price_rules' as any)
        .update({
          ...rule,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-rules'] });
      toast.success('Pravilo cijena ažurirano');
    },
    onError: (error: Error) => {
      toast.error(`Greška: ${error.message}`);
    }
  });
}

// Delete price rule
export function useDeletePriceRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('price_rules' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-rules'] });
      toast.success('Pravilo cijena obrisano');
    },
    onError: (error: Error) => {
      toast.error(`Greška: ${error.message}`);
    }
  });
}

// Evaluate price rules for an item
export function evaluatePriceRules(
  rules: PriceRule[],
  context: {
    itemId: string;
    categoryId?: string;
    locationId?: string;
    basePrice: number;
    purchasePrice?: number;
    stockQuantity?: number;
    maxStock?: number;
    daysToExpiry?: number;
    currentDate?: Date;
  }
): { finalPrice: number; appliedRules: PriceRule[]; discountPercent: number } {
  const { basePrice, purchasePrice = 0, stockQuantity, maxStock, daysToExpiry, currentDate = new Date() } = context;
  
  let finalPrice = basePrice;
  const appliedRules: PriceRule[] = [];
  
  const activeRules = rules
    .filter(rule => rule.active)
    .filter(rule => {
      // Check validity period
      if (rule.valid_from && new Date(rule.valid_from) > currentDate) return false;
      if (rule.valid_to && new Date(rule.valid_to) < currentDate) return false;
      
      // Check item/category/location filters
      if (rule.item_ids?.length && !rule.item_ids.includes(context.itemId)) return false;
      if (rule.category_ids?.length && context.categoryId && !rule.category_ids.includes(context.categoryId)) return false;
      if (rule.location_ids?.length && context.locationId && !rule.location_ids.includes(context.locationId)) return false;
      
      return true;
    })
    .sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    // Check if all conditions are met
    const allConditionsMet = rule.conditions.every(condition => {
      return evaluateCondition(condition, {
        stockQuantity,
        maxStock,
        daysToExpiry,
        currentDate
      });
    });

    if (allConditionsMet) {
      // Apply action
      const newPrice = applyAction(rule.action, finalPrice, purchasePrice);
      
      // Validate minimum margin if specified
      if (rule.action.min_margin_percent && purchasePrice > 0) {
        const margin = ((newPrice - purchasePrice) / purchasePrice) * 100;
        if (margin < rule.action.min_margin_percent) {
          continue; // Skip this rule if margin is too low
        }
      }

      finalPrice = newPrice;
      appliedRules.push(rule);
    }
  }

  const discountPercent = basePrice > 0 ? ((basePrice - finalPrice) / basePrice) * 100 : 0;

  return { finalPrice, appliedRules, discountPercent };
}

function evaluateCondition(
  condition: PriceRuleCondition,
  context: {
    stockQuantity?: number;
    maxStock?: number;
    daysToExpiry?: number;
    currentDate: Date;
  }
): boolean {
  const { stockQuantity, maxStock, daysToExpiry, currentDate } = context;

  switch (condition.type) {
    case 'day_of_week': {
      const dayOfWeek = currentDate.getDay();
      const days = Array.isArray(condition.value) ? condition.value : [condition.value];
      return days.includes(dayOfWeek);
    }
    
    case 'is_weekend': {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      return Boolean(condition.value) === true ? isWeekend : !isWeekend;
    }
    
    case 'stock_quantity': {
      if (stockQuantity === undefined) return false;
      return compareValues(stockQuantity, condition.operator, condition.value as number, condition.value2 as number);
    }
    
    case 'stock_percentage': {
      if (stockQuantity === undefined || !maxStock) return false;
      const percentage = (stockQuantity / maxStock) * 100;
      return compareValues(percentage, condition.operator, condition.value as number, condition.value2 as number);
    }
    
    case 'days_to_expiry': {
      if (daysToExpiry === undefined) return false;
      return compareValues(daysToExpiry, condition.operator, condition.value as number, condition.value2 as number);
    }
    
    case 'time_range': {
      const currentHour = currentDate.getHours();
      const [startHour, endHour] = condition.value as number[];
      return currentHour >= startHour && currentHour < endHour;
    }
    
    default:
      return false;
  }
}

function compareValues(actual: number, operator: string, expected: number, expected2?: number): boolean {
  switch (operator) {
    case 'eq': return actual === expected;
    case 'ne': return actual !== expected;
    case 'gt': return actual > expected;
    case 'gte': return actual >= expected;
    case 'lt': return actual < expected;
    case 'lte': return actual <= expected;
    case 'between': return expected2 !== undefined && actual >= expected && actual <= expected2;
    default: return false;
  }
}

function applyAction(action: PriceRuleAction, currentPrice: number, purchasePrice: number): number {
  switch (action.type) {
    case 'discount_percent': {
      let discount = action.value;
      if (action.max_discount_percent && discount > action.max_discount_percent) {
        discount = action.max_discount_percent;
      }
      return currentPrice * (1 - discount / 100);
    }
    
    case 'discount_amount':
      return Math.max(0, currentPrice - action.value);
    
    case 'set_price':
      return action.value;
    
    case 'markup_percent':
      return purchasePrice * (1 + action.value / 100);
    
    default:
      return currentPrice;
  }
}

// Get suggested auto-discounts for expiring items
export function useAutoDiscountSuggestions(locationId?: string) {
  return useQuery({
    queryKey: ['auto-discount-suggestions', locationId],
    queryFn: async () => {
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);

      let query = supabase
        .from('stock_lots')
        .select(`
          *,
          items:item_id(id, code, name, selling_price, purchase_price, category_id)
        `)
        .lte('expiry_date', in30Days.toISOString().split('T')[0])
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(lot => {
        const daysToExpiry = lot.expiry_date 
          ? Math.ceil((new Date(lot.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // Calculate suggested discount based on days to expiry
        let suggestedDiscount = 0;
        if (daysToExpiry !== null) {
          if (daysToExpiry <= 0) {
            suggestedDiscount = 0; // Expired, cannot sell
          } else if (daysToExpiry <= 3) {
            suggestedDiscount = 50;
          } else if (daysToExpiry <= 7) {
            suggestedDiscount = 40;
          } else if (daysToExpiry <= 14) {
            suggestedDiscount = 30;
          } else if (daysToExpiry <= 21) {
            suggestedDiscount = 20;
          } else if (daysToExpiry <= 30) {
            suggestedDiscount = 10;
          }
        }

        const item = lot.items as any;
        const sellingPrice = item?.selling_price || 0;
        const suggestedPrice = sellingPrice * (1 - suggestedDiscount / 100);

        return {
          ...lot,
          days_to_expiry: daysToExpiry,
          suggested_discount: suggestedDiscount,
          current_price: sellingPrice,
          suggested_price: suggestedPrice,
          is_expired: daysToExpiry !== null && daysToExpiry <= 0
        };
      }).filter(lot => !lot.is_expired && lot.suggested_discount > 0);
    }
  });
}
