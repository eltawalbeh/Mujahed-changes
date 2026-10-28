-- Phase 70: secure, server-only manifest for Cloudflare Pages media publications.
-- Only service_role can access these tables/functions; no anon/authenticated grants.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cms_media_assets (
  path text PRIMARY KEY CHECK (path ~ '^/[a-zA-Z0-9._/-]+$'),
  hash text NOT NULL CHECK (hash ~ '^[0-9a-f]{32}$'),
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  byte_size bigint NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cms_media_assets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_media_assets TO service_role;

CREATE TABLE IF NOT EXISTS public.cms_media_publish_lock (
  id int PRIMARY KEY CHECK (id = 1),
  holder uuid,
  expires_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cms_media_publish_lock (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.cms_media_publish_lock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cms_media_publish_lock FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.cms_media_publish_lock TO service_role;

CREATE OR REPLACE FUNCTION public.cms_media_claim_lock(p_owner uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE ok boolean;
BEGIN
  UPDATE cms_media_publish_lock SET holder=p_owner, expires_at=now()+interval '3 minutes'
    WHERE id=1 AND (holder IS NULL OR expires_at < now())
    RETURNING true INTO ok;
  RETURN coalesce(ok,false);
END $$;
CREATE OR REPLACE FUNCTION public.cms_media_release_lock(p_owner uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE ok boolean;
BEGIN
  UPDATE cms_media_publish_lock SET holder=NULL, expires_at=now()
    WHERE id=1 AND holder=p_owner RETURNING true INTO ok;
  RETURN coalesce(ok,false);
END $$;
REVOKE ALL ON FUNCTION public.cms_media_claim_lock(uuid),public.cms_media_release_lock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cms_media_claim_lock(uuid),public.cms_media_release_lock(uuid) TO service_role;

WITH seed AS (SELECT key AS path, value AS hash FROM jsonb_each_text('{"/hero/hero.mp4":"12e984ede98cdf08ed5247b3fdb2ebaf","/hero/hero.webm":"c1ac472847c1e49e49e9255177d9a090","/hero/poster.jpg":"c55357258f49d2ddfabaf51b99c38d34","/index.html":"645f591b41801be26336771c9a27e222","/products/CM-004.webp":"0574cffdf1ec1a78f47d80a2d8977151","/products/CM-020.webp":"39dc31bf4f1307b3ea7cc5ff7faea54f","/products/CM-021.webp":"b453ae7a29d41c779770e456600e705a","/products/CM-022.webp":"b01d11877621133defc67b6c2413c368","/products/CM-023.webp":"64ddbc845928dc6011e735de9859c815","/products/CM-024.webp":"dff64c29a6c1b5f49e676a383cd021bc","/products/CM-043.webp":"0456f7a6c5c5aa1e68ffd4bdd69e5931","/products/CM-050.webp":"601096f3646ca09d26a0d975f2fedbd2","/products/CM-B2C-0001.webp":"6ec75102c7a128cbb0441cd4eb4b50d1","/products/CM-B2C-0002.webp":"2dc8521c81cee93e6ec888b40ae0f1bc","/legacy/products/f363de0d8ac87221292185.png":"e494e2dc4cf7e39272412b54052f0217","/legacy/products/92c8f65d4da41a8eff3d03.png":"557a084c94b003151bcf590900a79391","/legacy/products/13cdcc3a67cba29d33c68e.png":"cc268e0d907d9cf5c1ebcc5423e648c5","/legacy/products/0eadfe06f3e15d2cdf845c.png":"c0ac58196499b2e6e0cb1a133594b377","/legacy/products/52d6735f9d4300f639b5f9.png":"b27b00418790ea781e446339c341dbe6","/legacy/products/8ef656f873200ae1926559.png":"5b5fa503da57aea20d8366d9e1c3c9b1","/legacy/products/bc28ae7d004745cd179815.png":"fb03c55c7e9ece3a813e3615fb07c2a5","/legacy/products/e23b1bbf3c5e1bc583fea3.png":"62ee2073fefdc88b5971f3cfe40e4cec","/legacy/products/05fe27157e68a622fd7066.png":"f51a6e56ce8291dbb3f6e9279f8c335b","/legacy/products/7f5b36de902824f2c590cb.png":"350a177db2b6812831ff3eac6a39be05","/legacy/products/bc78a7c94d960a678c3703.png":"9a88c710fbb2e0430789afaa31657355","/legacy/products/e8373d879f75a82a7e9775.png":"60c24b03ae44facb2e0f6bfcd6dea034","/legacy/products/30e756567d05d1d4b73d6e.png":"a77e7142f7b0ae9c97157c91afeeda68","/legacy/products/67996ee232950b79155298.png":"096bbcca1dba264cb7f53c81bfc1fa3a","/legacy/products/633d810ee20cd26cb475a7.png":"a878e35372e9c221050f1561c3df9f39","/legacy/products/8cd9d60611723dd7fe0b58.png":"51922e72b981a58da21592c5ae648c6c","/legacy/products/819f0494d2f1433d85f723.png":"ac8312afc54b0552b19770ab13c77065","/legacy/products/1505158b55c4e3b139fee6.png":"f14f17a2761ab7b2f8fbd09c5a3576ee","/legacy/products/ae3efed96622cd20a9a104.png":"9a09d98514ffc5170d110c4325bace25","/legacy/products/3b9c480094a82809d210d4.png":"6c996a50b849ebfa5c1d4709b641a4ec","/legacy/products/f3270d40f752b918736cf9.png":"469904bf21875d70342db19708f03960","/legacy/products/acf47756605eda9365067e.png":"7d465213247edba9dc4f180d48e7ac95","/legacy/products/9efb3ca697c089f16e1205.png":"034b3dca6b0f621211c961c95235aab7","/legacy/products/7cc544dc840478a9c70682.png":"974f2a5b959d500cba11b83ae4a2c80c","/legacy/products/b30131c98f04ab4d362772.png":"1c5e3f7eefb86c572b62d5fbabd5e5b0","/legacy/products/949d1e2441c1668145e04e.png":"5707b36e4022b82f36254e956a5ab81e","/legacy/products/7b853f11fb48291292ad45.png":"47d702e350cb6e5cc2efc2fe22ee3e9c","/legacy/products/d248e423ade92e5489fa84.png":"73e3f7093800bd7d21ae3ea9260fcd8a","/legacy/products/f090b4aa078c5303b5adea.png":"415f39a321415cc1fed4a65f6888ed48","/legacy/products/44c2ae3489bac32156ad4d.png":"ad4531dbbbcc83de162ae17be79a20cc","/legacy/products/2475cbc5a5f72e29d2ed2b.png":"3c85b866a747d30e65c8e64498133966","/legacy/products/2580f6ab1e4f201e6926bd.png":"e97b8d6b53e218f5d6e59ed6493c6363","/legacy/products/9351b31ccbb0f4678b18eb.png":"14fb9a10b11f53451c8b9c6f0d065527","/legacy/products/92520fd6660ef8865bdf75.png":"4504aae8b2e5c90cb3a698e9e5324ab6","/legacy/products/02353ca3109046c3976ca0.png":"2e0e6d0f7cfeeb0893011ea40bee725c","/legacy/products/6e40f38693f00f3ac7c45c.png":"14fb9a10b11f53451c8b9c6f0d065527","/legacy/products/4da219dc37af018ae78733.png":"f03206b3ceb4581ecb4f6596a3e8cb1d","/legacy/site/b72e4b845ea3ef928ee5fe.png":"fb1f4ee2c267b342d5bd071e3ab94146","/legacy/site/483aaabf70c043824e723c.png":"11fc8ac33db779a57901b50b05805459","/legacy/site/025df807bdc14d183805d9.png":"249907f719d72dbb8c58432527435da4","/legacy/site/fc1e14d53afd48cc8cf6bd.png":"e42772e4e45205b1b6e302e6a8b6d5ae","/legacy/site/c4f054674c666bc063a945.png":"b5b3a0a8585e3bd211748fcc0c143c07","/legacy/site/ebdbefb17bd4586339d9c3.png":"765d539c3ac69de39bb92c5ea8e09de7","/_headers":"e55138902f5f390da9faaca221056a92"}'::jsonb))
INSERT INTO public.cms_media_assets(path,hash,content_type,byte_size)
SELECT path, hash,
  CASE WHEN path ~ '\.webp$' THEN 'image/webp'
       WHEN path ~ '\.(jpg|jpeg)$' THEN 'image/jpeg'
       WHEN path ~ '\.png$' THEN 'image/png'
       WHEN path ~ '\.mp4$' THEN 'video/mp4'
       WHEN path ~ '\.webm$' THEN 'video/webm'
       WHEN path ~ '\.html$' THEN 'text/html; charset=utf-8'
       ELSE 'text/plain' END, 0
FROM seed ON CONFLICT (path) DO NOTHING;
COMMIT;