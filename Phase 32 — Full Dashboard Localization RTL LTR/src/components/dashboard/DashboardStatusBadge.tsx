import {
  PAYMENT_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from '@/domain/constants'
import type { CustomerType, PaymentStatus, RequestStatus } from '@/types/request'
import { useDashboardPreferences } from '@/state/DashboardPreferencesContext'

const requestClasses: Record<RequestStatus, string> = {
  NEW: 'bg-[#E3F2FD] text-[#1565C0]',
  CONTACT_REQUIRED: 'bg-[#FFF3E0] text-[#E65100]',
  AWAITING_CONFIRMATION: 'bg-[#FFF8E1] text-[#F57F17]',
  APPROVED: 'bg-[#E8F5E9] text-[#2E7D32]',
  PREPARING: 'bg-[#F3E5F5] text-[#6A1B9A]',
  READY: 'bg-[#E0F2F1] text-[#00796B]',
  OUT_FOR_DELIVERY: 'bg-[#E8EAF6] text-[#3949AB]',
  COMPLETED: 'bg-[#F5F5F4] text-[#44403C]',
  CANCELLED: 'bg-[#FDECEC] text-[#C62828]',
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const{locale}=useDashboardPreferences();const english:Partial<Record<RequestStatus,string>>={NEW:'New',CONTACT_REQUIRED:'Contact required',AWAITING_CONFIRMATION:'Awaiting confirmation',APPROVED:'Approved',PREPARING:'Preparing',READY:'Ready',OUT_FOR_DELIVERY:'Out for delivery',COMPLETED:'Completed',CANCELLED:'Cancelled'}
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${requestClasses[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {locale==='en'?english[status]??status:REQUEST_STATUS_LABELS[status]}
    </span>
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const{locale}=useDashboardPreferences();const english:Record<string,string>={UNRECORDED:'Unrecorded',AWAITING_PAYMENT:'Awaiting payment',PAID:'Paid',PARTIALLY_PAID:'Partially paid'}
  return (
    <span className="inline-flex rounded-full bg-[#F2EDE8] px-2.5 py-1 text-xs font-medium text-[#5C4033]">
      {locale==='en'?english[status]??status:PAYMENT_STATUS_LABELS[status]}
    </span>
  )
}

export function customerTypeLabel(type: CustomerType) {
  return type
}
