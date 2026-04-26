-- Migration: push_subscriptions table
-- Stores Web Push subscriptions for sending medication reminders

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  text NOT NULL DEFAULT 'nelson_luciani',
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subs_patient_idx ON push_subscriptions (patient_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role (used by Edge Function) has full access via service key bypass
-- Anon key allows subscribe/unsubscribe from the client
CREATE POLICY "anon_all" ON push_subscriptions
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
