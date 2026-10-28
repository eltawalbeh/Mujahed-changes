import { createClient } from "jsr:@supabase/supabase-js@2";
import md5 from "npm:js-md5@0.8.3";

/** Chef Mujahed Phase 70: authenticated CMS uploads directly to Cloudflare Pages static assets.
 * Token stays in Supabase Edge Function secrets; never in Figma/React.
 * Public CDN GET requests do NOT execute this Edge Function.
 */
const ACCOUNT = "10ec19998627529eb53baa5afb9dc7bb";
const PROJECT = "chef-mujahed-assets";
const CDN = "https://chef-mujahed-assets.pages.dev";
const API = "https://api.cloudflare.com/client/v4";
const IMAGE_TYPES = new Set(["image/webp", "image/png", "image/jpeg"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 25 * 1024 * 1024;
const fileExtensions: Record<string, string> = {
  "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png",
  "video/mp4": "mp4", "video/webm": "webm",
};
const allowedOrigin = (origin: string) =>
  /^https:\/\/(chefmujahed\.com|www\.chefmujahed\.com|([a-z0-9-]+\.)*figma\.site|([a-z0-9-]+\.)*figma\.com)$/.test(origin)
  || /^http:\/\/localhost(:\d+)?$/.test(origin);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin(origin) ? origin : "https://chefmujahed.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
}
function isValidFile(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  if (mime === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (mime === "video/webm") return [0x1a, 0x45, 0xdf, 0xa3].every((b, i) => bytes[i] === b);
  if (mime === "video/mp4") return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  return false;
}
function asBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}
async function cfRequest(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: "Bearer " + token, ...(init.headers as Record<string, string> || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    throw new Error("Cloudflare Pages API failed (" + res.status + "): " +
      (data?.errors?.[0]?.message || "Unable to publish media"));
  }
  return data?.result;
}
async function publish(admin: ReturnType<typeof createClient>, token: string) {
  const { data: rows, error } = await admin.from("cms_media_assets").select("path,hash").order("path");
  if (error) throw error;
  if (!rows?.length) throw new Error("Media manifest is empty.");
  if (rows.length > 19000) throw new Error("Cloudflare Pages file limit approached.");
  const manifest: Record<string, string> = {};
  for (const row of rows) {
    if (!/^\/[a-zA-Z0-9._/-]+$/.test(row.path) || !/^[0-9a-f]{32}$/.test(row.hash)) throw new Error("Invalid manifest entry.");
    manifest[row.path] = row.hash;
  }
  const form = new FormData();
  form.set("manifest", JSON.stringify(manifest));
  form.set("branch", "main");
  form.set("commit_message", "Chef Mujahed CMS media update");
  const d = await cfRequest("/accounts/" + ACCOUNT + "/pages/projects/" + PROJECT + "/deployments", token, { method: "POST", body: form });
  if (!d?.id) throw new Error("Cloudflare deployment did not return an ID.");
  // Return only once the newly published file is truly available.
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 1100));
    const status = await cfRequest("/accounts/" + ACCOUNT + "/pages/projects/" + PROJECT + "/deployments/" + d.id, token);
    if (status?.latest_stage?.status === "success") return;
    if (status?.latest_stage?.status === "failure") throw new Error("Cloudflare deployment failed.");
  }
  throw new Error("Cloudflare deployment not confirmed; retry after checking Pages before uploading again.");
}
async function uploadFile(bytes: Uint8Array, contentType: string, hash: string, token: string) {
  const uploadData = await cfRequest("/accounts/" + ACCOUNT + "/pages/projects/" + PROJECT + "/upload-token", token);
  if (!uploadData?.jwt) throw new Error("Cannot authorize Pages upload.");
  await cfRequest("/pages/assets/upload", uploadData.jwt, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ key: hash, value: asBase64(bytes), base64: true, metadata: { contentType } }]),
  });
  await cfRequest("/pages/assets/upsert-hashes", uploadData.jwt, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hashes: [hash] }),
  });
}
async function handle(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cloudflareToken = Deno.env.get("CLOUDFLARE_PAGES_API_TOKEN") || "";
  if (!supabaseUrl || !serviceKey) return json(req, { error: "خدمة الوسائط غير جاهزة." }, 503);
  if (!cloudflareToken) return json(req, { error: "Cloudflare Pages API token غير مُعدّ. راجع إعدادات Secrets." }, 503);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "يرجى تسجيل الدخول." }, 401);
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || !userData.user) return json(req, { error: "انتهت صلاحية الجلسة." }, 401);
  // RLS-aware dashboard access check; not just a valid user JWT.
  const userClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: "Bearer " + token } },
  });
  const { data: access, error: accessError } = await userClient.rpc("dashboard_my_access");
  if (accessError || !access || !["SUPER_ADMIN", "ADMIN"].includes(String(access.role))) {
    return json(req, { error: "ليس لديك صلاحية إدارة الوسائط." }, 403);
  }
  const owner = crypto.randomUUID();
  const { data: claimed, error: lockError } = await admin.rpc("cms_media_claim_lock", { p_owner: owner });
  if (lockError || !claimed) return json(req, { error: "نشر وسائط آخر قيد التنفيذ. حاول مجددًا بعد قليل." }, 409);
  try {
    const contentType = (req.headers.get("Content-Type") || "").toLowerCase();
    if (contentType.includes("application/json")) {
      const payload = await req.json();
      if (payload?.operation !== "cleanup" || !Array.isArray(payload.urls) || payload.urls.length > 40) {
        return json(req, { error: "طلب تنظيف غير صالح." }, 400);
      }
      const productId = String(payload.productId || "");
      if (!/^[0-9a-f-]{36}$/i.test(productId)) return json(req, { error: "Invalid product ID" }, 400);
      const urls = [...new Set(payload.urls.filter((u: unknown) => typeof u === "string"))] as string[];
      const { data: pages } = await admin.from("site_pages").select("content,content_en").in("page_key", ["home", "about", "footer"]);
      let removed = 0, shared = 0, ignored = 0;
      const toRestore: Array<{path:string,hash:string,content_type:string,byte_size:number}> = [];
      for (const url of urls) {
        if (!url.startsWith(CDN + "/uploads/") || url.includes("?") || url.includes("#")) { ignored++; continue; }
        const path = url.slice(CDN.length);
        const { data: refs, error: refError } = await admin.from("product_images").select("id").eq("image_url", url).limit(1);
        if (refError) throw refError;
        if (refs?.length || pages?.some((p) => JSON.stringify(p).includes(url))) { shared++; continue; }
        const { data: asset } = await admin.from("cms_media_assets").select("*").eq("path", path).maybeSingle();
        if (!asset) { ignored++; continue; }
        const { error: deleteError } = await admin.from("cms_media_assets").delete().eq("path", path);
        if (deleteError) throw deleteError;
        toRestore.push(asset);
        removed++;
      }
      if (removed) {
        try { await publish(admin, cloudflareToken); }
        catch (e) { await admin.from("cms_media_assets").upsert(toRestore); throw e; }
      }
      return json(req, { removed, shared, ignored });
    }
    const body = await req.formData();
    const file = body.get("file");
    const inputFolder = body.get("folder");
    if (!(file instanceof File) || typeof inputFolder !== "string") return json(req, { error: "بيانات الملف غير مكتملة." }, 400);
    if (!IMAGE_TYPES.has(file.type) && !VIDEO_TYPES.has(file.type)) return json(req, { error: "صيغة الملف غير مدعومة." }, 400);
    if (file.size <= 0 || file.size > (VIDEO_TYPES.has(file.type) ? MAX_VIDEO : MAX_IMAGE)) {
      return json(req, { error: "حجم الملف تجاوز الحد المسموح." }, 400);
    }
    const folder = inputFolder.replace(/^\/+|\/+$/g, "");
    if (!/^[a-zA-Z0-9/_-]{1,160}$/.test(folder) || folder.split("/").some((p) => !p || p === "." || p === "..")) {
      return json(req, { error: "مسار الملف غير صالح." }, 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isValidFile(bytes, file.type)) return json(req, { error: "محتوى الملف لا يطابق صيغته." }, 400);
    const path = "/uploads/" + folder + "/" + Date.now() + "-" + crypto.randomUUID().slice(0, 12) + "." + fileExtensions[file.type];
    const hash = md5(bytes);
    await uploadFile(bytes, file.type, hash, cloudflareToken);
    const { error: insertError } = await admin.from("cms_media_assets").insert({
      path, hash, content_type: file.type, byte_size: bytes.length,
    });
    if (insertError) throw insertError;
    try { await publish(admin, cloudflareToken); }
    catch (e) { await admin.from("cms_media_assets").delete().eq("path", path); throw e; }
    return json(req, { publicUrl: CDN + path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر نشر الملف.";
    return json(req, { error: message }, 500);
  } finally {
    await admin.rpc("cms_media_release_lock", { p_owner: owner });
  }
}
Deno.serve(handle);
