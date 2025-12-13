export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          approved: boolean | null
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          type: Database["public"]["Enums"]["absence_type"]
        }
        Insert: {
          approved?: boolean | null
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          type: Database["public"]["Enums"]["absence_type"]
        }
        Update: {
          approved?: boolean | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          type?: Database["public"]["Enums"]["absence_type"]
        }
        Relationships: [
          {
            foreignKeyName: "absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: string | null
          active: boolean | null
          code: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          account_type?: string | null
          active?: boolean | null
          code: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          account_type?: string | null
          active?: boolean | null
          code?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_transfers: {
        Row: {
          asset_id: string
          created_at: string | null
          created_by: string | null
          from_custodian_id: string | null
          from_location_id: string | null
          id: string
          notes: string | null
          reason: string | null
          to_custodian_id: string | null
          to_location_id: string | null
          transfer_date: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          created_by?: string | null
          from_custodian_id?: string | null
          from_location_id?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          to_custodian_id?: string | null
          to_location_id?: string | null
          transfer_date?: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          created_by?: string | null
          from_custodian_id?: string | null
          from_location_id?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          to_custodian_id?: string | null
          to_location_id?: string | null
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_custodian_id_fkey"
            columns: ["from_custodian_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_custodian_id_fkey"
            columns: ["to_custodian_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean | null
          address: string | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_type: string | null
          created_at: string | null
          employee_id: string
          end_date: string | null
          id: string
          notes: string | null
          salary: number | null
          start_date: string
          working_hours: number | null
        }
        Insert: {
          contract_type?: string | null
          created_at?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          notes?: string | null
          salary?: number | null
          start_date: string
          working_hours?: number | null
        }
        Update: {
          contract_type?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          salary?: number | null
          start_date?: string
          working_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      deduction_types: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          fixed_amount: number | null
          id: string
          is_mandatory: boolean | null
          name: string
          percentage: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_mandatory?: boolean | null
          name: string
          percentage?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_mandatory?: boolean | null
          name?: string
          percentage?: number | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          active: boolean | null
          code: string
          company_id: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          code: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          code?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      depreciation_records: {
        Row: {
          amount: number
          asset_id: string
          created_at: string | null
          gl_entry_id: string | null
          id: string
          period_date: string
        }
        Insert: {
          amount: number
          asset_id: string
          created_at?: string | null
          gl_entry_id?: string | null
          id?: string
          period_date: string
        }
        Update: {
          amount?: number
          asset_id?: string
          created_at?: string | null
          gl_entry_id?: string | null
          id?: string
          period_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_records_gl_entry_id_fkey"
            columns: ["gl_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          address: string | null
          company_id: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          employee_code: string
          first_name: string
          hire_date: string | null
          id: string
          jmbg: string | null
          last_name: string
          location_id: string | null
          phone: string | null
          position: string | null
          termination_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_code: string
          first_name: string
          hire_date?: string | null
          id?: string
          jmbg?: string | null
          last_name: string
          location_id?: string | null
          phone?: string | null
          position?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_code?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          jmbg?: string | null
          last_name?: string
          location_id?: string | null
          phone?: string | null
          position?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          asset_code: string
          category: string | null
          created_at: string | null
          current_value: number | null
          custodian_id: string | null
          depreciation_method: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_value: number | null
          status: Database["public"]["Enums"]["asset_status"] | null
          updated_at: string | null
          useful_life_years: number | null
        }
        Insert: {
          asset_code: string
          category?: string | null
          created_at?: string | null
          current_value?: number | null
          custodian_id?: string | null
          depreciation_method?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          status?: Database["public"]["Enums"]["asset_status"] | null
          updated_at?: string | null
          useful_life_years?: number | null
        }
        Update: {
          asset_code?: string
          category?: string | null
          created_at?: string | null
          current_value?: number | null
          custodian_id?: string | null
          depreciation_method?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          status?: Database["public"]["Enums"]["asset_status"] | null
          updated_at?: string | null
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_custodian_id_fkey"
            columns: ["custodian_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          document_number: string | null
          entry_date: string
          id: string
          reference_id: string | null
          reference_type: string | null
          reversed_entry_id: string | null
          status: Database["public"]["Enums"]["document_status"] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_number?: string | null
          entry_date?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          reversed_entry_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_number?: string | null
          entry_date?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          reversed_entry_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_entries_reversed_entry_id_fkey"
            columns: ["reversed_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_entry_lines: {
        Row: {
          account_id: string
          credit: number | null
          debit: number | null
          description: string | null
          entry_id: string
          id: string
          partner_id: string | null
        }
        Insert: {
          account_id: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id: string
          id?: string
          partner_id?: string | null
        }
        Update: {
          account_id?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id?: string
          id?: string
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "gl_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_entry_lines_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          description: string | null
          id: string
          invoice_id: string
          item_id: string | null
          quantity: number | null
          total: number | null
          unit_price: number | null
          vat_amount: number | null
          vat_rate_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          invoice_id: string
          item_id?: string | null
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
          vat_amount?: number | null
          vat_rate_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          invoice_id?: string
          item_id?: string | null
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
          vat_amount?: number | null
          vat_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_vat_rate_id_fkey"
            columns: ["vat_rate_id"]
            isOneToOne: false
            referencedRelation: "vat_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          paid_amount: number | null
          partner_id: string | null
          posted_at: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          vat_amount: number | null
          warehouse_document_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type: string
          notes?: string | null
          paid_amount?: number | null
          partner_id?: string | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          warehouse_document_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          paid_amount?: number | null
          partner_id?: string | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          warehouse_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_warehouse_document_id_fkey"
            columns: ["warehouse_document_id"]
            isOneToOne: false
            referencedRelation: "warehouse_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          active: boolean | null
          code: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean | null
          barcode: string | null
          category_id: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          max_stock: number | null
          min_stock: number | null
          name: string
          preferred_supplier_id: string | null
          purchase_price: number | null
          selling_price: number | null
          unit_id: string | null
          updated_at: string | null
          vat_rate_id: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          category_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_stock?: number | null
          min_stock?: number | null
          name: string
          preferred_supplier_id?: string | null
          purchase_price?: number | null
          selling_price?: number | null
          unit_id?: string | null
          updated_at?: string | null
          vat_rate_id?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          category_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          preferred_supplier_id?: string | null
          purchase_price?: number | null
          selling_price?: number | null
          unit_id?: string | null
          updated_at?: string | null
          vat_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_vat_rate_id_fkey"
            columns: ["vat_rate_id"]
            isOneToOne: false
            referencedRelation: "vat_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean | null
          address: string | null
          code: string
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          code: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          code?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_checks: {
        Row: {
          attachment_url: string | null
          check_date: string
          check_type: Database["public"]["Enums"]["check_type"]
          created_at: string | null
          employee_id: string
          id: string
          notes: string | null
          result: string | null
          valid_until: string | null
        }
        Insert: {
          attachment_url?: string | null
          check_date: string
          check_type: Database["public"]["Enums"]["check_type"]
          created_at?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          result?: string | null
          valid_until?: string | null
        }
        Update: {
          attachment_url?: string | null
          check_date?: string
          check_type?: Database["public"]["Enums"]["check_type"]
          created_at?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          result?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_checks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          tax_id: string | null
          type: Database["public"]["Enums"]["partner_type"] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          type?: Database["public"]["Enums"]["partner_type"] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          type?: Database["public"]["Enums"]["partner_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payroll_periods: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          paid_at: string | null
          period_month: string
          processed_at: string | null
          status: Database["public"]["Enums"]["payroll_status"] | null
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          paid_at?: string | null
          period_month: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payroll_status"] | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          paid_at?: string | null
          period_month?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payroll_status"] | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
        }
        Relationships: []
      }
      payslip_deductions: {
        Row: {
          amount: number
          deduction_type_id: string
          description: string | null
          id: string
          payslip_id: string
        }
        Insert: {
          amount?: number
          deduction_type_id: string
          description?: string | null
          id?: string
          payslip_id: string
        }
        Update: {
          amount?: number
          deduction_type_id?: string
          description?: string | null
          id?: string
          payslip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "deduction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_deductions_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          contract_id: string | null
          created_at: string | null
          employee_id: string
          gross_salary: number
          id: string
          net_salary: number | null
          notes: string | null
          payroll_period_id: string
          total_deductions: number | null
          worked_days: number | null
          working_days: number | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          employee_id: string
          gross_salary?: number
          id?: string
          net_salary?: number | null
          notes?: string | null
          payroll_period_id: string
          total_deductions?: number | null
          worked_days?: number | null
          working_days?: number | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          employee_id?: string
          gross_salary?: number
          id?: string
          net_salary?: number | null
          notes?: string | null
          payroll_period_id?: string
          total_deductions?: number | null
          worked_days?: number | null
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_receipt_lines: {
        Row: {
          discount_percent: number | null
          id: string
          item_id: string
          quantity: number
          receipt_id: string
          total: number
          unit_price: number
          vat_amount: number | null
          vat_rate_id: string | null
        }
        Insert: {
          discount_percent?: number | null
          id?: string
          item_id: string
          quantity: number
          receipt_id: string
          total: number
          unit_price: number
          vat_amount?: number | null
          vat_rate_id?: string | null
        }
        Update: {
          discount_percent?: number | null
          id?: string
          item_id?: string
          quantity?: number
          receipt_id?: string
          total?: number
          unit_price?: number
          vat_amount?: number | null
          vat_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_receipt_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "pos_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_receipt_lines_vat_rate_id_fkey"
            columns: ["vat_rate_id"]
            isOneToOne: false
            referencedRelation: "vat_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_receipts: {
        Row: {
          cashier_id: string | null
          created_at: string | null
          discount_amount: number | null
          id: string
          is_return: boolean | null
          original_receipt_id: string | null
          payment_type: Database["public"]["Enums"]["payment_type"] | null
          receipt_date: string | null
          receipt_number: string
          shift_id: string | null
          subtotal: number | null
          terminal_id: string | null
          total: number | null
          vat_amount: number | null
        }
        Insert: {
          cashier_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          is_return?: boolean | null
          original_receipt_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          receipt_date?: string | null
          receipt_number: string
          shift_id?: string | null
          subtotal?: number | null
          terminal_id?: string | null
          total?: number | null
          vat_amount?: number | null
        }
        Update: {
          cashier_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          is_return?: boolean | null
          original_receipt_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          receipt_date?: string | null
          receipt_number?: string
          shift_id?: string | null
          subtotal?: number | null
          terminal_id?: string | null
          total?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_receipts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_receipts_original_receipt_id_fkey"
            columns: ["original_receipt_id"]
            isOneToOne: false
            referencedRelation: "pos_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_receipts_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_shifts: {
        Row: {
          card_sales: number | null
          cash_sales: number | null
          cashier_id: string | null
          closing_amount: number | null
          created_at: string | null
          end_time: string | null
          id: string
          opening_amount: number | null
          start_time: string
          status: string | null
          terminal_id: string | null
          total_returns: number | null
          total_sales: number | null
        }
        Insert: {
          card_sales?: number | null
          cash_sales?: number | null
          cashier_id?: string | null
          closing_amount?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          opening_amount?: number | null
          start_time?: string
          status?: string | null
          terminal_id?: string | null
          total_returns?: number | null
          total_sales?: number | null
        }
        Update: {
          card_sales?: number | null
          cash_sales?: number | null
          cashier_id?: string | null
          closing_amount?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          opening_amount?: number | null
          start_time?: string
          status?: string | null
          terminal_id?: string | null
          total_returns?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_shifts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shifts_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_terminals: {
        Row: {
          active: boolean | null
          id: string
          location_id: string | null
          name: string | null
          terminal_code: string
          terminal_type: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string
          location_id?: string | null
          name?: string | null
          terminal_code: string
          terminal_type?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string
          location_id?: string | null
          name?: string | null
          terminal_code?: string
          terminal_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_terminals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          id: string
          item_id: string
          notes: string | null
          order_id: string
          quantity: number
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          id?: string
          item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          id?: string
          item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          expected_date: string | null
          id: string
          location_id: string | null
          notes: string | null
          order_date: string
          order_number: string
          partner_id: string | null
          status: string
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_date?: string
          order_number: string
          partner_id?: string | null
          status?: string
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string
          partner_id?: string | null
          status?: string
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_devices: {
        Row: {
          created_at: string | null
          device_code: string
          device_type: string
          id: string
          inspection_interval_months: number | null
          installation_date: string | null
          last_inspection_date: string | null
          location_id: string | null
          manufacturer: string | null
          model: string | null
          name: string | null
          next_inspection_date: string | null
          notes: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["device_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_code: string
          device_type: string
          id?: string
          inspection_interval_months?: number | null
          installation_date?: string | null
          last_inspection_date?: string | null
          location_id?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["device_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_code?: string
          device_type?: string
          id?: string
          inspection_interval_months?: number | null
          installation_date?: string | null
          last_inspection_date?: string | null
          location_id?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["device_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_inspections: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          device_id: string
          id: string
          inspection_date: string
          inspector_company: string | null
          inspector_name: string | null
          notes: string | null
          passed: boolean | null
          result: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          device_id: string
          id?: string
          inspection_date: string
          inspector_company?: string | null
          inspector_name?: string | null
          notes?: string | null
          passed?: boolean | null
          result?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          device_id?: string
          id?: string
          inspection_date?: string
          inspector_company?: string | null
          inspector_name?: string | null
          notes?: string | null
          passed?: boolean | null
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_inspections_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "safety_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          id: string
          item_id: string
          location_id: string
          quantity: number | null
          reserved_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          location_id: string
          quantity?: number | null
          reserved_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          location_id?: string
          quantity?: number | null
          reserved_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ratings: {
        Row: {
          communication_rating: number
          created_at: string | null
          created_by: string | null
          delivery_rating: number
          id: string
          notes: string | null
          partner_id: string
          quality_rating: number
          rating_date: string
        }
        Insert: {
          communication_rating: number
          created_at?: string | null
          created_by?: string | null
          delivery_rating: number
          id?: string
          notes?: string | null
          partner_id: string
          quality_rating: number
          rating_date?: string
        }
        Update: {
          communication_rating?: number
          created_at?: string | null
          created_by?: string | null
          delivery_rating?: number
          id?: string
          notes?: string | null
          partner_id?: string
          quality_rating?: number
          rating_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ratings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      units_of_measure: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      vat_rates: {
        Row: {
          active: boolean | null
          code: string
          id: string
          name: string
          rate: number
        }
        Insert: {
          active?: boolean | null
          code: string
          id?: string
          name: string
          rate: number
        }
        Update: {
          active?: boolean | null
          code?: string
          id?: string
          name?: string
          rate?: number
        }
        Relationships: []
      }
      warehouse_document_lines: {
        Row: {
          counted_quantity: number | null
          difference_quantity: number | null
          document_id: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          counted_quantity?: number | null
          difference_quantity?: number | null
          document_id: string
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          counted_quantity?: number | null
          difference_quantity?: number | null
          document_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "warehouse_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_document_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_date: string
          document_number: string
          document_type: string
          id: string
          location_id: string | null
          notes: string | null
          partner_id: string | null
          posted_at: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          target_location_id: string | null
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_date?: string
          document_number: string
          document_type: string
          id?: string
          location_id?: string | null
          notes?: string | null
          partner_id?: string | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          target_location_id?: string | null
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_date?: string
          document_number?: string
          document_type?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          partner_id?: string | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          target_location_id?: string | null
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_documents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_documents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_documents_target_location_id_fkey"
            columns: ["target_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      absence_type: "annual_leave" | "sick_leave" | "unpaid_leave" | "other"
      asset_status: "active" | "written_off" | "sold"
      check_type: "sanitary_booklet" | "periodic_medical" | "other"
      device_status: "active" | "out_of_service"
      document_status: "draft" | "posted" | "cancelled"
      partner_type: "supplier" | "customer" | "both"
      payment_type: "cash" | "card" | "voucher" | "other"
      payroll_status: "draft" | "processed" | "paid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      absence_type: ["annual_leave", "sick_leave", "unpaid_leave", "other"],
      asset_status: ["active", "written_off", "sold"],
      check_type: ["sanitary_booklet", "periodic_medical", "other"],
      device_status: ["active", "out_of_service"],
      document_status: ["draft", "posted", "cancelled"],
      partner_type: ["supplier", "customer", "both"],
      payment_type: ["cash", "card", "voucher", "other"],
      payroll_status: ["draft", "processed", "paid"],
    },
  },
} as const
