import type { RequestStatus } from '@/types/request'
import Button from '@/components/ui/Button'

type DeliveryActionsProps = {
  status:RequestStatus
  busy?:boolean
  canManage?:boolean
  fulfillmentType?:'DELIVERY'|'COLLECTION'
  onChange:(status:RequestStatus)=>void
}

export default function DeliveryActions({status,busy,canManage=false,fulfillmentType,onChange}:DeliveryActionsProps){
  const next:
    {status:RequestStatus;label:string;prompt:string}|null=
    status==='APPROVED'&&canManage?{status:'PREPARING',label:'بدء تحضير الطلب',prompt:'تأكيد بدء تحضير الطلب الآن؟'}:
    status==='PREPARING'&&canManage?{status:'READY',label:'تم تجهيز الطلب',prompt:'تأكيد أن الطلب جاهز فعلاً؟'}:
    status==='READY'&&fulfillmentType==='DELIVERY'?{status:'OUT_FOR_DELIVERY',label:'خارج للتوصيل',prompt:'تأكيد تسليم الطلب للتوصيل؟'}:
    status==='READY'&&fulfillmentType==='COLLECTION'?{status:'COMPLETED',label:'تم استلام العميل',prompt:'هل استلم العميل الطلب بالفعل؟'}:
    status==='OUT_FOR_DELIVERY'?{status:'COMPLETED',label:'تم تسليم الطلب',prompt:'تأكيد تسليم الطلب للعميل؟'}:null

  if(canManage&&status==='APPROVED')return <div className="flex flex-wrap items-center gap-2">
    <Button disabled={busy} size="sm" onClick={()=>{
      if(window.confirm('تأكيد بدء التحضير؟'))onChange('PREPARING')
    }}>بدء تحضير الطلب</Button>
    <Button disabled={busy} size="sm" variant="secondary" onClick={()=>{
      if(window.confirm('تأكيد أن الطلب جاهز بالفعل؟ سيتم تسجيل مرحلتي بدء التحضير والجاهزية في سجل الطلب.'))onChange('READY')
    }}>الطلب جاهز الآن</Button>
  </div>
  if(!next)return null
  if(!canManage&&['APPROVED','PREPARING'].includes(status))return null
  return <Button disabled={busy} size="sm" onClick={()=>{
    if(window.confirm(next.prompt))onChange(next.status)
  }}>{next.label}</Button>
}
