import { CheckCircle, Clock, CreditCard, NotePencil, Package, Phone, Truck, UserCircle, XCircle } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
type Activity={id:string;action_type?:string;description?:string;created_at:string}
const labels:Record<string,string>={NEW:'جديد',CONTACT_REQUIRED:'يحتاج تواصلًا',AWAITING_CONFIRMATION:'بانتظار التأكيد',APPROVED:'معتمد',PREPARING:'قيد التحضير',READY:'جاهز للتسليم',OUT_FOR_DELIVERY:'خرج للتوصيل',COMPLETED:'مكتمل',CANCELLED:'ملغى'}
const titles:Record<string,string>={NEW:'تم استلام الطلب',CONTACT_REQUIRED:'الطلب بحاجة إلى تواصل',AWAITING_CONFIRMATION:'بانتظار تأكيد الطلب',APPROVED:'تم اعتماد الطلب',PREPARING:'بدأ تحضير الطلب',READY:'الطلب جاهز للتسليم',OUT_FOR_DELIVERY:'خرج الطلب للتوصيل',COMPLETED:'اكتمل الطلب',CANCELLED:'أُلغي الطلب'}
const arabic=(s:string)=>s.replace(/\b(?:OUT_FOR_DELIVERY|AWAITING_CONFIRMATION|CONTACT_REQUIRED|COMPLETED|PREPARING|APPROVED|CANCELLED|READY|NEW)\b/g,x=>labels[x]||x)
type Event={title:string;detail?:string;icon:ReactNode;theme:string}
function describe(a:Activity):Event{
 const description=String(a.description||'').trim()
 const match=description.match(/من\s+(OUT_FOR_DELIVERY|AWAITING_CONFIRMATION|CONTACT_REQUIRED|COMPLETED|PREPARING|APPROVED|CANCELLED|READY|NEW)\s+إلى\s+(OUT_FOR_DELIVERY|AWAITING_CONFIRMATION|CONTACT_REQUIRED|COMPLETED|PREPARING|APPROVED|CANCELLED|READY|NEW)/)
 if(match){
   const current=match[2]
   return {title:titles[current]||'تحديث حالة الطلب',detail:'المرحلة السابقة: '+labels[match[1]],
     icon:current==='OUT_FOR_DELIVERY'?<Truck size={17}/>:current==='CANCELLED'?<XCircle size={17}/>:current==='COMPLETED'||current==='APPROVED'?<CheckCircle size={17}/>:<Package size={17}/>,
     theme:current==='CANCELLED'?'rose':current==='COMPLETED'||current==='APPROVED'?'green':'amber'}
 }
 switch(a.action_type){
   case 'PAYMENT_UPDATED':return {title:'تم تحديث حالة الدفع',icon:<CreditCard size={17}/>,theme:'green'}
   case 'CONTACT_PHONE_UPDATED':return {title:description||'تم تحديث هاتف العميل',icon:<Phone size={17}/>,theme:'blue'}
   case 'WHATSAPP_PHONE_CHANGED':return {title:'تم تعديل رقم واتساب البديل',icon:<Phone size={17}/>,theme:'blue'}
   case 'CUSTOMER_RECLASSIFIED':return {title:'تم تحديث نوع العميل',icon:<UserCircle size={17}/>,theme:'blue'}
   case 'POST_INVOICE_DISCOUNT_ADDED':case 'DISCOUNT_UPDATED':return {title:'تم تحديث الخصومات',detail:arabic(description),icon:<CreditCard size={17}/>,theme:'amber'}
   case 'ORDER_EXCLUDED_FROM_OPERATIONS':return {title:'تم استبعاد الطلب من التشغيل',detail:arabic(description),icon:<XCircle size={17}/>,theme:'rose'}
   default:return {title:arabic(description)||'حدث في سجل الطلب',icon:<NotePencil size={17}/>,theme:'neutral'}
 }
}
const colors:Record<string,string>={green:'border-emerald-200 bg-emerald-50 text-emerald-700',amber:'border-amber-200 bg-amber-50 text-amber-800',blue:'border-sky-200 bg-sky-50 text-sky-700',rose:'border-rose-200 bg-rose-50 text-rose-700',neutral:'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]'}
function dateLabel(raw:string){const d=new Date(raw);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ar-JO-u-nu-latn',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
export default function RequestActivityTimeline({activities}:{activities:Activity[]}){
 if(!activities?.length)return <p className="py-4 text-sm text-[var(--color-text-muted)]">لا يوجد نشاط مسجل بعد.</p>
 return <ol aria-label="الخط الزمني للطلب">
   {activities.map((a,i)=>{const e=describe(a);return <li key={a.id||i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
     <div className="flex flex-col items-center"><div className={'z-10 flex size-8 shrink-0 items-center justify-center rounded-full border '+(colors[e.theme]||colors.neutral)} aria-hidden="true">{e.icon}</div>{i<activities.length-1?<span className="min-h-7 w-px flex-1 bg-[var(--color-border)]" aria-hidden="true"/>:null}</div>
     <div className="min-w-0 pb-6 pt-1"><p className="text-sm font-semibold leading-6">{e.title}</p>{e.detail?<p className="mt-1 text-xs text-[var(--color-text-muted)]">{e.detail}</p>:null}<time dateTime={a.created_at} dir="ltr" className="mt-2 block w-fit text-xs tabular-nums text-[var(--color-text-muted)]">{dateLabel(a.created_at)}</time></div>
   </li>})}
 </ol>
}