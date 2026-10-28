// Phase 69 regression checks; run after copying the edited files into the Figma Make source.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=(p)=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const home=read('src/pages/b2c/B2CHomePage.tsx');const card=read('src/components/public/ProductCard.tsx');const gallery=read('src/components/public/ProductGallery.tsx');
assert.match(home,/content\.heroVideoWebmUrl/,'WebM source should be optional');assert.match(home,/type="video\/webm"/);
assert.match(home,/type="video\/mp4"/,'MP4 should remain as compatibility fallback');
assert.match(card,/loading="lazy" decoding="async"/,'Cards should lazy-load product media');
assert.match(gallery,/new Set<string>\(\)/,'Gallery should de-duplicate old image rows by URL');
assert.match(gallery,/loading="eager" decoding="async"/,'Main gallery image should not be lazy');
console.log('PASS Phase 69 static CDN media UI regression checks');
