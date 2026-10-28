// Run locally with Node >= 18, not inside Figma or GitHub Actions.
// Generates keys for Supabase Edge Function Secrets; NEVER commit its output.
import { generateKeyPairSync, randomBytes } from 'node:crypto'
const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'})
const pub=pair.publicKey.export({format:'jwk'})
const pri=pair.privateKey.export({format:'jwk'})
const base64url=(s)=>s.replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
const publicPoint=Buffer.concat([Buffer.from([4]),Buffer.from(pub.x,'base64url'),Buffer.from(pub.y,'base64url')])
console.log('Copy these values ONLY to Supabase Edge Functions → Secrets (do not send through chat):')
console.log('STAFF_VAPID_PUBLIC_KEY='+base64url(publicPoint.toString('base64')))
console.log('STAFF_VAPID_PRIVATE_KEY='+pri.d)
console.log('STAFF_NOTIFICATION_WORKER_SECRET='+randomBytes(32).toString('hex'))
console.log('STAFF_TELEGRAM_WEBHOOK_SECRET='+randomBytes(24).toString('hex'))
console.log('Create @BotFather bot manually, then set STAFF_TELEGRAM_BOT_TOKEN separately.')
console.log('Store the worker secret ALSO in Supabase Vault under chef_staff_notify_worker_secret.')
