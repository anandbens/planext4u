ALTER TABLE public.video_ads
  ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'floating',
  ADD COLUMN IF NOT EXISTS show_delay_seconds integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS auto_open_fullscreen boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.video_ads.display_mode IS 'How the ad appears on the customer home: floating (small PiP) or fullscreen (overlay)';
COMMENT ON COLUMN public.video_ads.show_delay_seconds IS 'Seconds to wait after page load before showing the ad';
COMMENT ON COLUMN public.video_ads.auto_open_fullscreen IS 'For floating mode: open fullscreen automatically when user taps the floating widget';