import { appConfig } from '@/app/config'
import { REQUEST_SEMANTICS } from '@/domain/constants'
import type {
  B2BCompanyDraft,
  B2CCustomerDraft,
  FulfillmentDraft,
  RequestItem,
} from '@/types/request'

export type WhatsAppHandoffPayload = {
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
}

function cleanPhone(value: string) {
  return value.replace(/[^\d]/g, '')
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
}: WhatsAppHandoffPayload) {
  const isB2B = Boolean(company)
  const lines = [
    isB2B
      ? 'مرحباً، أود متابعة طلب الشركات المسجل لدى الشيف مجاهد.'
      : 'مرحباً، أود متابعة الطلب المسجل لدى الشيف مجاهد.',
    `رقم المرجع: ${reference}`,
  ]

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
}: PaymentRequestMessagePayload) {
  const name = customerName?.trim() ? ` ${customerName.trim()}` : ''
  const lines = [
    `مرحباً${name}،`,
    `بخصوص طلبكم رقم ${reference} لدى الشيف مجاهد،`,
    `المبلغ المطلوب: ${Number(totalJod || 0).toFixed(3)} JOD.`,
    '',
    'تعليمات الدفع:',
    instructions.trim(),
    '',
    'بعد إتمام الدفع، يرجى إرسال إشعار التحويل أو صورة الإيصال في هذه المحادثة ليتم اعتماد الطلب وبدء التجهيز.',
    'شكراً لكم.',
  ]
  return lines.join('\n')
}

export function buildWhatsAppUrl(message: string, recipient?: string | null) {
  const text = encodeURIComponent(message)
  const number = cleanPhone(recipient?.trim() || appConfig.whatsappNumber)
  return number
    ? `https://wa.me/${number}?text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`
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
