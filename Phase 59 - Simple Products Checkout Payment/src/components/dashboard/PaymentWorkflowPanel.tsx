import { useEffect, useState } from 'react'
import { CheckCircle, Circle, Wallet, Bank, HandCoins } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import DashboardSelect from '@/components/dashboard/DashboardSelect'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/domain/constants'

type Mode='PAID'|'CASH_ON_DELIVERY'|'MONTHLY_B2B_ACCOUNT'
type Props={request:Record<string,any>;busy:boolean;onSave:(status:string,method?:string|null)=>Promise<void>}

export default function PaymentWorkflowPanel({request,busy,onSave}:Props){
  const [mode,setMode]=useState<Mode|null>(null)
  const [method,setMethod]=useState('')
  const [error,setError]=useState('')
  const [submitting,setSubmitting]=useState(false)
  useEffect(()=>{setMode(null);setMethod('');setError('')},[request.id,request.status,request.payment_status])
  const isB2B=request.customer_type==='B2B'
  const awaitingConfirmation=request.status==='AWAITING_CONFIRMATION'
  const paymentOpen=request.payment_status==='NOT_RECORDED'||request.payment_status==='PENDING'
  if(!paymentOpen){
    const label=request.payment_status==='PAID'?'تم تسجيل الدفع':request.payment_status==='MONTHLY_B2B_ACCOUNT'?'تم اعتماد الحساب الشهري (لم يُسجل كمدفوع)':'تم تسجيل الدفع عند الاستلام (لم يُدفع بعد)'
    return <p className="rounded-xl bg-[var(--color-bg)] p-4 text-sm text-[var(--color-text-muted)]">{label}. تابع تجهيز وتسليم الطلب.</p>
  }
  if(!awaitingConfirmation)return <p className="rounded-xl bg-[var(--color-bg)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">ابدأ متابعة الطلب أولاً، ثم اختر طريقة الدفع بعد تأكيد التفاصيل مع العميل.</p>

  const choices:{value:Mode;title:string;description:string;icon:typeof Wallet}[]=[
    {value:'PAID',title:'تم الدفع الآن',description:'تم استلام المبلغ فعليًا وسيُطلب تحديد وسيلة الدفع.',icon:Wallet},
    ...(isB2B?[{value:'MONTHLY_B2B_ACCOUNT' as const,title:'على حساب الشركة',description:'اعتماد الطلب ضمن الحساب الشهري؛ لا يعتبر المبلغ مدفوعًا.',icon:Bank}]:[
      {value:'CASH_ON_DELIVERY' as const,title:'الدفع عند الاستلام',description:'اعتماد الطلب الآن وتحصيل المبلغ عند التسليم.',icon:HandCoins},
    ]),
  ]
  const save=async()=>{
    if(!mode||submitting||busy||(mode==='PAID'&&!method))return
    try{setSubmitting(true);setError('');await onSave(mode,mode==='PAID'?method:null)}
    catch(e:any){setError(String(e?.message||'تعذر تسجيل طريقة الدفع. يرجى المحاولة مجددًا.'))}
    finally{setSubmitting(false)}
  }
  return <section dir="rtl" className="space-y-4">
    <div><h3 className="text-base font-bold">تأكيد الدفع واعتماد الطلب</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{isB2B?'اختر هل استلمت الشركة الدفع أم سيتم احتسابه على حسابها الشهري.':'اختر إن كان المبلغ دُفع بالفعل أو سيُحصّل عند الاستلام.'}</p>
    </div>
    <div role="radiogroup" aria-label="طريقة تسوية الطلب" className="grid gap-3">
      {choices.map(choice=>{const Icon=choice.icon,selected=mode===choice.value
        return <button key={choice.value} type="button" role="radio" aria-checked={selected} disabled={busy||submitting}
          onClick={()=>{setMode(choice.value);setMethod('');setError('')}}
          className={'flex min-h-[72px] w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-right transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[#C9A989] hover:bg-[#F8F0E5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 '+(selected?'border-[var(--color-accent)] bg-[#F8EDDB] shadow-sm':'border-[var(--color-border)] bg-[var(--color-surface)]')}>
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--color-bg)]"><Icon size={22}/></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm">{choice.title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">{choice.description}</span></span>
          {selected?<CheckCircle size={23} weight="fill" color="var(--color-accent)" aria-hidden="true"/>:<Circle size={23} color="var(--color-text-muted)" aria-hidden="true"/>}
        </button>
      })}
    </div>
    {mode==='PAID'?<label className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm font-semibold">
      <span className="mb-2 block">كيف استلمت المبلغ؟ <span className="text-red-700">*</span></span>
      <DashboardSelect value={method} disabled={busy||submitting} onChange={event=>setMethod(event.target.value)} aria-label="وسيلة الدفع">
        <option value="">اختر وسيلة الدفع</option>
        {PAYMENT_METHODS.filter(value=>value!=='B2B_MONTHLY_ACCOUNT').map(value=><option key={value} value={value}>{PAYMENT_METHOD_LABELS[value]}</option>)}
      </DashboardSelect>
      {!method?<span className="mt-2 block text-xs font-normal text-[var(--color-text-muted)]">لا يمكن تسجيل «مدفوع» قبل تحديد وسيلة الدفع.</span>:null}
    </label>:null}
    {mode==='MONTHLY_B2B_ACCOUNT'?<p className="rounded-lg bg-[var(--color-bg)] p-3 text-xs leading-6 text-[var(--color-text-muted)]">التسجيل على حساب الشركة لا يعني تحصيل المبلغ. راجع شروط الدفع المتفق عليها في ملف الشركة.</p>:null}
    {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    <Button className="w-full" disabled={busy||submitting||!mode||(mode==='PAID'&&!method)} onClick={()=>void save()}>
      {busy||submitting?'جاري الاعتماد...':mode?'تأكيد الاختيار واعتماد الطلب':'اختر طريقة الدفع أولًا'}
    </Button>
    <p className="text-center text-xs leading-5 text-[var(--color-text-muted)]">عند التأكيد ينتقل الطلب إلى سير التحضير؛ اختر الحالة الصحيحة قبل الاعتماد.</p>
  </section>
}
