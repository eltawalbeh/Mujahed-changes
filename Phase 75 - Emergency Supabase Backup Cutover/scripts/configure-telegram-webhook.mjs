// Set Telegram webhook once AFTER storing bot token + webhook secret in Supabase Edge Secrets.
// Locally: STAFF_TELEGRAM_BOT_TOKEN=... STAFF_TELEGRAM_WEBHOOK_SECRET=... node scripts/configure-telegram-webhook.mjs
const token=process.env.STAFF_TELEGRAM_BOT_TOKEN
const secret=process.env.STAFF_TELEGRAM_WEBHOOK_SECRET
if(!token||!secret){console.error('Missing bot token or webhook secret in local environment');process.exit(1)}
const url='https://xyjcazsrqjfnsexypwag.supabase.co/functions/v1/staff-telegram-webhook'
const res=await fetch('https://api.telegram.org/bot'+token+'/setWebhook',{
 method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({url,secret_token:secret,allowed_updates:['message'],drop_pending_updates:true})
})
const result=await res.json()
if(!res.ok||!result.ok){console.error('Telegram webhook setup failed',result.description);process.exit(1)}
console.log('Telegram webhook configured:',url)
