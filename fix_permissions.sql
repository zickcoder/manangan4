-- ============================================================================
-- RUN THIS IN YOUR EPROVIDER SQL EDITOR TO GRANT FULL PERMISSIONS
-- This gives the Edge Function & Service Role access to read/write all tables!
-- ============================================================================

GRANT USAGE ON SCHEMA tenant_3585c0ec474d4b5b9e095046236e3cdb TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA tenant_3585c0ec474d4b5b9e095046236e3cdb TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA tenant_3585c0ec474d4b5b9e095046236e3cdb TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA tenant_3585c0ec474d4b5b9e095046236e3cdb TO anon, authenticated, service_role, postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_3585c0ec474d4b5b9e095046236e3cdb 
GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_3585c0ec474d4b5b9e095046236e3cdb 
GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;

-- Also grant on public just in case
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
