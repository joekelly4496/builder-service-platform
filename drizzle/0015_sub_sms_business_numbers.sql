-- Phase 3: SMS Business Numbers for Subcontractors

-- Sub Pro subscription fields on subcontractors
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS is_sub_pro BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS stripe_sms_subscription_item_id VARCHAR(255);

-- SMS business number fields on subcontractors
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS twilio_phone_number_sid TEXT;

-- Sub SMS messages table (linked to job records)
CREATE TABLE IF NOT EXISTS sub_sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  service_request_id UUID REFERENCES service_requests(id),
  direction TEXT NOT NULL, -- 'outbound' or 'inbound'
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_message_sid TEXT,
  cost_cents INTEGER,
  status TEXT DEFAULT 'sent',
  stripe_usage_reported BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Sub SMS opt-outs (TCPA compliance)
CREATE TABLE IF NOT EXISTS sub_sms_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  phone_number TEXT NOT NULL,
  opted_out_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_sms_messages_sub_id ON sub_sms_messages(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sub_sms_messages_service_request ON sub_sms_messages(service_request_id);
CREATE INDEX IF NOT EXISTS idx_sub_sms_messages_to_number ON sub_sms_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_sub_sms_messages_created_at ON sub_sms_messages(subcontractor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sub_sms_opt_outs_lookup ON sub_sms_opt_outs(subcontractor_id, phone_number);

-- RLS
ALTER TABLE sub_sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_sms_opt_outs ENABLE ROW LEVEL SECURITY;

-- Subs can only see their own messages
CREATE POLICY sub_sms_messages_sub_access ON sub_sms_messages
  FOR ALL USING (
    subcontractor_id::text = (
      SELECT coalesce(
        current_setting('request.jwt.claims', true)::jsonb ->> 'subcontractor_id',
        current_setting('request.jwt.claim.subcontractor_id', true)
      )
    )
  );

CREATE POLICY sub_sms_opt_outs_sub_access ON sub_sms_opt_outs
  FOR ALL USING (
    subcontractor_id::text = (
      SELECT coalesce(
        current_setting('request.jwt.claims', true)::jsonb ->> 'subcontractor_id',
        current_setting('request.jwt.claim.subcontractor_id', true)
      )
    )
  );
