import { appConfig } from '@/app/config'
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
    'نشكركم لطلبكم من الشيف مجاهد.',
    `تمت مراجعة طلبكم رقم: ${reference}.`,
    `المبلغ المطلوب لإتمام الطلب: ${Number(totalJod || 0).toFixed(3)} JOD.`,
    '',
    'طريقة الدفع:',
    instructions.trim(),
    '',
    'بعد إتمام الدفع، يرجى إرسال صورة الإيصال أو تأكيد التحويل في هذه المحادثة. سنعتمد الطلب ونبدأ التجهيز فور التحقق.',
    'مع الشكر، فريق الشيف مجاهد.',
  ]
  return lines.join('\n')
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
  reference,customerName,status,fulfillmentType,
}:{
  reference:string;customerName?:string|null;status:OrderMessageStatus;
  fulfillmentType:'DELIVERY'|'COLLECTION';
}){
  const heading=customerName?.trim()?'مرحباً '+customerName.trim()+'،':'مرحباً،'
  const statusText:Record<OrderMessageStatus,string>={
    APPROVED:'تم تأكيد واعتماد طلبكم، وسيتم تحضيره وفق التفاصيل المتفق عليها.',
    PREPARING:'بدأ فريق الشيف مجاهد تحضير طلبكم.',
    READY:fulfillmentType==='COLLECTION'?'طلبكم جاهز للاستلام من الشيف مجاهد.':'طلبكم جاهز، ونعمل على ترتيبات توصيله.',
    OUT_FOR_DELIVERY:'طلبكم الآن في طريقه للتوصيل.',
    COMPLETED:fulfillmentType==='COLLECTION'?'تم تسجيل استلام طلبكم. شكراً لثقتكم بنا.':'تم تسجيل تسليم طلبكم. شكراً لثقتكم بنا.',
  }
  return [heading,'تحديث بخصوص طلبكم من الشيف مجاهد رقم '+reference+':',statusText[status],'','فريق الشيف مجاهد'].join('\n')
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
