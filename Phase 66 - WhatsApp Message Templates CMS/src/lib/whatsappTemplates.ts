/** Editable WhatsApp message templates. Public content, never private credentials. */
export const defaultWhatsAppTemplates = {
  "payment_request": "مرحباً {{customerName}}،\nنشكركم لطلبكم من الشيف مجاهد.\nتمت مراجعة طلبكم رقم: {{reference}}.\nالمبلغ المطلوب لإتمام الطلب: {{totalJod}} JOD.\n\nطريقة الدفع: {{paymentInstructions}}\n\nبعد إتمام الدفع، يرجى إرسال صورة الإيصال أو تأكيد التحويل في هذه المحادثة. سنعتمد الطلب ونبدأ التجهيز فور التحقق.\nمع الشكر، فريق الشيف مجاهد.",
  "customer_chat": "مرحباً، بخصوص طلبكم رقم {{reference}}",
  "status_approved": "مرحباً {{customerName}}،\nتحديث بخصوص طلبكم من الشيف مجاهد رقم {{reference}}:\nتم تأكيد واعتماد طلبكم، وسيتم تحضيره وفق التفاصيل المتفق عليها.\n\nفريق الشيف مجاهد",
  "status_preparing": "مرحباً {{customerName}}،\nتحديث بخصوص طلبكم من الشيف مجاهد رقم {{reference}}:\nبدأ فريق الشيف مجاهد تحضير طلبكم.\n\nفريق الشيف مجاهد",
  "status_ready_collection": "مرحباً {{customerName}}،\nتحديث بخصوص طلبكم من الشيف مجاهد رقم {{reference}}:\nطلبكم جاهز للاستلام من الشيف مجاهد.\n\nفريق الشيف مجاهد",
  "status_ready_delivery": "مرحباً {{customerName}}،\nتحديث بخصوص طلبكم من الشيف مجاهد رقم {{reference}}:\nطلبكم جاهز، ونعمل على ترتيبات توصيله.\n\nفريق الشيف مجاهد",
  "status_out_for_delivery": "مرحباً {{customerName}}،\nتحديث بخصوص طلبكم من الشيف مجاهد رقم {{reference}}:\nطلبكم الآن في طريقه للتوصيل.\n\nفريق الشيف مجاهد",
  "status_completed_collection": "مرحباً {{customerName}}،\nتحديث بخصوص طلبكم من الشيف مجاهد رقم {{reference}}:\nتم تسجيل استلام طلبكم. شكراً لثقتكم بنا.\n\nفريق الشيف مجاهد",
  "status_completed_delivery": "مرحباً {{customerName}}،\nتحديث بخصوص طلبكم من الشيف مجاهد رقم {{reference}}:\nتم تسجيل تسليم طلبكم. شكراً لثقتكم بنا.\n\nفريق الشيف مجاهد",
  "handoff_b2c": "مرحباً، أود متابعة الطلب المسجل لدى الشيف مجاهد.\nرقم المرجع: {{reference}}",
  "handoff_b2b": "مرحباً، أود متابعة طلب الشركات المسجل لدى الشيف مجاهد.\nرقم المرجع: {{reference}}"
} as const

export type WhatsAppTemplateKey = keyof typeof defaultWhatsAppTemplates
export type WhatsAppTemplateContent = Partial<Record<WhatsAppTemplateKey,string>>
export const whatsAppTemplateLabels: Record<WhatsAppTemplateKey,string> = {
  "payment_request": "طلب الدفع — كليك",
  "customer_chat": "بدء التواصل مع العميل",
  "status_approved": "تأكيد واعتماد الطلب",
  "status_preparing": "بدء تجهيز الطلب",
  "status_ready_collection": "جاهز للاستلام",
  "status_ready_delivery": "جاهز للتوصيل",
  "status_out_for_delivery": "خروج الطلب للتوصيل",
  "status_completed_collection": "تأكيد استلام الطلب",
  "status_completed_delivery": "تأكيد تسليم الطلب",
  "handoff_b2c": "استلام طلب الأفراد (B2C)",
  "handoff_b2b": "استلام طلب الشركات (B2B)"
}
export const whatsAppTemplateKeys = Object.keys(defaultWhatsAppTemplates) as WhatsAppTemplateKey[]

/** Keep dynamic order values out of editable CMS content. */
export const whatsAppSampleVariables: Record<string,string> = {
  customerName: 'عميل تجريبي',
  reference: 'CM-20261024-00063',
  totalJod: '3.500',
  paymentInstructions: 'كليك (بنك الاتحاد)\n0798265415',
}
export const whatsAppVariableLabels = {
  customerName: 'اسم العميل',reference: 'رقم الطلب',totalJod: 'المبلغ بالدينار (3 منازل)',paymentInstructions: 'طريقة الدفع ورقم كليك من بيانات التواصل',
} as const
const required: Record<WhatsAppTemplateKey,readonly string[]> = {
  payment_request:['customerName','reference','totalJod','paymentInstructions'],
  customer_chat:['reference'],
  status_approved:['customerName','reference'],
  status_preparing:['customerName','reference'],
  status_ready_collection:['customerName','reference'],
  status_ready_delivery:['customerName','reference'],
  status_out_for_delivery:['customerName','reference'],
  status_completed_collection:['customerName','reference'],
  status_completed_delivery:['customerName','reference'],
  handoff_b2c:['reference'],handoff_b2b:['reference'],
}
export function validateWhatsAppTemplate(key:WhatsAppTemplateKey,body:string):string[] {
  if(!body.trim())return ['نص الرسالة لا يمكن أن يكون فارغاً.']
  if(body.length>3000)return ['الحد الأقصى 3000 حرف لكل رسالة.']
  const problems:string[]=[]
  const variables=[...body.matchAll(/\{\{([^{}]+)\}\}/g)].map(match=>match[1])
  for(const name of variables)if(!(name in whatsAppVariableLabels))problems.push('متغير غير معروف: {{'+name+'}}')
  for(const name of required[key])if(!variables.includes(name))problems.push('المتغير المطلوب غير موجود: {{'+name+'}}')
  if(/\{\{|\}\}/.test(body.replace(/\{\{[^{}]+\}\}/g,'')))problems.push('صيغة المتغير غير مكتملة.')
  return problems
}
/** Live preview intentionally shows unsaved text even when validation reports missing variables. */
export function previewWhatsAppTemplate(key:WhatsAppTemplateKey,values:Record<string,string>,templates:WhatsAppTemplateContent={}):string {
  const body=templates[key]??defaultWhatsAppTemplates[key]
  return body.replace(/\{\{([^{}]+)\}\}/g,(_match,name:string)=>values[name]??'').trim()
}
export function renderWhatsAppTemplate(key:WhatsAppTemplateKey,values:Record<string,string>,templates:WhatsAppTemplateContent={}):string {
  const candidate=templates[key]
  const body=candidate?.trim()&&validateWhatsAppTemplate(key,candidate).length===0 ? candidate : defaultWhatsAppTemplates[key]
  return body.replace(/\{\{([^{}]+)\}\}/g,(_match,name:string)=>values[name]??'').trim()
}
