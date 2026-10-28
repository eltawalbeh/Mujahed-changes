import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useDashboard } from '@/state/DashboardContext'

type Settings = {
  preferences:{ web_push_enabled:boolean;telegram_enabled:boolean;event_types:string[] }
  pushDevices:number;telegramLinked:boolean;vapidPublicKey:string
  pushConfigured:boolean;telegramConfigured:boolean
}
const eventOptions:[string,string][]=[
  ['NEW','طلب جديد'],['AWAITING_CONFIRMATION','بانتظار التأكيد'],
  ['APPROVED','طلب معتمد'],['PREPARING','قيد التجهيز'],
  ['READY','جاهز للتسليم'],['OUT_FOR_DELIVERY','خرج للتوصيل'],
  ['COMPLETED','مكتمل'],['CANCELLED','ملغى'],
]
async function call(action:string,payload:Record<string,unknown>={}):Promise<any>{
  const {data,error}=await supabase.functions.invoke('staff-notifications',{body:{action,...payload}})
  if(error)throw new Error(error.message||'تعذّر الاتصال بخدمة الإشعارات')
  if(data?.error)throw new Error(data.error)
  return data
}
function vapidBytes(key:string):Uint8Array{
  const p=key.replace(/-/g,'+').replace(/_/g,'/')
  const s=atob(p+'='.repeat((4-p.length%4)%4))
  return Uint8Array.from(s,c=>c.charCodeAt(0))
}
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)
const installed=()=>window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone)
export default function StaffNotificationSetup(){
  const {runtime}=useDashboard()
  const [settings,setSettings]=useState<Settings|null>(null)
  const [status,setStatus]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [telegramUrl,setTelegramUrl]=useState('')
  const [pushActive,setPushActive]=useState(false)
  const refresh=useCallback(async()=>{
    if(runtime.mode!=='secure')return
    try{
      const s=await call('status');setSettings(s)
      if('serviceWorker'in navigator){
        const reg=await navigator.serviceWorker.getRegistration('/').catch(()=>null)
        const sub=await reg?.pushManager.getSubscription().catch(()=>null)
        setPushActive(Boolean(sub))
      }
    }catch(e){setError(e instanceof Error?e.message:'فشل تحميل إعدادات الإشعارات')}
  },[runtime.mode])
  useEffect(()=>{void refresh()},[refresh])
  async function run(op:()=>Promise<void>){
    setBusy(true);setError('');setStatus('')
    try{await op();await refresh()}catch(e){setError(e instanceof Error?e.message:'تعذّرت العملية')}
    finally{setBusy(false)}
  }
  const enablePush=()=>void run(async()=>{
    if(!settings?.vapidPublicKey)throw new Error('لم يتم إعداد مفاتيح Web Push بعد في Supabase.')
    if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('المتصفح لا يدعم Web Push.')
    if(isIOS()&&!installed())throw new Error('على iPhone: افتح Safari → مشاركة → إضافة إلى الشاشة الرئيسية، ثم افتح أيقونة التطبيق وفعّل الإشعارات.')
    const permission=await Notification.requestPermission()
    if(permission!=='granted')throw new Error('لم تتم الموافقة على الإشعارات من إعدادات الجهاز.')
    const response=await fetch('/chef-staff-sw.js',{cache:'no-store'})
    const body=await response.text()
    if(!response.ok||!body.includes("addEventListener('push'")||/text\/html/i.test(response.headers.get('content-type')||'')){
      throw new Error('Figma Make لا يقدّم ملف Service Worker كملف مستقل حاليًا. يجب نشر الملف من نفس دومين الموقع، ولا يمكن تشغيل Push بالخلفية قبل ذلك.')
    }
    const reg=await navigator.serviceWorker.register('/chef-staff-sw.js',{scope:'/'})
    const existing=await reg.pushManager.getSubscription()
    const subscription=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(settings.vapidPublicKey) as BufferSource})
    await call('subscribe_push',{subscription:subscription.toJSON()})
    setPushActive(true);setStatus('تم تفعيل إشعارات Web Push على هذا الجهاز.')
  })
  const disablePush=()=>void run(async()=>{
    const reg=await navigator.serviceWorker.getRegistration('/')
    const sub=await reg?.pushManager.getSubscription()
    if(sub){await call('unsubscribe_push',{endpoint:sub.endpoint});await sub.unsubscribe()}
    setPushActive(false);setStatus('تم إيقاف إشعارات هذا الجهاز.')
  })
  const telegramLink=()=>void run(async()=>{
    const result=await call('telegram_link')
    setTelegramUrl(result.url);setStatus('الرابط صالح لمدة 10 دقائق. افتحه من حساب Telegram الخاص بالموظفة واضغط Start.')
  })
  const unlink=()=>void run(async()=>{await call('unlink_telegram');setTelegramUrl('');setStatus('تم فصل حساب Telegram.')})
  const updatePreference=(field:'web_push_enabled'|'telegram_enabled',value:boolean)=>void run(async()=>{
    if(!settings)return
    await call('preferences',{...settings.preferences,[field]:value})
    setStatus('تم حفظ التفضيلات.')
  })
  const toggleEvent=(event:string)=>void run(async()=>{
    if(!settings)return
    const current=settings.preferences.event_types
    await call('preferences',{...settings.preferences,event_types:current.includes(event)?current.filter(x=>x!==event):[...current,event]})
    setStatus('تم حفظ أنواع الإشعارات.')
  })
  if(runtime.mode!=='secure')return null
  return <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6" dir="rtl" aria-label="إشعارات الأجهزة وتليجرام">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">تنبيهات الموظفين على الأجهزة</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">فعّل Web Push وTelegram مجانًا لكل موظف من حسابه.</p></div>
      <button type="button" onClick={()=>void refresh()} className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm">تحديث الحالة</button>
    </div>
    {!settings?<p className="text-sm">جارٍ تحميل إعدادات الإشعارات...</p>:<>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <h3 className="font-bold">Web Push / PWA</h3>
          <p className="mt-2 text-xs leading-6 text-[var(--color-text-muted)]">إشعار على الهاتف أو اللابتوب حتى عند إغلاق الصفحة. يُفعّل على كل جهاز بشكل مستقل.</p>
          <p className="mt-2 text-sm">{pushActive?'هذا الجهاز مشترك ✅':'هذا الجهاز غير مشترك'} · الأجهزة المسجلة: {settings.pushDevices}</p>
          <button type="button" disabled={busy||!settings.pushConfigured} onClick={pushActive?disablePush:enablePush} className="mt-3 min-h-11 rounded-xl bg-[#2E1E17] px-4 font-semibold text-white disabled:opacity-40">{pushActive?'إيقاف على هذا الجهاز':'تفعيل إشعارات الجهاز'}</button>
          {!settings.pushConfigured?<p className="mt-2 text-xs text-amber-700">يلزم إعداد VAPID Keys من Supabase Secrets.</p>:null}
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={settings.preferences.web_push_enabled} onChange={e=>updatePreference('web_push_enabled',e.target.checked)}/>استقبال إشعارات Web Push</label>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <h3 className="font-bold">Telegram Bot</h3>
          <p className="mt-2 text-xs leading-6 text-[var(--color-text-muted)]">تنبيهات في Telegram تصل إلى الأجهزة المرتبطة بحسابك حتى لو موقع Chef Mujahed مغلق.</p>
          <p className="mt-2 text-sm">{settings.telegramLinked?'Telegram مربوط ✅':'Telegram غير مربوط'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.telegramLinked?<button type="button" disabled={busy} onClick={unlink} className="min-h-11 rounded-xl border border-red-300 px-4 text-red-700">فصل الحساب</button>:<button type="button" disabled={busy||!settings.telegramConfigured} onClick={telegramLink} className="min-h-11 rounded-xl bg-[#2E1E17] px-4 font-semibold text-white disabled:opacity-40">إنشاء رابط ربط Telegram</button>}
            {telegramUrl?<a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-border)] px-4 font-semibold">فتح البوت في Telegram</a>:null}
          </div>
          {!settings.telegramConfigured?<p className="mt-2 text-xs text-amber-700">يلزم إعداد البوت والـWebhook Secret.</p>:null}
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.preferences.telegram_enabled} disabled={busy} onChange={e=>updatePreference('telegram_enabled',e.target.checked)}/>استقبال إشعارات Telegram</label>
        </div>
      </div>
      <fieldset className="rounded-xl border border-[var(--color-border)] p-4"><legend className="px-2 font-bold">الأحداث التي أريد استقبالها</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{eventOptions.map(([value,label])=><label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={settings.preferences.event_types.includes(value)} onChange={()=>toggleEvent(value)}/>{label}</label>)}</div>
      </fieldset>
    </>}
    {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
    {status?<p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{status}</p>:null}
    <p className="text-xs leading-6 text-[var(--color-text-muted)]">على iPhone يجب إضافة التطبيق إلى الشاشة الرئيسية. إذا Figma Make لا يخدم Service Worker من نفس الدومين، ستظل قناة Web Push معلّقة حتى معالجة الاستضافة الثابتة لهذا الملف؛ Telegram مستقل عنها.</p>
  </section>
}