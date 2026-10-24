import { appConfig } from '@/app/config'
import { renderWhatsAppTemplate, type WhatsAppTemplateContent } from '@/lib/whatsappTemplates'
import { whatsAppDigits } from '@/lib/phone'
import type { RequestStatus } from '@/types/request'
import { REQUEST_SEMANTICS } from '@/domain/constants'
import type {
  B2BCompanyDraft,
  B2CCustomerDraft,
  FulfillmentDraft,
  RequestItem,
} from '@/types/request'

export type WhatsAppHandoffPayload = {
  templates?: WhatsAppTemplateContent
  reference: string
  customer?: B2CCustomerDraft
  company?: B2BCompanyDraft
  fulfillment?: FulfillmentDraft
  generalNotes?: string
  items?: RequestItem[]
}

export type PaymentRequestMessagePayload = {
  reference: string
  customerName?: string | null
  totalJod: number
  instructions: string
  templates?: WhatsAppTemplateContent
}

function itemLines(items: RequestItem[]) {
  if (!items.length) return []
  const lines = ['', 'المنتجات:']
  items.forEach((item) => {
    const details = [
      `${item.productName} × ${item.quantity}`,
      item.unitLabel,
      ...(item.customizationLabels ?? []),
    ].filter(Boolean)
    lines.push(`- ${details.join(' · ')}`)
    if (item.notes?.trim()) lines.push(`  ملاحظة: ${item.notes.trim()}`)
  })
  return lines
}

export function buildWhatsAppMessage({
  reference,
  customer,
  company,
  fulfillment,
  generalNotes,
  items = [],
  templates,
}: WhatsAppHandoffPayload) {
  const isB2B = Boolean(company)
  const lines = [renderWhatsAppTemplate(isB2B ? 'handoff_b2b' : 'handoff_b2c', {reference}, templates)]

  if (customer?.name) lines.push(`الاسم: ${customer.name}`)
  if (customer?.phone) lines.push(`رقم الهاتف: ${customer.phone}`)

  if (company) {
    lines.push(`الشركة: ${company.companyName}`)
    lines.push(`مسؤول التواصل: ${company.contactName}`)
    lines.push(`رقم الهاتف: ${company.phone}`)
  }

  if (fulfillment) {
    lines.push(
      `طريقة الاستلام: ${fulfillment.type === 'DELIVERY' ? 'توصيل' : 'استلام'}`,
    )
    if (fulfillment.type === 'DELIVERY' && fulfillment.address) {
      lines.push(`العنوان: ${fulfillment.address}`)
    }
    if (fulfillment.preferredDate) lines.push(`التاريخ المفضل: ${fulfillment.preferredDate}`)
    if (fulfillment.preferredTime) lines.push(`الوقت المفضل: ${fulfillment.preferredTime}`)
  }

  lines.push(...itemLines(items))

  if (generalNotes?.trim()) {
    lines.push('', `ملاحظات عامة: ${generalNotes.trim()}`)
  }

  lines.push('', REQUEST_SEMANTICS.pendingNotice)
  return lines.join('\n')
}

export function buildPaymentRequestMessage({
  reference,
  customerName,
  totalJod,
  instructions,
  templates,
}: PaymentRequestMessagePayload) {
  return renderWhatsAppTemplate('payment_request', {
    customerName:customerName?.trim()||'عميلنا الكريم',
    reference,
    totalJod:Number(totalJod||0).toFixed(3),
    paymentInstructions:instructions.trim(),
  },templates)
}

export function buildWhatsAppUrl(message:string, recipient?:string|null){
  const input=recipient===undefined||recipient===null ? appConfig.whatsappNumber : recipient
  const number=whatsAppDigits(input)
  // Never send a customer update to the shop's phone as a fallback.
  if(!number)return ''
  return 'https://wa.me/'+number+'?text='+encodeURIComponent(message)
}

export type OrderMessageStatus = Extract<RequestStatus,'APPROVED'|'PREPARING'|'READY'|'OUT_FOR_DELIVERY'|'COMPLETED'>
export function buildOrderStatusWhatsAppMessage({
  reference,customerName,status,fulfillmentType,templates,
}:{
  reference:string;customerName?:string|null;status:OrderMessageStatus;
  fulfillmentType:'DELIVERY'|'COLLECTION';templates?:WhatsAppTemplateContent;
}){
  const key = status==='READY'
    ? (fulfillmentType==='COLLECTION'?'status_ready_collection':'status_ready_delivery')
    : status==='COMPLETED'
      ? (fulfillmentType==='COLLECTION'?'status_completed_collection':'status_completed_delivery')
      : status==='APPROVED'?'status_approved'
      : status==='PREPARING'?'status_preparing':'status_out_for_delivery'
  return renderWhatsAppTemplate(key,{reference,customerName:customerName?.trim()||'عميلنا الكريم'},templates)
}

export async function copyText(text: string) {
  if (!navigator.clipboard?.writeText) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    if (!copied) throw new Error('Copy failed')
    return
  }
  await navigator.clipboard.writeText(text)
}
