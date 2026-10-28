import { createClient } from "jsr:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")||"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"");
const cors=(r:Request)=>({"Access-Control-Allow-Origin":/^(https:\/\/(www\.)?chefmujahed\.com|https:\/\/[a-z0-9.-]+\.figma\.site|http:\/\/localhost:\d+)$/.test(r.headers.get("origin")||"")?(r.headers.get("origin")||""):"https://chefmujahed.com","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"});
const reply=(r:Request,x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors(r),"content-type":"application/json","cache-control":"no-store"}});
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=="POST")return reply(req,{error:"method not allowed"},405);
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!jwt)return reply(req,{error:"تسجيل الدخول مطلوب"},401);
 const {data:auth,error:aerr}=await db.auth.getUser(jwt);
 if(aerr||!auth.user)return reply(req,{error:"جلسة غير صالحة"},401);
 const user=auth.user.id;
 const {data:staff}=await db.from("dashboard_users").select("status,role").eq("user_id",user).maybeSingle();
 if(staff?.status!=="ACTIVE"||!["SUPER_ADMIN","ADMIN","SUPERVISOR"].includes(staff.role))return reply(req,{error:"ليس لديك صلاحية الوصول"},403);
 let body:Record<string,any>={};
 try{body=await req.json()}catch{return reply(req,{error:"invalid json"},400)}
 try{
   if(body.action==="status"){
     const [{data:pref},{data:links},{data:subs}]=await Promise.all([
       db.from("staff_notification_preferences").select("*").eq("user_id",user).maybeSingle(),
       db.from("staff_telegram_links").select("chat_id,linked_at").eq("user_id",user).maybeSingle(),
       db.from("staff_push_subscriptions").select("endpoint").eq("user_id",user)
     ]);
     return reply(req,{preferences:pref||{web_push_enabled:true,telegram_enabled:true,event_types:["NEW","AWAITING_CONFIRMATION","APPROVED","READY","OUT_FOR_DELIVERY","CANCELLED"]},telegramLinked:Boolean(links),pushDevices:subs?.length||0,vapidPublicKey:Deno.env.get("STAFF_VAPID_PUBLIC_KEY")||"",pushConfigured:Boolean(Deno.env.get("STAFF_VAPID_PUBLIC_KEY")&&Deno.env.get("STAFF_VAPID_PRIVATE_KEY")),telegramConfigured:Boolean(Deno.env.get("STAFF_TELEGRAM_BOT_TOKEN")&&Deno.env.get("STAFF_TELEGRAM_WEBHOOK_SECRET"))});
   }
   if(body.action==="preferences"){
     const allowed=["NEW","AWAITING_CONFIRMATION","APPROVED","PREPARING","READY","OUT_FOR_DELIVERY","COMPLETED","CANCELLED"];
     const types=Array.isArray(body.event_types)?body.event_types.filter((x:unknown)=>typeof x==="string"&&allowed.includes(x)).slice(0,8):[];
     const {error}=await db.from("staff_notification_preferences").upsert({user_id:user,web_push_enabled:body.web_push_enabled===true,telegram_enabled:body.telegram_enabled===true,event_types:types,updated_at:new Date().toISOString()});
     if(error)throw error;return reply(req,{ok:true});
   }
   if(body.action==="subscribe_push"){
     const s=body.subscription;
     if(!s||typeof s.endpoint!=="string"||s.endpoint.length>2000||!s.endpoint.startsWith("https://")||typeof s.keys?.p256dh!=="string"||typeof s.keys?.auth!=="string"||s.keys.p256dh.length>300||s.keys.auth.length>200)return reply(req,{error:"invalid push subscription"},400);
     const {error}=await db.from("staff_push_subscriptions").upsert({user_id:user,endpoint:s.endpoint,p256dh:s.keys.p256dh,auth_key:s.keys.auth,created_at:new Date().toISOString(),failed_at:null},{onConflict:"endpoint"});
     if(error)throw error;return reply(req,{ok:true});
   }
   if(body.action==="unsubscribe_push"){
     if(typeof body.endpoint!=="string")return reply(req,{error:"endpoint required"},400);
     const {error}=await db.from("staff_push_subscriptions").delete().eq("user_id",user).eq("endpoint",body.endpoint);
     if(error)throw error;return reply(req,{ok:true});
   }
   if(body.action==="telegram_link"){
     const token=Deno.env.get("STAFF_TELEGRAM_BOT_TOKEN");
     if(!token)return reply(req,{error:"Telegram bot token غير مُعد في Supabase Secrets"},503);
     const profile=await fetch("https://api.telegram.org/bot"+token+"/getMe").then(x=>x.json());
     if(!profile.ok||!profile.result?.username)throw Error("Telegram bot غير متاح");
     const code=Array.from(crypto.getRandomValues(new Uint8Array(14))).map(x=>x.toString(16).padStart(2,"0")).join("");
     await db.from("staff_telegram_link_codes").delete().eq("user_id",user);
     const {error}=await db.from("staff_telegram_link_codes").insert({code_hash:await sha(code),user_id:user,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
     if(error)throw error;
     return reply(req,{url:"https://t.me/"+profile.result.username+"?start="+code,expiresInSeconds:600});
   }
   if(body.action==="unlink_telegram"){
     const {error}=await db.from("staff_telegram_links").delete().eq("user_id",user);
     if(error)throw error;return reply(req,{ok:true});
   }
   return reply(req,{error:"unknown action"},400);
 }catch(err){return reply(req,{error:err instanceof Error?err.message:"server error"},500)}
});