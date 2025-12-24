import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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

export interface POSShift {
  id: string;
  terminal_id: string | null;
  cashier_id: string | null;
  start_time: string;
  end_time: string | null;
  opening_amount: number;
  closing_amount: number | null;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  total_returns: number;
  status: string;
}

// Standard account codes for POS GL entries
const GL_ACCOUNTS = {
  CASH: '1000',           // Gotovina / Cash
  BANK: '1100',           // Banka / Bank (for card payments)
  SALES_REVENUE: '7000',  // Prihodi od prodaje
  VAT_OUTPUT: '2400',     // PDV - izlazni
};

// Helper function to generate GL document number
async function generateGLDocumentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  
  const { data } = await supabase
    .from('gl_entries')
    .select('document_number')
    .like('document_number', `${prefix}%`)
    .order('document_number', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  if (data && data.length > 0 && data[0].document_number) {
    const lastNumber = parseInt(data[0].document_number.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(6, '0')}`;
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

// Lookup item by barcode
export function usePOSItemByBarcode() {
  return async (barcode: string): Promise<POSItem | null> => {
    const { data, error } = await supabase
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
      .eq("barcode", barcode)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      barcode: data.barcode,
      selling_price: data.selling_price || 0,
      vat_rate: data.vat_rates?.rate || 0,
      vat_rate_id: data.vat_rate_id,
    };
  };
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

async function updateStock(itemId: string, locationId: string | null, quantityChange: number) {
  if (!locationId) return;

  const { data: existing } = await supabase
    .from("stock")
    .select("id, quantity")
    .eq("item_id", itemId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (existing) {
    const newQty = (existing.quantity || 0) + quantityChange;
    const { error } = await supabase
      .from("stock")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("stock")
      .insert({ item_id: itemId, location_id: locationId, quantity: quantityChange });

    if (error) throw error;
  }
}

async function createPOSGoodsIssue({
  receiptNumber,
  receiptDate,
  cart,
  shift,
  userId,
}: {
  receiptNumber: string;
  receiptDate: string;
  cart: CartItem[];
  shift: POSShift;
  userId: string | null;
}) {
  // Try to get location from terminal, or fall back to first store location
  let locationId: string | null = null;

  if (shift.terminal_id) {
    const { data: terminal, error: terminalError } = await supabase
      .from("pos_terminals")
      .select("id, location_id")
      .eq("id", shift.terminal_id)
      .maybeSingle();

    if (terminalError) {
      console.error("Error fetching terminal:", terminalError);
    }
    locationId = terminal?.location_id || null;
  }

  // Fallback: get first store location if no terminal location
  if (!locationId) {
    const { data: storeLocation } = await supabase
      .from("locations")
      .select("id")
      .eq("type", "store")
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    locationId = storeLocation?.id || null;
  }

  // If still no location, try any warehouse location
  if (!locationId) {
    const { data: warehouseLocation } = await supabase
      .from("locations")
      .select("id")
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    locationId = warehouseLocation?.id || null;
  }

  // If no location found at all, skip goods issue creation (but don't fail the receipt)
  if (!locationId) {
    console.warn("No location found for POS goods issue - skipping stock update");
    return;
  }

  const documentNumber = `IZ-POS-${receiptNumber}`;
  const documentDate = receiptDate.split("T")[0];
  const totalValue = cart.reduce(
    (sum, item) =>
      sum + item.selling_price * item.qty * (1 - item.discount_percent / 100),
    0
  );

  const { data: document, error: documentError } = await supabase
    .from("warehouse_documents")
    .insert({
      document_type: "goods_issue",
      document_number: documentNumber,
      document_date: documentDate,
      location_id: locationId,
      notes: `Auto goods issue for POS receipt ${receiptNumber}`,
      status: "posted",
      posted_at: new Date().toISOString(),
      total_value: totalValue,
      created_by: userId,
    })
    .select()
    .single();

  if (documentError) throw documentError;

  const lines = cart.map((item) => ({
    document_id: document.id,
    item_id: item.id,
    quantity: item.qty,
    unit_price: item.selling_price,
    total_price: item.selling_price * item.qty * (1 - item.discount_percent / 100),
  }));

  const { error: linesError } = await supabase
    .from("warehouse_document_lines")
    .insert(lines);

  if (linesError) throw linesError;

  for (const line of lines) {
    await updateStock(line.item_id, locationId, -line.quantity);
  }
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
      shiftId,
    }: {
      cart: CartItem[];
      paymentType: "cash" | "card" | "voucher" | "other";
      discountAmount?: number;
      shiftId: string;
    }) => {
      if (!shiftId) {
        throw new Error("Active shift is required before issuing a receipt");
      }

      const { data: shift, error: shiftError } = await supabase
        .from('pos_shifts')
        .select('*')
        .eq('id', shiftId)
        .maybeSingle();

      if (shiftError) throw shiftError;
      if (!shift || shift.status !== 'open') {
        throw new Error("Shift must be open to create a fiscal receipt");
      }

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
          shift_id: shiftId || null,
          terminal_id: shift.terminal_id,
          cashier_id: shift.cashier_id || user?.id || null,
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

      await createPOSGoodsIssue({
        receiptNumber,
        receiptDate: receipt.receipt_date,
        cart,
        shift,
        userId: user?.id || null,
      });

      // Update shift totals if shift is active
      if (shiftId) {
        const saleAmount = total;
        const cashAmount = paymentType === 'cash' ? total : 0;
        const cardAmount = paymentType === 'card' ? total : 0;

        const { data: shift } = await supabase
          .from('pos_shifts')
          .select('total_sales, cash_sales, card_sales')
          .eq('id', shiftId)
          .single();

        if (shift) {
          await supabase
            .from('pos_shifts')
            .update({
              total_sales: (shift.total_sales || 0) + saleAmount,
              cash_sales: (shift.cash_sales || 0) + cashAmount,
              card_sales: (shift.card_sales || 0) + cardAmount,
            })
            .eq('id', shiftId);
        }
      }

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
      queryClient.invalidateQueries({ queryKey: ["pos-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-documents"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
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

// ============ SHIFT MANAGEMENT ============

// Get current open shift
export function useCurrentShift() {
  return useQuery({
    queryKey: ["pos-shifts", "current"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_shifts")
        .select("*")
        .eq("status", "open")
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as POSShift | null;
    },
  });
}

// Get all shifts
export function usePOSShifts() {
  return useQuery({
    queryKey: ["pos-shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_shifts")
        .select(`
          *,
          employees:cashier_id(first_name, last_name),
          pos_terminals:terminal_id(name, terminal_code)
        `)
        .order("start_time", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });
}

// Open a new shift
export function useOpenShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      openingAmount,
      terminalId,
      cashierId,
    }: {
      openingAmount: number;
      terminalId?: string;
      cashierId?: string;
    }) => {
      // Check if there's already an open shift
      const { data: existingShift } = await supabase
        .from("pos_shifts")
        .select("id")
        .eq("status", "open")
        .maybeSingle();

      if (existingShift) {
        throw new Error("There is already an open shift. Please close it first.");
      }

      const { data: shift, error } = await supabase
        .from("pos_shifts")
        .insert({
          start_time: new Date().toISOString(),
          opening_amount: openingAmount,
          terminal_id: terminalId || null,
          cashier_id: cashierId || null,
          status: "open",
          total_sales: 0,
          cash_sales: 0,
          card_sales: 0,
          total_returns: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-shifts"] });
      toast.success("Shift opened successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to open shift: ${error.message}`);
    },
  });
}

