-- Phase 69 optional rollback: restore original Supabase Storage URLs only while the corresponding Pages URLs remain assigned.
-- Does NOT delete Cloudflare files, R2 objects or product records.
BEGIN;
WITH mapping(sku, old_url, cdn_url) AS (VALUES
  ('CM-004', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/af619d61-f1e3-433b-8011-b7f4914d2f8b/primary/1792838055659-b52e5358.jpg', 'https://chef-mujahed-assets.pages.dev/products/CM-004.webp'),
  ('CM-020', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/affbcba2-01d4-455d-aefc-e93f662248b8/primary/1792835085008-e1a78675.jpg', 'https://chef-mujahed-assets.pages.dev/products/CM-020.webp'),
  ('CM-021', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/b5cdf175-d9d6-49c5-96ea-7ce575b1ca58/primary/1792835532818-0aa1280a.jpg', 'https://chef-mujahed-assets.pages.dev/products/CM-021.webp'),
  ('CM-022', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/29b65486-4a03-4de1-9d9c-9b2b6a8a8e7c/primary/1792837338249-12d8355d.jpg', 'https://chef-mujahed-assets.pages.dev/products/CM-022.webp'),
  ('CM-023', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/be4af9a6-198e-4c7c-a828-fda01b981a44/primary/1792835471153-c273556f.jpg', 'https://chef-mujahed-assets.pages.dev/products/CM-023.webp'),
  ('CM-024', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/a8509ae8-7e2f-4108-b5c3-abcf45723aed/primary/1792837710761-f6c8b071.jpg', 'https://chef-mujahed-assets.pages.dev/products/CM-024.webp'),
  ('CM-043', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/8b28c1b0-e8cc-4d3c-bf47-81c6a0f37d3f/primary/1792238700815-a7176041.png', 'https://chef-mujahed-assets.pages.dev/products/CM-043.webp'),
  ('CM-050', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/e4657fb7-290d-47e1-9899-3fbf292c170b/primary/1792238320829-44e59a92.png', 'https://chef-mujahed-assets.pages.dev/products/CM-050.webp'),
  ('CM-B2C-0001', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/31fda3d6-4d1c-4043-9985-73589e5bb476/primary/1792840524105-72105dca.jpg', 'https://chef-mujahed-assets.pages.dev/products/CM-B2C-0001.webp'),
  ('CM-B2C-0002', 'https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/products/b4ae62da-2cc0-4367-87f5-d2431f4e93d2/primary/1792828553905-0664bbc7.jpg', 'https://chef-mujahed-assets.pages.dev/products/CM-B2C-0002.webp')
)
UPDATE public.product_images i SET image_url=m.old_url
FROM public.products p JOIN mapping m ON m.sku=p.sku
WHERE i.product_id=p.id AND i.image_url=m.cdn_url;
UPDATE public.site_pages
SET content = jsonb_set(jsonb_set(content - 'heroVideoWebmUrl','{heroVideoUrl}',to_jsonb('https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/cms/home/heroVideoUrl/1792234305772-7a3f6669.mp4'::text),true),'{heroPosterUrl}',to_jsonb('https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/cms/home/heroPosterUrl/1792234405921-0e995ad4.jpg'::text),true),
content_en = CASE WHEN content_en IS NULL THEN NULL ELSE jsonb_set(jsonb_set(content_en - 'heroVideoWebmUrl','{heroVideoUrl}',to_jsonb('https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/cms/home/heroVideoUrl/1792234305772-7a3f6669.mp4'::text),true),'{heroPosterUrl}',to_jsonb('https://hqvxhhhwzhefydvwlpje.supabase.co/storage/v1/object/public/site-content/cms/home/heroPosterUrl/1792234405921-0e995ad4.jpg'::text),true) END,
updated_at = now()
WHERE page_key='home' AND content->>'heroVideoUrl'='https://chef-mujahed-assets.pages.dev/hero/hero.mp4' AND content->>'heroPosterUrl'='https://chef-mujahed-assets.pages.dev/hero/poster.jpg';
COMMIT;
