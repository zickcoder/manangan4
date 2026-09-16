const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsInByb2plY3RfaWQiOiIzNTg1YzBlYy00NzRkLTRiNWItOWUwOS01MDQ2MjM2ZTNjZGIiLCJpYXQiOjE3ODk1MzAzNzcsImV4cCI6MjEwNTEwNjM3NywiYXVkIjoiZXByb3ZpZGVyLXJlc3QiLCJpc3MiOiJlcHJvdmlkZXItY29udHJvbC1wbGFuZSJ9.xXaonWQzBxlU9RqZd25j4FOc3RIcqcarfJfMx3ofbNo';

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwicHJvamVjdF9pZCI6IjM1ODVjMGVjLTQ3NGQtNGI1Yi05ZTA5LTUwNDYyMzZlM2NkYiIsImlhdCI6MTc4OTUzMDM2MywiZXhwIjoyMTA1MTA2MzYzLCJhdWQiOiJlcHJvdmlkZXItcmVzdCIsImlzcyI6ImVwcm92aWRlci1jb250cm9sLXBsYW5lIn0.H1wW4_eXDA7QrlI4bhRgsskCBBlXDT26wIXC2KnPmts';

async function probe(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    console.log(`PROBE ${url} -> ${res.status}`);
    const text = await res.text();
    console.log(`   DATA: ${text.slice(0, 150)}`);
  } catch (e) {
    console.log(`PROBE ${url} -> ERR: ${e.message}`);
  }
}

async function run() {
  await probe('http://supa.eprovider.site/330a2e7808deec92591a');
  await probe('http://supa.eprovider.site/330a2e7808deec92591a/');
  await probe('http://supa.eprovider.site/330a2e7808deec92591a/rest/v1/');
  await probe('http://supa.eprovider.site/330a2e7808deec92591a/functions/v1/api');
  await probe('http://supa.eprovider.site/330a2e7808deec92591a/api');
}

run();
