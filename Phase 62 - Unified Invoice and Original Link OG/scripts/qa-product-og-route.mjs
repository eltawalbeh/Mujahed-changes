import assert from 'node:assert/strict';
import worker from '../infra/og-product-routing/cloudflare-worker.mjs';

const original = globalThis.fetch;
const requests = [];
globalThis.fetch = async (request) => {
  const target = typeof request === 'string' ? request : request.url;
  requests.push(target);
  if (target.startsWith('https://hqvxhhhwzhefydvwlpje.supabase.co/')) {
    if (target.includes('hidden-item')) return new Response('Not found', {status:404});
    return new Response(`<!doctype html><head>
      <meta property="og:title" content="Pumpkin Donut"/>
      <meta property="og:image" content="https://example.com/pumpkin.jpg"/>
      <meta property="og:url" content="https://other.example/link"/>
      <meta http-equiv="refresh" content="1;url=https://chefmujahed.com/product/cm-050"/>
    </head><script>window.location.replace("https://chefmujahed.com/product/cm-050")</script>`,
      {status:200,headers:{'content-type':'text/html'}});
  }
  return new Response('NORMAL STORE FRONTEND',{status:200});
};

const domain='https://chefmujahed.com';
const bot=new Request(domain+'/product/cm-050',{headers:{'user-agent':'WhatsApp/2.3'}});
const publicResult=await worker.fetch(bot,{});
const html=await publicResult.text();
assert.equal(publicResult.status,200);
assert.match(html,/og:image.*pumpkin\.jpg/);
assert.match(html,/og:url" content="https:\/\/chefmujahed.com\/product\/cm-050/);
assert.doesNotMatch(html,/http-equiv="refresh"|window\.location\.replace/);
assert.equal(requests.length,1);
assert.match(requests[0],/channel=B2C/);

const human=await worker.fetch(new Request(domain+'/product/cm-050',{headers:{'user-agent':'Mozilla/5.0'}}),{});
assert.equal(await human.text(),'NORMAL STORE FRONTEND');

const b2b=await worker.fetch(new Request(domain+'/business/product/b2b-test',{headers:{'user-agent':'facebookexternalhit/1.1'}}),{});
assert.equal(b2b.status,200);
assert.match(requests.at(-1),/channel=B2B/);

const hidden=await worker.fetch(new Request(domain+'/product/hidden-item',{headers:{'user-agent':'Twitterbot'}}),{});
assert.equal(hidden.status,404);

const other=await worker.fetch(new Request(domain+'/request/checkout',{headers:{'user-agent':'WhatsApp/2.3'}}),{});
assert.equal(await other.text(),'NORMAL STORE FRONTEND');
globalThis.fetch=original;
console.log('OG routing QA passed: B2C, B2B, human passthrough, hidden product, unrelated route');
