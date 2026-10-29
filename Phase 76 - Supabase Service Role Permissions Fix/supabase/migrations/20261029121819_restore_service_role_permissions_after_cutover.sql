-- Chef Mujahed Phase 76: restore service_role access after Supabase cutover.
-- Production migration already applied to Chef Mujahed's BACKUP on 2026-10-29.
-- Compared with the legacy project: all 32 public tables had service_role
-- privileges and all four public sequences supported backend operations.
-- This grant is intentionally for backend-only service_role; it does not
-- increase anon or authenticated access.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
