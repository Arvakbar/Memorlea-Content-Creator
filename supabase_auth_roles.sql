-- Jalankan SETELAH supabase_setup.sql dan SEBELUM membuka pendaftaran publik.
-- Tidak menghapus tabel/data/policy lama. Akun admin lama harus diaktifkan
-- secara eksplisit (lihat AUTH_SETUP.md), selain itu akses akan ditolak.
BEGIN;

-- Baca metadata tepercaya di server: pencabutan role berlaku tanpa menunggu JWT
-- lama kedaluwarsa. user_metadata tidak pernah dipakai untuk otorisasi.
CREATE OR REPLACE FUNCTION public.memorlea_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = (SELECT auth.uid())
      AND raw_app_meta_data ->> 'role' = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.memorlea_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.memorlea_is_admin() TO authenticated;

DO $$
DECLARE
  target_table text;
BEGIN
  IF to_regclass('public.bookings') IS NULL OR to_regclass('public.stats') IS NULL THEN
    RAISE EXCEPTION 'Jalankan supabase_setup.sql terlebih dahulu';
  END IF;

  FOREACH target_table IN ARRAY ARRAY['bookings', 'crew', 'crew_assignments'] LOOP
    IF to_regclass('public.' || target_table) IS NULL THEN
      RAISE NOTICE 'Tabel % belum ada; jalankan ulang migrasi ini setelah tabel dibuat', target_table;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('DROP POLICY IF EXISTS memorlea_admin_guard ON public.%I', target_table);
    -- RESTRICTIVE di-AND dengan policy lama, termasuk USING(true).
    EXECUTE format('CREATE POLICY memorlea_admin_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.memorlea_is_admin())) WITH CHECK ((SELECT public.memorlea_is_admin()))', target_table);
    EXECUTE format('DROP POLICY IF EXISTS memorlea_admin_access ON public.%I', target_table);
    EXECUTE format('CREATE POLICY memorlea_admin_access ON public.%I FOR ALL TO authenticated USING ((SELECT public.memorlea_is_admin())) WITH CHECK ((SELECT public.memorlea_is_admin()))', target_table);
    -- Data kru tidak memiliki operasi publik. Tutup juga policy anon lama.
    IF target_table <> 'bookings' THEN
      EXECUTE format('DROP POLICY IF EXISTS memorlea_no_public_crew ON public.%I', target_table);
      EXECUTE format('CREATE POLICY memorlea_no_public_crew ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)', target_table);
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memorlea_stats_insert_guard ON public.stats;
CREATE POLICY memorlea_stats_insert_guard ON public.stats AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.memorlea_is_admin()));
DROP POLICY IF EXISTS memorlea_stats_update_guard ON public.stats;
CREATE POLICY memorlea_stats_update_guard ON public.stats AS RESTRICTIVE
  FOR UPDATE TO authenticated USING ((SELECT public.memorlea_is_admin())) WITH CHECK ((SELECT public.memorlea_is_admin()));
DROP POLICY IF EXISTS memorlea_stats_delete_guard ON public.stats;
CREATE POLICY memorlea_stats_delete_guard ON public.stats AS RESTRICTIVE
  FOR DELETE TO authenticated USING ((SELECT public.memorlea_is_admin()));
-- Counter bersifat publik; pembacaan tetap tersedia saat login maupun logout.
DROP POLICY IF EXISTS memorlea_stats_read ON public.stats;
CREATE POLICY memorlea_stats_read ON public.stats FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS memorlea_stats_admin ON public.stats;
CREATE POLICY memorlea_stats_admin ON public.stats FOR ALL TO authenticated
  USING ((SELECT public.memorlea_is_admin())) WITH CHECK ((SELECT public.memorlea_is_admin()));

COMMIT;
