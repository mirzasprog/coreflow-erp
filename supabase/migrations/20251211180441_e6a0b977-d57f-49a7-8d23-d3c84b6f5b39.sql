
-- Core lookup/configuration tables
CREATE TYPE document_status AS ENUM ('draft', 'posted', 'cancelled');
CREATE TYPE partner_type AS ENUM ('supplier', 'customer', 'both');
CREATE TYPE payment_type AS ENUM ('cash', 'card', 'voucher', 'other');
CREATE TYPE absence_type AS ENUM ('annual_leave', 'sick_leave', 'unpaid_leave', 'other');
CREATE TYPE asset_status AS ENUM ('active', 'written_off', 'sold');
CREATE TYPE device_status AS ENUM ('active', 'out_of_service');
CREATE TYPE check_type AS ENUM ('sanitary_booklet', 'periodic_medical', 'other');

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Locations (warehouses, stores, offices)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'warehouse',
  address TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Item categories
CREATE TABLE public.item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES public.item_categories(id),
  active BOOLEAN DEFAULT true
);

-- VAT rates
CREATE TABLE public.vat_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  active BOOLEAN DEFAULT true
);

-- Units of measure
CREATE TABLE public.units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL
);

-- Items/Articles
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.item_categories(id),
  unit_id UUID REFERENCES public.units_of_measure(id),
  vat_rate_id UUID REFERENCES public.vat_rates(id),
  barcode VARCHAR(50),
  purchase_price DECIMAL(15,2) DEFAULT 0,
  selling_price DECIMAL(15,2) DEFAULT 0,
  min_stock DECIMAL(15,3) DEFAULT 0,
  max_stock DECIMAL(15,3) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business partners
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type partner_type DEFAULT 'both',
  tax_id VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  payment_terms_days INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stock per warehouse
CREATE TABLE public.stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(15,3) DEFAULT 0,
  reserved_quantity DECIMAL(15,3) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, location_id)
);

-- Chart of accounts
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50),
  parent_id UUID REFERENCES public.accounts(id),
  active BOOLEAN DEFAULT true
);

-- Employees
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  company_id UUID REFERENCES public.companies(id),
  department_id UUID REFERENCES public.departments(id),
  location_id UUID REFERENCES public.locations(id),
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  jmbg VARCHAR(20),
  position VARCHAR(100),
  hire_date DATE,
  termination_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee contracts
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  contract_type VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE,
  working_hours INTEGER DEFAULT 40,
  salary DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Absences
CREATE TABLE public.absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  type absence_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  approved BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Warehouse documents (goods receipt, issue, transfer, inventory)
CREATE TABLE public.warehouse_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(50) NOT NULL,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id UUID REFERENCES public.locations(id),
  target_location_id UUID REFERENCES public.locations(id),
  partner_id UUID REFERENCES public.partners(id),
  status document_status DEFAULT 'draft',
  notes TEXT,
  total_value DECIMAL(15,2) DEFAULT 0,
  created_by UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Warehouse document lines
CREATE TABLE public.warehouse_document_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.warehouse_documents(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) DEFAULT 0,
  counted_quantity DECIMAL(15,3),
  difference_quantity DECIMAL(15,3),
  notes TEXT
);

-- Invoices (incoming and outgoing)
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type VARCHAR(20) NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  partner_id UUID REFERENCES public.partners(id),
  status document_status DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  warehouse_document_id UUID REFERENCES public.warehouse_documents(id),
  created_by UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice lines
CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id),
  description TEXT,
  quantity DECIMAL(15,3) DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  vat_rate_id UUID REFERENCES public.vat_rates(id),
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0
);

-- GL Journal entries
CREATE TABLE public.gl_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  status document_status DEFAULT 'posted',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- GL Journal entry lines
CREATE TABLE public.gl_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.gl_entries(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) NOT NULL,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  partner_id UUID REFERENCES public.partners(id),
  description TEXT
);

-- Fixed assets
CREATE TABLE public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  location_id UUID REFERENCES public.locations(id),
  custodian_id UUID REFERENCES public.employees(id),
  purchase_date DATE,
  purchase_value DECIMAL(15,2) DEFAULT 0,
  current_value DECIMAL(15,2) DEFAULT 0,
  useful_life_years INTEGER DEFAULT 5,
  depreciation_method VARCHAR(50) DEFAULT 'linear',
  status asset_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Depreciation records
