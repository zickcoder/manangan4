import { createClient } from '@supabase/supabase-js';

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwicHJvamVjdF9pZCI6IjM1ODVjMGVjLTQ3NGQtNGI1Yi05ZTA5LTUwNDYyMzZlM2NkYiIsImlhdCI6MTc4OTUzMDM2MywiZXhwIjoyMTA1MTA2MzYzLCJhdWQiOiJlcHJvdmlkZXItcmVzdCIsImlzcyI6ImVwcm92aWRlci1jb250cm9sLXBsYW5lIn0.H1wW4_eXDA7QrlI4bhRgsskCBBlXDT26wIXC2KnPmts';

const urls = [
  'http://supa.eprovider.site',
  'http://supa.eprovider.site/330a2e7808deec92591a',
  'https://pafms2.eprovider.site'
];

async function testUrl(url) {
  console.log(`Testing with @supabase/supabase-js on: ${url}`);
  try {
    const supabase = createClient(url, serviceRoleKey, {
      db: { schema: 'tenant_3585c0ec474d4b5b9e095046236e3cdb' }
    });
    const { data, error } = await supabase.from('users').select('*').limit(5);
    if (error) {
      console.log(`   Error (schema: tenant_...):`, error.message || error);
    } else {
      console.log(`   SUCCESS! Found ${data?.length} users in tenant schema!`, data);
      return;
    }

    // Try default public schema
    const supabasePub = createClient(url, serviceRoleKey);
    const pubRes = await supabasePub.from('users').select('*').limit(5);
    if (pubRes.error) {
      console.log(`   Error (schema: public):`, pubRes.error.message || pubRes.error);
    } else {
      console.log(`   SUCCESS! Found ${pubRes.data?.length} users in public schema!`, pubRes.data);
    }
  } catch (e) {
    console.log(`   Exception:`, e.message);
  }
}

async function run() {
  for (const u of urls) {
    await testUrl(u);
  }
}

run();
