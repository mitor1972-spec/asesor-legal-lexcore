
-- Tabla principal de pagos del marketplace
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_gateway TEXT NOT NULL DEFAULT 'stripe',
  transaction_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lawfirm_id UUID REFERENCES public.lawfirms(id) ON DELETE SET NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX idx_payments_lawfirm_id ON public.payments(lawfirm_id);
CREATE INDEX idx_payments_lead_id ON public.payments(lead_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_gateway ON public.payments(payment_gateway);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admins/internal can manage all
CREATE POLICY "Internal users can manage all payments"
  ON public.payments FOR ALL
  USING (is_internal_user(auth.uid()));

-- Lawfirm users can view their payments
CREATE POLICY "Lawfirm users can view their payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- Lawfirm users can insert payments for their lawfirm
CREATE POLICY "Lawfirm users can insert their payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

COMMENT ON TABLE public.payments IS 'Registro de todos los pagos del marketplace multi-pasarela';
