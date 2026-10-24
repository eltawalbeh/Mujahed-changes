import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();
const MEDIA_BUCKET = "site-content";
const MEDIA_MAX_SIZE = 25 * 1024 * 1024;
const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

app.use('*', logger(console.log));
app.use("/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization", "apikey"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], exposeHeaders: ["Content-Length"], maxAge: 600 }));

app.get("/make-server-146e5e37/health", (c) => c.json({ status: "ok" }));

function mediaExtension(file: File) {
  return ({ "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" } as Record<string, string>)[file.type] ?? "jpg";
}

app.post("/make-server-146e5e37/media-upload", async (c) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = c.req.header("Authorization");
  if (!supabaseUrl || !serviceRoleKey) return c.json({ error: "Media service is not configured." }, 500);
  if (!authorization) return c.json({ error: "يرجى تسجيل الدخول أولاً." }, 401);

  const { createClient } = await import("jsr:@supabase/supabase-js@2");
  const token = authorization.replace(/^Bearer\s+/i, "");
  const authorized = createClient(supabaseUrl, serviceRoleKey, { global: { headers: { Authorization: authorization } } });
  const { data: user, error: userError } = await authorized.auth.getUser(token);
  if (userError || !user.user) return c.json({ error: "انتهت جلسة تسجيل الدخول. سجّل الدخول مجدداً." }, 401);

  const { data: access, error: accessError } = await authorized.rpc("dashboard_my_access");
  if (accessError || !access) return c.json({ error: "هذا الحساب غير مصرح له برفع الملفات." }, 403);

  try {
    const body = await c.req.formData();
    const file = body.get("file");
    const inputFolder = body.get("folder");
    if (!(file instanceof File)) return c.json({ error: "لم يتم اختيار ملف." }, 400);
    if (!MEDIA_TYPES.has(file.type)) return c.json({ error: "صيغة الملف غير مدعومة." }, 400);
    if (file.size > MEDIA_MAX_SIZE) return c.json({ error: "حجم الملف يجب ألا يتجاوز 25 MB." }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: currentBucket, error: bucketError } = await admin.storage.getBucket(MEDIA_BUCKET);
    if (bucketError && !/not found/i.test(bucketError.message)) throw bucketError;
    if (!currentBucket) {
      const { error } = await admin.storage.createBucket(MEDIA_BUCKET, { public: true, fileSizeLimit: MEDIA_MAX_SIZE, allowedMimeTypes: [...MEDIA_TYPES] });
      if (error && !/already exists/i.test(error.message)) throw error;
    }

    const folder = (typeof inputFolder === "string" ? inputFolder : "uploads").replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "") || "uploads";
    const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${mediaExtension(file)}`;
    const { error: uploadError } = await admin.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return c.json({ publicUrl: data.publicUrl });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "تعذر حفظ الملف." }, 500);
  }
});


/** Phase64: delete ONLY unreferenced product-specific uploaded image objects. */
app.post("/make-server-146e5e37/media-cleanup-product", async (c) => {
  const supabaseUrl=Deno.env.get("SUPABASE_URL"), serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const authorization=c.req.header("Authorization")
  if(!supabaseUrl||!serviceRoleKey)return c.json({error:"Storage service unavailable"},500)
  if(!authorization)return c.json({error:"Unauthenticated"},401)
  const {createClient}=await import("jsr:@supabase/supabase-js@2")
  const userClient=createClient(supabaseUrl,serviceRoleKey,{global:{headers:{Authorization:authorization}}})
  const {data:user,error:userError}=await userClient.auth.getUser(authorization.replace(/^Bearer\\s+/i,""))
  if(userError||!user.user)return c.json({error:"Session expired"},401)
  const {data:access,error:accessError}=await userClient.rpc("dashboard_my_access")
  if(accessError||!access)return c.json({error:"Not authorized"},403)
  const payload=await c.req.json().catch(()=>null)
  const productId=String(payload?.productId??"")
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(productId))return c.json({error:"Invalid product ID"},400)
  if(!Array.isArray(payload?.urls)||payload.urls.length>40||payload.urls.some((v:unknown)=>typeof v!=="string"||v.length>2048))
    return c.json({error:"Invalid image list"},400)
  const admin=createClient(supabaseUrl,serviceRoleKey)
  const origin=new URL(supabaseUrl).origin
  const prefix="/storage/v1/object/public/"+MEDIA_BUCKET+"/products/"+productId+"/primary/"
  let removed=0,shared=0,ignored=0
  for(const imageUrl of [...new Set(payload.urls)] as string[]){
    let fileName=""
    try{
      const u=new URL(imageUrl)
      if(u.origin!==origin||u.search||u.hash||!u.pathname.startsWith(prefix)){ignored++;continue}
      fileName=decodeURIComponent(u.pathname.slice(prefix.length))
    }catch{ignored++;continue}
    if(!/^[A-Za-z0-9_.-]+$/.test(fileName)||fileName==="."||fileName===".."){ignored++;continue}
    const {data:refs,error:refError}=await admin.from("product_images").select("id").eq("image_url",imageUrl).limit(1)
    if(refError)return c.json({error:"Could not verify image references"},500)
    if(refs?.length){shared++;continue}
    const {error}=await admin.storage.from(MEDIA_BUCKET).remove(["products/"+productId+"/primary/"+fileName])
    if(error)return c.json({error:"Storage deletion failed",removed,shared,ignored},500)
    removed++
  }
  return c.json({removed,shared,ignored})
});

Deno.serve(app.fetch);