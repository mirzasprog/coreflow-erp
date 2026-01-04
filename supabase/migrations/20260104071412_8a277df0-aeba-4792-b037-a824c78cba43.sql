-- Bank statements table for reconciliation
CREATE TABLE public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_name VARCHAR NOT NULL,
  account_number VARCHAR,
  opening_balance NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  currency VARCHAR DEFAULT 'EUR',
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  imported_by UUID,
  notes TEXT
);

-- Bank statement lines (individual transactions)
CREATE TABLE public.bank_statement_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT,
  reference VARCHAR,
  amount NUMERIC NOT NULL,
  transaction_type VARCHAR, -- 'credit' or 'debit'
  partner_name VARCHAR,
  partner_account VARCHAR,
  matched BOOLEAN DEFAULT false,
  matched_invoice_id UUID REFERENCES public.invoices(id),
  matched_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all authenticated" ON public.bank_statements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON public.bank_statement_lines FOR ALL USING (true) WITH CHECK (true);

-- Index for faster matching
CREATE INDEX idx_bank_statement_lines_statement_id ON public.bank_statement_lines(statement_id);
CREATE INDEX idx_bank_statement_lines_matched ON public.bank_statement_lines(matched);
CREATE INDEX idx_bank_statement_lines_amount ON public.bank_statement_lines(amount);