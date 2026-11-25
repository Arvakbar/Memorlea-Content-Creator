-- Jalankan setelah supabase_setup.sql dan supabase_auth_roles.sql.
-- Aman dijalankan ulang: tidak menghapus booking/paket/voucher yang ada.
BEGIN;
CREATE TABLE IF NOT EXISTS public.service_packages (
  code text PRIMARY KEY CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  price numeric NOT NULL CHECK (price BETWEEN 100000 AND 10000000 AND price = trunc(price)),
  duration_hours numeric NOT NULL CHECK (duration_hours BETWEEN 1 AND 24 AND duration_hours = trunc(duration_hours)),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vouchers (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z0-9_-]{3,24}$'),
  percent numeric NOT NULL CHECK (percent BETWEEN 1 AND 50 AND percent = trunc(percent)),
  min_purchase numeric NOT NULL DEFAULT 0 CHECK (min_purchase BETWEEN 0 AND 10000000 AND min_purchase = trunc(min_purchase)),
  starts_on date NOT NULL,
  ends_on date NOT NULL CHECK (ends_on >= starts_on),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_packages, public.vouchers FROM anon, authenticated;
GRANT SELECT ON public.service_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
DROP POLICY IF EXISTS catalog_public_read ON public.service_packages;
CREATE POLICY catalog_public_read ON public.service_packages FOR SELECT TO anon, authenticated USING (active);
DROP POLICY IF EXISTS catalog_admin ON public.service_packages;
CREATE POLICY catalog_admin ON public.service_packages FOR ALL TO authenticated
  USING ((SELECT public.memorlea_is_admin())) WITH CHECK ((SELECT public.memorlea_is_admin()));
DROP POLICY IF EXISTS vouchers_admin ON public.vouchers;
CREATE POLICY vouchers_admin ON public.vouchers FOR ALL TO authenticated
  USING ((SELECT public.memorlea_is_admin())) WITH CHECK ((SELECT public.memorlea_is_admin()));

INSERT INTO public.service_packages(code, name, price, duration_hours, description) VALUES
 ('luxury','Luxury Wedding',1750000,9,E'Preparation + Akad/Pemberkatan + Reception/Adat. Cocok untuk Batak Wedding atau Luxury Wedding.\n8–9 jam standby; 1 online meeting concept; free Instagram takeover; 2 crew.\nHingga 25 edited IG Story (15 Real Time, 10 Same Day; mix photos & videos), 2 Highlight Moments (15 & 30s), 1 Recap Video, candid photos, 3 TikTok trend videos by request.\nVideo unedited dikirim dalam 48 jam. Belum termasuk transport.'),
 ('parelta','Parelta Package',1000000,8,E'Preparation + Akad/Pemberkatan + Reception/Adat.\nHingga 20 edited IG Story (15 Real Time, 5 Same Day), 1 Recap Video, 2 Highlight Moments (30s & 15s), 3 TikTok trend videos by request.\n1 crew, free Instagram takeover, bonus candid photos. Video unedited dikirim dalam 48 jam. Belum termasuk transport.'),
 ('tara','Tara Package',725000,6,E'Akad/Pemberkatan + Reception/Adat, tanpa preparation.\nHingga 15 edited IG Story (10 Real Time, 5 Same Day), 2 Highlight Moments (30s & 15s), 2 TikTok trend videos by request.\n1 crew, free Instagram takeover, bonus candid photos. Video unedited dikirim dalam 48 jam. Belum termasuk transport.'),
 ('sean','Sean Package',575000,4,E'Akad/Pemberkatan atau Reception Only.\nHingga 10 IG Story Real Time, 1 Recap Video, 2 TikTok trend videos by request.\n1 crew, free Instagram takeover, bonus candid photos. Video unedited dikirim dalam 48 jam. Belum termasuk transport.'),
 ('prewedding','Pre-Wedding',450000,3,E'Engagement, Bridal Shower, Siraman, Sangjit, Prewedd Photoshoot, dan acara sejenis.\nHingga 7 IG Story Same Day, 1 Recap Video, 1 Highlight Moment (30s), 2 TikTok trend videos by request.'),
 ('nonwedding','Non-Wedding',400000,2,E'Graduation, Birthday, Gathering, dan acara sejenis.\n1 Recap Video, 2 Highlight Moments (30s & 15s), 2 TikTok trend videos by request.')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_name_snapshot text,
  ADD COLUMN IF NOT EXISTS package_price numeric,
  ADD COLUMN IF NOT EXISTS package_duration_hours numeric,
  ADD COLUMN IF NOT EXISTS voucher_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric,
  ADD COLUMN IF NOT EXISTS total_price numeric;

-- Harga/voucher tidak dipercaya dari browser. Tanggal promo menggunakan WIB.
CREATE OR REPLACE FUNCTION public.memorlea_quote(p_package text, p_voucher text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  pkg public.service_packages%ROWTYPE;
  promo public.vouchers%ROWTYPE;
  normalized_code text := upper(btrim(coalesce(p_voucher, '')));
  today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  discount numeric := 0;
BEGIN
  SELECT * INTO pkg FROM public.service_packages WHERE service_packages.code = p_package AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paket tidak tersedia. Silakan pilih paket aktif.'; END IF;
  IF normalized_code <> '' THEN
    SELECT * INTO promo FROM public.vouchers WHERE vouchers.code = normalized_code FOR SHARE;
    IF NOT FOUND OR NOT promo.active OR today < promo.starts_on OR today > promo.ends_on THEN
      RAISE EXCEPTION 'Voucher tidak tersedia atau di luar masa berlaku.';
    END IF;
    IF pkg.price < promo.min_purchase THEN RAISE EXCEPTION 'Harga paket belum memenuhi minimal transaksi voucher.'; END IF;
    discount := floor(pkg.price * promo.percent / 100);
  END IF;
  RETURN jsonb_build_object('package_name',pkg.name, 'package_price',pkg.price,
    'duration_hours',pkg.duration_hours,'voucher_code',nullif(normalized_code,''),
    'discount_amount',discount,'total_price',pkg.price-discount);
END;
$$;
REVOKE ALL ON FUNCTION public.memorlea_quote(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.memorlea_quote(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.memorlea_booking_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE quote jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.package, NEW.package_name_snapshot, NEW.package_price, NEW.package_duration_hours,
      NEW.voucher_code, NEW.discount_amount, NEW.total_price)
      IS DISTINCT FROM ROW(OLD.package, OLD.package_name_snapshot, OLD.package_price,
      OLD.package_duration_hours, OLD.voucher_code, OLD.discount_amount, OLD.total_price) THEN
      RAISE EXCEPTION 'Rincian harga booking tersimpan tidak dapat diubah.';
    END IF;
    RETURN NEW;
  END IF;
  quote := public.memorlea_quote(NEW.package, NEW.voucher_code);
  NEW.package_name_snapshot := quote->>'package_name';
  NEW.package_price := (quote->>'package_price')::numeric;
  NEW.package_duration_hours := (quote->>'duration_hours')::numeric;
  NEW.voucher_code := quote->>'voucher_code';
  NEW.discount_amount := (quote->>'discount_amount')::numeric;
  NEW.total_price := (quote->>'total_price')::numeric;
  NEW.status := 'belum_dp';
  NEW.archived := false;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.memorlea_booking_snapshot() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS memorlea_booking_snapshot ON public.bookings;
CREATE TRIGGER memorlea_booking_snapshot BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.memorlea_booking_snapshot();
COMMIT;
