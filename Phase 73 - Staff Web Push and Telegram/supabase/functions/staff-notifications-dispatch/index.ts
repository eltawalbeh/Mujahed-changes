import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const db=createClient(Deno.env.get("SUPABASE_URL")||"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"");
const fixedEquals=(a:string,b:string)=>{if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0};
const titles:Record<string,string>={NEW:"طلب جديد",AWAITING_CONFIRMATION:"طلب بانتظار التأكيد",APPROVED:"تمت الموافقة على طلب",PREPARING:"طلب قيد التحضير",READY:"طلب جاهز",OUT_FOR_DELIVERY:"طلب خرج للتوصيل",COMPLETED:"طلب مكتمل",CANCELLED:"طلب ملغى"};
Deno.serve(async(req)=>{
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 const key=Deno.env.get("STAFF_NOTIFICATION_WORKER_SECRET")||"";
 if(!key||!fixedEquals(key,req.headers.get("x-staff-dispatch-secret")||""))return new Response("Unauthorized",{status:401});
 const tgToken=Deno.env.get("STAFF_TELEGRAM_BOT_TOKEN")||"";
 const publicKey=Deno.env.get("STAFF_VAPID_PUBLIC_KEY")||"";
 const privateKey=Deno.env.get("STAFF_VAPID_PRIVATE_KEY")||"";
 if(!tgToken&&!publicKey)return new Response(JSON.stringify({status:"awaiting channel secrets"}),{status:503});
 if(publicKey&&privateKey)webpush.setVapidDetails("https://chefmujahed.com",publicKey,privateKey);
 const {data:events,error:eventError}=await db.from("staff_notification_events").select("id,reference,request_id,event_type").is("processed_at",null).order("created_at",{ascending:true}).limit(20);
 if(eventError)throw eventError;
 const {data:staff}=await db.from("dashboard_users").select("user_id,status").eq("status","ACTIVE");
 const users=(staff||[]).map(x=>x.user_id);
 const [{data:prefs},{data:subs},{data:links}]=await Promise.all([
   db.from("staff_notification_preferences").select("*").in("user_id",users.length?users:["00000000-0000-0000-0000-000000000000"]),
   db.from("staff_push_subscriptions").select("*").in("user_id",users.length?users:["00000000-0000-0000-0000-000000000000"]),
   db.from("staff_telegram_links").select("*").in("user_id",users.length?users:["00000000-0000-0000-0000-000000000000"])
 ]);
 let sent=0,failed=0;
 const attempt=async(event:any,user_id:string,channel:string,target:string,fn:()=>Promise<void>)=>{
   const {data:claimed,error}=await db.from("staff_notification_deliveries").insert({event_id:event.id,user_id,channel,target,status:"SENDING"}).select("id").maybeSingle();
   if(error?.code==="23505")return;
   if(error)throw error;
   try {await fn();sent++;await db.from("staff_notification_deliveries").update({status:"SENT",error:null}).eq("id",claimed!.id)}
   catch(e){failed++;await db.from("staff_notification_deliveries").update({status:"FAILED",error:String(e).slice(0,400)}).eq("id",claimed!.id);console.error("staff push delivery failed",channel,event.id,String(e).slice(0,120))}
 };
 for(const event of events||[]){
   const {data:order}=await db.from("requests").select("id,deleted_at").eq("id",event.request_id).maybeSingle();
   if(!order||order.deleted_at){await db.from("staff_notification_events").update({processed_at:new Date().toISOString()}).eq("id",event.id);continue}
   const url="https://chefmujahed.com/dashboard/requests/"+encodeURIComponent(event.request_id);
   const title="Chef Mujahed | "+(titles[event.event_type]||"تحديث طلب");
   const body="رقم الطلب: "+event.reference;
   for(const user_id of users){
     const p=(prefs||[]).find(x=>x.user_id===user_id);
     const types=Array.isArray(p?.event_types)?p.event_types:["NEW","AWAITING_CONFIRMATION","APPROVED","READY","OUT_FOR_DELIVERY","CANCELLED"];
     if(!types.includes(event.event_type))continue;
     if(publicKey&&privateKey&&p?.web_push_enabled!==false){
       for(const s of (subs||[]).filter(x=>x.user_id===user_id)){
         const host=(()=>{try{return new URL(s.endpoint).hostname.toLowerCase()}catch{return""}})();
         if(!(host==="fcm.googleapis.com"||host.endsWith(".push.services.mozilla.com")||host.endsWith(".push.apple.com")||host.endsWith(".notify.windows.com")))continue;
         await attempt(event,user_id,"WEB_PUSH",s.endpoint,async()=>{
           try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_key}},JSON.stringify({title,body,url,tag:"chef-order-"+event.id}),{TTL:86400,urgency:"high"})}
           catch(e:any){if([404,410].includes(Number(e?.statusCode)))await db.from("staff_push_subscriptions").delete().eq("id",s.id);throw e}
         });
       }
     }
     if(tgToken&&p?.telegram_enabled!==false){
       const chat=(links||[]).find(x=>x.user_id===user_id)?.chat_id;
       if(chat)await attempt(event,user_id,"TELEGRAM",String(chat),async()=>{
         const rsp=await fetch("https://api.telegram.org/bot"+tgToken+"/sendMessage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chat,text:title+"\n"+body+"\n"+url,disable_web_page_preview:true})});
         const j=await rsp.json();
         if(!rsp.ok||!j.ok)throw Error("Telegram send failed "+rsp.status);
       });
     }
   }
   await db.from("staff_notification_events").update({processed_at:new Date().toISOString()}).eq("id",event.id);
 }
 return new Response(JSON.stringify({processed:events?.length||0,sent,failed}),{headers:{"content-type":"application/json"}});
});