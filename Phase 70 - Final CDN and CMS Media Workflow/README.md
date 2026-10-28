# Phase 70 — Chef Mujahed: Cloudflare CDN end-to-end

## Confirmed completed in production on 28 October 2026
- Static Cloudflare Pages project: https://chef-mujahed-assets.pages.dev — no custom domain or DNS changes.
- Pages includes 58 media/config files; 43 old media files were uploaded and passed HTTP 200 plus exact SHA256 comparison.
- All 71 product_images records now point to Cloudflare Pages, zero point at Supabase Storage.
- Site pages Home, About and Footer contain zero Supabase Storage links.
- Old Supabase Storage files are retained; none were deleted.
- Two Supabase SQL migrations in this folder have already been applied.
- New Edge Function media-upload-cdn has been deployed with JWT verification enabled.
- Two private, RLS-protected manifest/lock tables were set up. Neither anon nor authenticated users can query them.
- ChefMujahedNew has NOT been edited by this assistant.

## Mandatory one-time secret setup before updating Figma Make
The existing Cloudflare OAuth connection does not have scope to create permanent account API tokens. A secure token cannot be placed in frontend code.

1. Open Cloudflare → My Profile → API Tokens. Create a Custom API Token with Account / Cloudflare Pages / Edit permission, scoped to the Cloudflare account holding chef-mujahed-assets.
2. Open Supabase project hqvxhhhwzhefydvwlpje → Edge Functions → Secrets. Save the token as CLOUDFLARE_PAGES_API_TOKEN. Never place it in Figma, GitHub or chat.
3. ONLY THEN replace these 4 files inside Figma Make and publish:
   src/lib/mediaUpload.ts
   src/components/dashboard/ImageUploadField.tsx
   src/components/dashboard/VideoUploadField.tsx
   src/pages/b2c/B2CHomePage.tsx
4. Log in as Admin; upload a small WebP; verify the resulting URL starts with https://chef-mujahed-assets.pages.dev/uploads/ and the image appears in product public pages. Test video upload and a test B2C order.
5. Run node scripts/qa-cdn-media-phase70.cjs in the merged source if a local checkout is available.

## Already done — DO NOT run these again
- supabase/migrations/20261028090000_legacy_media_pages_cutover.sql
- supabase/migrations/20261028091000_cms_media_manifest_and_lock.sql
- Edge Function media-upload-cdn is deployed; source here is for reference.

## Operation
Authenticated CMS → server-side role check for SUPER_ADMIN / ADMIN → static Pages upload → manifest lock and registration → new Pages deployment → successful deployment check → versioned public CDN URL. The Cloudflare token exists ONLY in Supabase secrets. Neither static media GET requests nor order flows execute the uploader.

Cleanup checks database references before removing new CDN uploads from the current Pages manifest. Existing Supabase Storage cleanup remains available; old historical Pages deployment URLs may still exist.

## Free-plan limits and remaining caveats
- Cloudflare Pages Free has 500 builds/deployments per month; each CMS media upload/cleanup causes a new deployment. Avoid unnecessary bulk uploading from CMS in one month.
- Existing over-quota Supabase usage does not retroactively disappear.
- Actual CDN uploads have not been tested end-to-end until the Cloudflare secret is provided; the function fails closed (503) when unconfigured.
- The Pages _headers file was uploaded, but HTTP test still returns Cache-Control: public, max-age=0, must-revalidate; do not assume browser long-term caching is active. Public media is nevertheless delivered from Cloudflare, not Supabase.
- Cloudflare Pages is a static publisher; original files in R2/Supabase remain useful backups.