CREATE TABLE public.depreciation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.fixed_assets(id) ON DELETE CASCADE NOT NULL,
  period_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  gl_entry_id UUID REFERENCES public.gl_entries(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- POS terminals
CREATE TABLE public.pos_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100),
  location_id UUID REFERENCES public.locations(id),
  terminal_type VARCHAR(20) DEFAULT 'classic',
  active BOOLEAN DEFAULT true
);

-- POS receipts
CREATE TABLE public.pos_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) NOT NULL,
  terminal_id UUID REFERENCES public.pos_terminals(id),
  cashier_id UUID REFERENCES public.employees(id),
  receipt_date TIMESTAMPTZ DEFAULT now(),
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  payment_type payment_type DEFAULT 'cash',
  is_return BOOLEAN DEFAULT false,
  original_receipt_id UUID REFERENCES public.pos_receipts(id),
  shift_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- POS receipt lines
CREATE TABLE public.pos_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES public.pos_receipts(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  vat_rate_id UUID REFERENCES public.vat_rates(id),
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL
);

-- POS shifts
CREATE TABLE public.pos_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id UUID REFERENCES public.pos_terminals(id),
  cashier_id UUID REFERENCES public.employees(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  opening_amount DECIMAL(15,2) DEFAULT 0,
  closing_amount DECIMAL(15,2),
  total_sales DECIMAL(15,2) DEFAULT 0,
  total_returns DECIMAL(15,2) DEFAULT 0,
  cash_sales DECIMAL(15,2) DEFAULT 0,
  card_sales DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Safety devices
CREATE TABLE public.safety_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code VARCHAR(50) NOT NULL UNIQUE,
  device_type VARCHAR(100) NOT NULL,
  name VARCHAR(255),
  location_id UUID REFERENCES public.locations(id),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  installation_date DATE,
  last_inspection_date DATE,
  inspection_interval_months INTEGER DEFAULT 12,
  next_inspection_date DATE,
  status device_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safety inspections
CREATE TABLE public.safety_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.safety_devices(id) ON DELETE CASCADE NOT NULL,
  inspection_date DATE NOT NULL,
  inspector_name VARCHAR(255),
  inspector_company VARCHAR(255),
  result VARCHAR(50),
  passed BOOLEAN DEFAULT true,
  notes TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Employee medical/sanitary checks
CREATE TABLE public.medical_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  check_type check_type NOT NULL,
  check_date DATE NOT NULL,
  valid_until DATE,
  result VARCHAR(100),
  notes TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_checks ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users (simplified - all authenticated users can access for now)
CREATE POLICY "Allow all for authenticated" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.item_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.vat_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.units_of_measure FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.partners FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.absences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.warehouse_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.warehouse_document_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.invoice_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.gl_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.gl_entry_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.fixed_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.depreciation_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.pos_terminals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.pos_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.pos_receipt_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.pos_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.safety_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.safety_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.medical_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed data
INSERT INTO public.companies (code, name, tax_id, address) VALUES
('MAIN', 'Main Company d.o.o.', '4000000000000', 'Sarajevo, Bosnia');

INSERT INTO public.vat_rates (code, name, rate) VALUES
('PDV17', 'Standard PDV 17%', 17.00),
('PDV0', 'Zero VAT', 0.00);

INSERT INTO public.units_of_measure (code, name) VALUES
('KOM', 'Komad'),
('KG', 'Kilogram'),
('L', 'Litar'),
('M', 'Metar');

INSERT INTO public.item_categories (code, name) VALUES
('RAW', 'Raw Materials'),
('FINISHED', 'Finished Goods'),
('SERVICES', 'Services');

INSERT INTO public.accounts (code, name, account_type) VALUES
('1000', 'Cash', 'asset'),
('1100', 'Inventory', 'asset'),
('2000', 'Accounts Payable', 'liability'),
('2100', 'Accounts Receivable', 'asset'),
('4000', 'Sales Revenue', 'revenue'),
('5000', 'Cost of Goods Sold', 'expense'),
('6000', 'Depreciation Expense', 'expense');