// Close shift and create GL entry (Z-Report)
export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shiftId,
      closingAmount,
    }: {
      shiftId: string;
      closingAmount: number;
    }) => {
      // Get shift with totals
      const { data: shift, error: shiftError } = await supabase
        .from("pos_shifts")
        .select("*")
        .eq("id", shiftId)
        .single();

      if (shiftError) throw shiftError;
      if (!shift) throw new Error("Shift not found");
      if (shift.status !== "open") throw new Error("Shift is not open");

      // Calculate totals from receipts in this shift
      const { data: receipts } = await supabase
        .from("pos_receipts")
        .select("total, vat_amount, payment_type")
        .eq("shift_id", shiftId)
        .eq("is_return", false);

      let totalSales = 0;
      let totalVat = 0;
      let cashSales = 0;
      let cardSales = 0;

      (receipts || []).forEach((receipt) => {
        totalSales += receipt.total || 0;
        totalVat += receipt.vat_amount || 0;
        if (receipt.payment_type === "cash") {
          cashSales += receipt.total || 0;
        } else if (receipt.payment_type === "card") {
          cardSales += receipt.total || 0;
        }
      });

      // Use stored values if no receipts found (backward compatibility)
      if (!receipts || receipts.length === 0) {
        totalSales = shift.total_sales || 0;
        cashSales = shift.cash_sales || 0;
        cardSales = shift.card_sales || 0;
      }

      const netSales = totalSales - totalVat;

      // Get accounts for GL entry
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, code, name")
        .eq("active", true);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in chart of accounts");
      }

      const findAccount = (codePrefix: string) => 
        accounts.find((a) => a.code.startsWith(codePrefix));

      const cashAccount = findAccount(GL_ACCOUNTS.CASH) || accounts[0];
      const bankAccount = findAccount(GL_ACCOUNTS.BANK) || accounts[0];
      const revenueAccount = findAccount(GL_ACCOUNTS.SALES_REVENUE) || accounts[0];
      const vatAccount = findAccount(GL_ACCOUNTS.VAT_OUTPUT) || accounts[0];

      // Create GL entry lines
      const glLines: Array<{
        account_id: string;
        debit: number;
        credit: number;
        description: string | null;
        partner_id: string | null;
      }> = [];

      const shiftDate = new Date(shift.start_time).toISOString().split("T")[0];

      // Debit: Cash (cash sales)
      if (cashSales > 0) {
        glLines.push({
          account_id: cashAccount.id,
          debit: cashSales,
          credit: 0,
          description: `POS Z-Report ${shiftDate} - Cash Sales`,
          partner_id: null,
        });
      }

      // Debit: Bank (card sales)
      if (cardSales > 0) {
        glLines.push({
          account_id: bankAccount.id,
          debit: cardSales,
          credit: 0,
          description: `POS Z-Report ${shiftDate} - Card Sales`,
          partner_id: null,
        });
      }

      // Credit: Sales Revenue (net sales)
      if (netSales > 0) {
        glLines.push({
          account_id: revenueAccount.id,
          debit: 0,
          credit: netSales,
          description: `POS Z-Report ${shiftDate} - Revenue`,
          partner_id: null,
        });
      }

      // Credit: VAT Output
      if (totalVat > 0) {
        glLines.push({
          account_id: vatAccount.id,
          debit: 0,
          credit: totalVat,
          description: `POS Z-Report ${shiftDate} - VAT`,
          partner_id: null,
        });
      }

      let glEntryId: string | null = null;
      let documentNumber: string | null = null;

      // Only create GL entry if there were sales
      if (glLines.length > 0 && totalSales > 0) {
        documentNumber = await generateGLDocumentNumber();

        const { data: glEntry, error: glError } = await supabase
          .from("gl_entries")
          .insert({
            entry_date: shiftDate,
            description: `POS Z-Report - Shift closing ${shiftDate}`,
            reference_type: "pos_z_report",
            reference_id: shiftId,
            status: "posted",
            document_number: documentNumber,
          })
          .select()
          .single();

        if (glError) {
          console.error("Failed to create GL entry:", glError);
          throw new Error(`Failed to create GL entry: ${glError.message}`);
        }

        glEntryId = glEntry.id;

        // Create GL entry lines
        const linesWithEntryId = glLines.map((line) => ({
          entry_id: glEntry.id,
          account_id: line.account_id,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
          partner_id: line.partner_id,
        }));

        const { error: linesError } = await supabase
          .from("gl_entry_lines")
          .insert(linesWithEntryId);

        if (linesError) {
          console.error("Failed to create GL entry lines:", linesError);
          await supabase.from("gl_entries").delete().eq("id", glEntry.id);
          throw new Error(`Failed to create GL entry lines: ${linesError.message}`);
        }
      }

      // Update shift to closed
      const { error: updateError } = await supabase
        .from("pos_shifts")
        .update({
          end_time: new Date().toISOString(),
          closing_amount: closingAmount,
          status: "closed",
          total_sales: totalSales,
          cash_sales: cashSales,
          card_sales: cardSales,
        })
        .eq("id", shiftId);

      if (updateError) throw updateError;

      return {
        shiftId,
        glEntryId,
        documentNumber,
        totalSales,
        cashSales,
        cardSales,
        totalVat,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pos-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["gl-entries"] });
      if (data.documentNumber) {
        toast.success(`Shift closed. Z-Report GL Entry ${data.documentNumber} created.`);
      } else {
        toast.success("Shift closed (no sales to book).");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to close shift: ${error.message}`);
    },
  });
}

// Get shift summary
export function useShiftSummary(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["pos-shift-summary", shiftId],
    enabled: !!shiftId,
    queryFn: async () => {
      // First get the shift details
      const { data: shift } = await supabase
        .from("pos_shifts")
        .select("opening_amount, closing_amount")
        .eq("id", shiftId)
        .single();

      const { data: receipts, error } = await supabase
        .from("pos_receipts")
        .select("total, vat_amount, payment_type, is_return")
        .eq("shift_id", shiftId);

      if (error) throw error;

      let totalSales = 0;
      let totalVat = 0;
      let cashSales = 0;
      let cardSales = 0;
      let totalReturns = 0;
      let transactionCount = 0;

      (receipts || []).forEach((receipt) => {
        if (receipt.is_return) {
          totalReturns += receipt.total || 0;
        } else {
          totalSales += receipt.total || 0;
          totalVat += receipt.vat_amount || 0;
          transactionCount++;
          if (receipt.payment_type === "cash") {
            cashSales += receipt.total || 0;
          } else if (receipt.payment_type === "card") {
            cardSales += receipt.total || 0;
          }
        }
      });

      return {
        totalSales,
        totalVat,
        cashSales,
        cardSales,
        totalReturns,
        netSales: totalSales - totalVat,
        transactionCount,
        openingAmount: shift?.opening_amount || 0,
        closingAmount: shift?.closing_amount || 0,
      };
    },
  });
}

// Get POS terminals
export function usePOSTerminals() {
  return useQuery({
    queryKey: ["pos-terminals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_terminals")
        .select("id, terminal_code, name, terminal_type, active")
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
