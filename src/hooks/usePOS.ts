import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface POSItem {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  selling_price: number;
  vat_rate: number;
  vat_rate_id: string | null;
}

export interface CartItem extends POSItem {
  qty: number;
  discount_percent: number;
}

export interface ReceiptData {
  receipt_number: string;
  receipt_date: string;
  payment_type: "cash" | "card" | "voucher" | "other";
  subtotal: number;
  vat_amount: number;
  discount_amount: number;
  total: number;
  items: CartItem[];
}

// Fetch items for POS with selling prices
export function usePOSItems(searchQuery: string = "") {
  return useQuery({
    queryKey: ["pos-items", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("items")
        .select(`
          id,
          code,
          name,
          barcode,
          selling_price,
          vat_rate_id,
          vat_rates(rate)
        `)
        .eq("active", true)
        .order("name", { ascending: true });

      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        barcode: item.barcode,
        selling_price: item.selling_price || 0,
        vat_rate: item.vat_rates?.rate || 0,
        vat_rate_id: item.vat_rate_id,
      })) as POSItem[];
    },
  });
}

// Fetch item categories for grouping
export function usePOSCategories() {
  return useQuery({
    queryKey: ["pos-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_categories")
        .select("id, code, name")
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Generate receipt number
async function generateReceiptNumber(): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, "");
  
  const { data } = await supabase
    .from("pos_receipts")
    .select("receipt_number")
    .like("receipt_number", `R-${datePrefix}%`)
    .order("receipt_number", { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNum = data[0].receipt_number;
    const lastSeq = parseInt(lastNum.split("-").pop() || "0", 10);
    sequence = lastSeq + 1;
  }

  return `R-${datePrefix}-${sequence.toString().padStart(4, "0")}`;
}

// Create a new receipt/sale
export function useCreateReceipt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      cart,
      paymentType,
      discountAmount = 0,
    }: {
      cart: CartItem[];
      paymentType: "cash" | "card" | "voucher" | "other";
      discountAmount?: number;
    }) => {
      const receiptNumber = await generateReceiptNumber();
      
      const subtotal = cart.reduce(
        (sum, item) => sum + item.selling_price * item.qty * (1 - item.discount_percent / 100),
        0
      );
      
      const vatAmount = cart.reduce(
        (sum, item) => {
          const itemTotal = item.selling_price * item.qty * (1 - item.discount_percent / 100);
          return sum + (itemTotal * item.vat_rate) / (100 + item.vat_rate);
        },
        0
      );

      const total = subtotal;

      // Create receipt
      const { data: receipt, error: receiptError } = await supabase
        .from("pos_receipts")
        .insert({
          receipt_number: receiptNumber,
          receipt_date: new Date().toISOString(),
          payment_type: paymentType,
          subtotal: subtotal - vatAmount,
          vat_amount: vatAmount,
          discount_amount: discountAmount,
          total: total,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create receipt lines
      const lines = cart.map((item) => {
        const lineTotal = item.selling_price * item.qty * (1 - item.discount_percent / 100);
        const lineVat = (lineTotal * item.vat_rate) / (100 + item.vat_rate);
        
        return {
          receipt_id: receipt.id,
          item_id: item.id,
          quantity: item.qty,
          unit_price: item.selling_price,
          discount_percent: item.discount_percent,
          vat_rate_id: item.vat_rate_id,
          vat_amount: lineVat,
          total: lineTotal,
        };
      });

      const { error: linesError } = await supabase
        .from("pos_receipt_lines")
        .insert(lines);

      if (linesError) throw linesError;

      return {
        receipt_number: receiptNumber,
        receipt_date: receipt.receipt_date,
        payment_type: paymentType,
        subtotal: subtotal - vatAmount,
        vat_amount: vatAmount,
        discount_amount: discountAmount,
        total: total,
        items: cart,
      } as ReceiptData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-receipts"] });
    },
  });
}

// Fetch today's receipts
export function useTodayReceipts() {
  return useQuery({
    queryKey: ["pos-receipts", "today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("pos_receipts")
        .select(`
          *,
          pos_receipt_lines(
            quantity,
            total,
            items(name)
          )
        `)
        .gte("receipt_date", today.toISOString())
        .order("receipt_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch receipt by ID with lines
export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ["pos-receipt", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_receipts")
        .select(`
          *,
          pos_receipt_lines(
            *,
            items(code, name),
            vat_rates(code, rate)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
