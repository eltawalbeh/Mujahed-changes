import { createClient } from "jsr:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")||"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"");
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const same=(a:string,b:string)=>{if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0};
Deno.serve(async(req)=>{
 if(req.method!=="POST")return new Response("method not allowed",{status:405});
 const expected=Deno.env.get("STAFF_TELEGRAM_WEBHOOK_SECRET")||"";
 const supplied=req.headers.get("x-telegram-bot-api-secret-token")||"";
 if(!expected||!same(expected,supplied))return new Response("unauthorized",{status:401});
 let update:any;
 try{update=await req.json()}catch{return new Response("bad json",{status:400})}
 const message=update?.message;
 if(!message||message.chat?.type!=="private"||typeof message.text!=="string")return new Response("ok");
 const chat=Number(message.chat.id);
 const token=Deno.env.get("STAFF_TELEGRAM_BOT_TOKEN")||"";
 const send=async(text:string)=>{
   if(!token)return;
   await fetch("https://api.telegram.org/bot"+token+"/sendMessage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chat,text})});
 };
 const text=message.text.trim();
 try{
   if(/^\/stop(?:@\w+)?$/.test(text)){
     await db.from("staff_telegram_links").delete().eq("chat_id",chat);
     await send("تم إيقاف تنبيهات Chef Mujahed على هذا الحساب. يمكنك ربطه من لوحة التحكم مجددًا.");
   } else if(/^\/start(?:@\w+)?\s+[a-f0-9]{28}$/i.test(text)){
     const code=text.split(/\s+/)[1];
     const hash=await sha(code);
     const {data:record}=await db.from("staff_telegram_link_codes").select("user_id,expires_at").eq("code_hash",hash).maybeSingle();
     if(!record||new Date(record.expires_at).getTime()<Date.now()){await send("انتهت صلاحية رابط الربط. أنشئ رابطًا جديدًا من لوحة تحكم Chef Mujahed.");return new Response("ok")}
     const {data:staff}=await db.from("dashboard_users").select("status").eq("user_id",record.user_id).maybeSingle();
     if(staff?.status!=="ACTIVE"){await send("حساب الموظف غير مفعل.");return new Response("ok")}
     await db.from("staff_telegram_links").delete().eq("user_id",record.user_id);
     const {error}=await db.from("staff_telegram_links").upsert({user_id:record.user_id,chat_id:chat,linked_at:new Date().toISOString()},{onConflict:"user_id"});
     if(error)throw error;
     await db.from("staff_telegram_link_codes").delete().eq("code_hash",hash);
     await send("✅ تم ربط Telegram بلوحة Chef Mujahed. ستصلك إشعارات الطلبات المختارة. للإلغاء: /stop");
   } else {
     await send("لربط حسابك، افتح لوحة Chef Mujahed → التنبيهات → ربط Telegram، ثم افتح الرابط الخاص بك.");
   }
 }catch(e){console.error("telegram webhook error",e);return new Response("retry",{status:500})}
 return new Response("ok");
});