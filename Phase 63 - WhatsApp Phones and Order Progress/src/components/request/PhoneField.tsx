import { useState } from 'react'
import { COUNTRY_DIAL_CODES, normalizePhoneToE164 } from '@/lib/phone'

type Props={
  label:string
  name:string
  value:string
  onChange:(value:string)=>void
  error?:string
  required?:boolean
}
export default function PhoneField({label,name,value,onChange,error,required}:Props){
  const [dial,setDial]=useState('962')
  const invalid=Boolean(error)
  const normalized=normalizePhoneToE164(value,dial)
  const changeDial=(next:string)=>{
    setDial(next)
    // A prefilled number with a different international prefix must never be silently reclassified.
    if(value.trim().startsWith('+')||value.trim().startsWith('00'))onChange('')
  }
  return <div className="min-w-0" dir="rtl">
    <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">{label}{required?' *':''}</label>
    <div className="flex min-w-0 gap-2">
      <select aria-label="مفتاح الدولة" value={dial} onChange={e=>changeDial(e.target.value)}
        className="h-11 max-w-[145px] shrink-0 rounded-xl border border-[var(--color-border)] bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">
        {COUNTRY_DIAL_CODES.map(country=><option key={country.code} value={country.code}>{country.label}</option>)}
      </select>
      <input id={name} name={name} type="tel" inputMode="tel" autoComplete="tel"
        dir="ltr" value={value} onChange={e=>onChange(e.target.value)}
        onBlur={()=>{if(normalized&&value!==normalized)onChange(normalized)}}
        aria-invalid={invalid} aria-describedby={error?name+'-error':name+'-hint'}
        placeholder={dial==='962'?'079 123 4567':'الرقم بدون مفتاح الدولة'} required={required}
        className={'h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] '+(invalid?'border-red-500':'border-[var(--color-border)]')}/>
    </div>
    {error?<p id={name+'-error'} role="alert" className="mt-1.5 text-xs text-red-700">{error}</p>
      :<p id={name+'-hint'} className="mt-1.5 text-xs text-[var(--color-text-muted)]">
        {normalized?'سيُحفظ رقم الواتساب: '+normalized:'اختر الدولة، ثم أدخل الرقم. يمكنك أيضًا كتابة + مع مفتاح الدولة.'}
      </p>}
  </div>
}
