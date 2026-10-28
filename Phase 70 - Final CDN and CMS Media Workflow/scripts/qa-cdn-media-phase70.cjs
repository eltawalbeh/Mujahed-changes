// Run after merging Phase 70's src/ files into Figma Make.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=(p)=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const media=read('src/lib/mediaUpload.ts');
const home=read('src/pages/b2c/B2CHomePage.tsx');
const image=read('src/components/dashboard/ImageUploadField.tsx');
const video=read('src/components/dashboard/VideoUploadField.tsx');
assert.ok(media.includes('/functions/v1/media-upload-cdn'),'CMS uploads must use CDN function');
assert.doesNotMatch(media,/make-server-146e5e37\/media-upload\x60/,'No old Supabase upload fallback');
assert.ok(media.includes("operation ? {operation} : {}"),'CDN cleanup operation must be explicit');
assert.ok(media.includes('media-cleanup-product'),'Old Supabase cleanup must still work');
assert.ok(home.includes("endsWith('.webm')"),'New WebM hero upload must play');
assert.ok(home.includes('content.heroVideoWebmUrl'),'Original WebM and MP4 sources remain supported');
assert.ok(image.includes('Cloudflare CDN'),'Image upload UI identifies destination');
assert.ok(video.includes('Cloudflare CDN'),'Video upload UI identifies destination');
console.log('PASS Phase 70 Figma Make source checks');
