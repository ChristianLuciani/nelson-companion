-- Nelson Companion — Supabase Schema
-- Aplicar en: Supabase Dashboard → SQL Editor → Run

-- ── TABLAS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS medication_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  text NOT NULL DEFAULT 'nelson_luciani',
  slot_id     text NOT NULL,
  date        date NOT NULL,
  time        text NOT NULL,
  med_id      text,
  med_name    text,
  med_dose    text,
  checked     boolean DEFAULT false,
  checked_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vital_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  text NOT NULL DEFAULT 'nelson_luciani',
  slot_id     text NOT NULL,
  date        date NOT NULL,
  time        text NOT NULL,
  sys         integer,
  dia         integer,
  pul         integer,
  spo2        integer,
  note        text,
  recorded_by text DEFAULT 'cuidador',
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pill_photos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  text NOT NULL DEFAULT 'nelson_luciani',
  med_id      text NOT NULL,
  photo_url   text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(patient_id, med_id)
);

-- ── ÍNDICES ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_med_logs_date    ON medication_logs (patient_id, date);
CREATE INDEX IF NOT EXISTS idx_vital_logs_date  ON vital_logs      (patient_id, date);
CREATE INDEX IF NOT EXISTS idx_pill_photos_med  ON pill_photos     (patient_id, med_id);

-- ── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pill_photos     ENABLE ROW LEVEL SECURITY;

-- MVP: acceso abierto con anon key (un solo paciente, dispositivos de confianza)
-- TODO v0.2: reemplazar con auth por device_id o magic link
CREATE POLICY "anon_full_access" ON medication_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON vital_logs      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON pill_photos     FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── STORAGE ──────────────────────────────────────────────────────────────

-- Ejecutar en Storage → Create bucket:
-- Bucket name: pill-photos
-- Public: true
-- Allowed mime types: image/jpeg, image/png, image/webp

-- ── VISTAS PARA AUDITORÍA MÉDICA ─────────────────────────────────────────

CREATE OR REPLACE VIEW daily_summary AS
SELECT
  v.date,
  v.time,
  v.sys,
  v.dia,
  v.pul,
  v.spo2,
  v.note,
  v.recorded_by,
  v.created_at
FROM vital_logs v
WHERE v.patient_id = 'nelson_luciani'
ORDER BY v.date DESC, v.time ASC;

CREATE OR REPLACE VIEW medication_compliance AS
SELECT
  m.date,
  m.time,
  m.med_name,
  m.med_dose,
  m.checked,
  m.checked_at,
  EXTRACT(EPOCH FROM (m.checked_at - (m.date + m.time::time))) / 60 AS minutes_late
FROM medication_logs m
WHERE m.patient_id = 'nelson_luciani'
  AND m.med_id IS NOT NULL
ORDER BY m.date DESC, m.time ASC;
