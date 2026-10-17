import type { RequestStatus } from '@/types/request'
import Button from '@/components/ui/Button'

type DeliveryActionsProps = {
  status: RequestStatus
  busy?: boolean
  fulfillmentType?: 'DELIVERY' | 'COLLECTION'
  onChange: (status: RequestStatus) => void
}

export default function DeliveryActions({ status, busy, fulfillmentType, onChange }: DeliveryActionsProps) {
  if (status === 'READY' && fulfillmentType === 'COLLECTION') return <Button size="sm" disabled={busy} onClick={() => onChange('COMPLETED')}>تأكيد استلام العميل</Button>
  if (status === 'READY') return <Button size="sm" disabled={busy} onClick={() => onChange('OUT_FOR_DELIVERY')}>إرسال للتوصيل</Button>
  if (status === 'OUT_FOR_DELIVERY') return <Button size="sm" disabled={busy} onClick={() => onChange('COMPLETED')}>تأكيد التسليم</Button>
  return null
}
