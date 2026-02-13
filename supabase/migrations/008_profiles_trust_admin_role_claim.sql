-- Date: 2026-02-11
-- Adds a persisted role claim for trust-registry governance checks.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_trust_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_trust_admin IS
    'Role claim used by backend trust-registry governance endpoints.';

CREATE INDEX IF NOT EXISTS idx_profiles_is_trust_admin_true
    ON public.profiles (is_trust_admin)
    WHERE is_trust_admin = true;
