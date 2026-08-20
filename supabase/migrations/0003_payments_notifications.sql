-- ============================================
-- MANITA — Migración 0003: Dinero (L), auditoría (G), webhooks (M), notificaciones
-- ============================================

-- --- PAYMENTS (máquina financiera independiente de booking.status) ---
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_payment_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  -- Máquina de estados financiera (L): independiente de booking.status
  status TEXT NOT NULL DEFAULT 'created',
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payments_status_chk CHECK (status IN
    ('created','authorized','captured','failed','refund_pending','refunded','partially_refunded'))
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT refunds_status_chk CHECK (status IN ('pending','done','failed'))
);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  gross_amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_payout_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payouts_status_chk CHECK (status IN ('pending','processing','paid','failed'))
);

-- --- WEBHOOK idempotencia (M) ---
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',   -- processed | ignored | error
  received_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider, event_id)
);

-- --- NOTIFICATIONS ---
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- AUDIT LOG (G): quién hizo qué, cuándo, sobre qué entidad ---
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor UUID,                    -- auth.uid() del que realizó la acción (NULL = sistema)
  action TEXT NOT NULL,          -- booking_status_change, price_change, pro_verified, cancellation, refund, payout, admin_change, dispute
  entity_type TEXT NOT NULL,     -- booking | professional | payment | refund | payout | profile | review
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_booking        ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment         ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payouts_pro             ON payouts(professional_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pro_start      ON bookings(professional_id, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_client         ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_professionals_cat_rating ON professionals(category_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_professional    ON reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity            ON audit_log(entity_type, entity_id);

-- RLS de tablas sensibles: sin policies => solo service_role (Edge Functions) accede (H)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver mis notificaciones" ON notifications;
CREATE POLICY "Ver mis notificaciones" ON notifications FOR SELECT USING (auth.uid() = user_id);
-- payments/refunds/payouts/audit_log/webhook_events: SIN policy de SELECT para cliente.
-- El cliente ve el estado de pago solo a través de bookings.payment_status (0002/0005).
