import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FiscalizationConfig {
  id: string;
  location_id: string | null;
  terminal_id: string | null;
  fiscal_mode: 'fbih' | 'rs' | 'disabled';
  fbih_device_type: string | null;
  fbih_connection_type: 'usb' | 'lan' | 'serial' | null;
  fbih_device_ip: string | null;
  fbih_device_port: number | null;
  fbih_operator_code: string | null;
  rs_api_url: string | null;
  rs_api_key_encrypted: string | null;
  rs_certificate_thumbprint: string | null;
  rs_pib: string | null;
  rs_business_unit_code: string | null;
  auto_fiscalize: boolean;
  retry_on_failure: boolean;
  max_retries: number;
  active: boolean;
}

export interface FiscalizationLog {
  id: string;
  receipt_id: string | null;
  shift_id: string | null;
  config_id: string | null;
  fiscal_mode: string;
  operation_type: 'receipt' | 'x_report' | 'z_report' | 'void';
  request_data: any;
  response_data: any;
  fiscal_number: string | null;
  fiscal_date: string | null;
  status: 'pending' | 'success' | 'failed' | 'retry';
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

export interface XReportData {
  shiftId: string;
  reportNumber: number;
  generatedAt: string;
  openingAmount: number;
  currentCashSales: number;
  currentCardSales: number;
  currentTotalSales: number;
  currentVatAmount: number;
  transactionCount: number;
  expectedCash: number;
}

// Fetch fiscalization configs
export function useFiscalizationConfigs() {
  return useQuery({
    queryKey: ["fiscalization-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_fiscalization_config")
        .select(`
          *,
          locations(name, code),
          pos_terminals(name, terminal_code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch config for specific terminal
export function useFiscalizationConfigForTerminal(terminalId: string | undefined) {
  return useQuery({
    queryKey: ["fiscalization-config", terminalId],
    enabled: !!terminalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_fiscalization_config")
        .select("*")
        .eq("terminal_id", terminalId)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      return data as FiscalizationConfig | null;
    },
  });
}

// Create/update fiscalization config
export function useSaveFiscalizationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<FiscalizationConfig> & { id?: string }) => {
      const { id, ...configData } = config;
      
      if (id) {
        const { data, error } = await supabase
          .from("pos_fiscalization_config")
          .update({ ...configData, updated_at: new Date().toISOString() } as any)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("pos_fiscalization_config")
          .insert(configData as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscalization-configs"] });
      toast.success("Fiscalization configuration saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save config: ${error.message}`);
    },
  });
}

// Delete fiscalization config
export function useDeleteFiscalizationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pos_fiscalization_config")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscalization-configs"] });
      toast.success("Configuration deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

// Fetch fiscalization logs
export function useFiscalizationLogs(filters?: { 
  shiftId?: string; 
  receiptId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["fiscalization-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("pos_fiscalization_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.shiftId) {
        query = query.eq("shift_id", filters.shiftId);
      }
      if (filters?.receiptId) {
        query = query.eq("receipt_id", filters.receiptId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FiscalizationLog[];
    },
  });
}

// Generate X-Report (interim report during shift)
export function useGenerateXReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string): Promise<XReportData> => {
      // Get shift details
      const { data: shift, error: shiftError } = await supabase
        .from("pos_shifts")
        .select("*")
        .eq("id", shiftId)
        .single();

      if (shiftError) throw shiftError;
      if (!shift) throw new Error("Shift not found");
      if (shift.status !== "open") throw new Error("Shift is not open");

      // Calculate current totals from receipts
      const { data: receipts } = await supabase
        .from("pos_receipts")
        .select("total, vat_amount, payment_type, is_return")
        .eq("shift_id", shiftId);

      let totalSales = 0;
      let totalVat = 0;
      let cashSales = 0;
      let cardSales = 0;
      let transactionCount = 0;

      (receipts || []).forEach((receipt) => {
        if (!receipt.is_return) {
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

      const reportNumber = (shift.x_report_count || 0) + 1;
      const generatedAt = new Date().toISOString();

      // Update shift X-report counter
      await supabase
        .from("pos_shifts")
        .update({
          x_report_count: reportNumber,
          last_x_report_at: generatedAt,
        })
        .eq("id", shiftId);

      // Log the X-report generation
      await supabase
        .from("pos_fiscalization_logs")
        .insert({
          shift_id: shiftId,
          fiscal_mode: "internal",
          operation_type: "x_report",
          request_data: { reportNumber },
          response_data: {
            totalSales,
            cashSales,
            cardSales,
            totalVat,
            transactionCount,
          },
          status: "success",
          fiscal_date: generatedAt,
        });

      return {
        shiftId,
        reportNumber,
        generatedAt,
        openingAmount: shift.opening_amount || 0,
        currentCashSales: cashSales,
        currentCardSales: cardSales,
        currentTotalSales: totalSales,
        currentVatAmount: totalVat,
        transactionCount,
        expectedCash: (shift.opening_amount || 0) + cashSales,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pos-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["fiscalization-logs"] });
      toast.success(`X-Report #${data.reportNumber} generated`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate X-Report: ${error.message}`);
    },
  });
}

// Log fiscalization attempt
export function useLogFiscalization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: Partial<FiscalizationLog>) => {
      const { data, error } = await supabase
        .from("pos_fiscalization_logs")
        .insert(log as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscalization-logs"] });
    },
  });
}

// Update receipt with fiscal info
export function useUpdateReceiptFiscal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiptId,
      fiscalNumber,
      fiscalDate,
    }: {
      receiptId: string;
      fiscalNumber: string;
      fiscalDate: string;
    }) => {
      const { error } = await supabase
        .from("pos_receipts")
        .update({
          fiscal_number: fiscalNumber,
          fiscal_date: fiscalDate,
          fiscalized: true,
        })
        .eq("id", receiptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-receipts"] });
    },
  });
}
