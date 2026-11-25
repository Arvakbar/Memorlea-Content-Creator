-- Pelengkap skema Bookings dan Kru yang digunakan admin.js.
-- Urutan: setup -> file ini -> auth_roles -> catalog -> demo_seed (opsional).
-- CREATE IF NOT EXISTS mempertahankan tabel/data yang sudah ada.
BEGIN;
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS admin_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status_log jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE IF NOT EXISTS public.crew (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  city text,
  role text NOT NULL DEFAULT 'Content Creator',
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','nonaktif')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crew_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES public.crew(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, crew_id)
);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_crew ON public.crew_assignments(crew_id);
ALTER TABLE public.crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crew, public.crew_assignments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew, public.crew_assignments TO authenticated;
-- Kebijakan admin dipasang oleh supabase_auth_roles.sql setelah file ini.
COMMIT;
