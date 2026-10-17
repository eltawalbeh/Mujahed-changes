const assert=require('node:assert/strict')
const {normalizePhoneToE164,whatsAppDigits}=require('/tmp/chef-mujahed-phone.cjs')
const {buildWhatsAppUrl,buildOrderStatusWhatsAppMessage}=require('/tmp/chef-mujahed-wa.cjs')
for(const [input,expected,dial] of [
  ['0791234567','+962791234567'],
  ['791234567','+962791234567'],
  ['+962 79 123 4567','+962791234567'],
  ['00962791234567','+962791234567'],
  ['962791234567','+962791234567'],
  ['٠٧٩١٢٣٤٥٦٧','+962791234567'],
  ['+966 50 123 4567','+966501234567'],
  ['0501234567','+966501234567','966'],
  ['+971501234567','+971501234567'],
  ['+441632960555','+441632960555'],
])assert.equal(normalizePhoneToE164(input,dial),expected,input)
for(const bad of ['0791234','1234567890','abc','+abc','00000000','+0001234567','07912345678']){
  assert.equal(normalizePhoneToE164(bad),null,'invalid '+bad)
  assert.equal(buildWhatsAppUrl('Message',bad),'','never message an invalid phone')
}
assert.equal(whatsAppDigits('0791234567'),'962791234567')
const url=buildWhatsAppUrl('مرحبا، الطلب معتمد','0791234567')
assert.ok(url.startsWith('https://wa.me/962791234567?text='))
assert.equal(decodeURIComponent(url.split('?text=')[1]),'مرحبا، الطلب معتمد')
assert.equal(buildWhatsAppUrl('confirmed','+966501234567').split('?')[0],'https://wa.me/966501234567')
const message=buildOrderStatusWhatsAppMessage({reference:'CM-TEST-001',customerName:'أحمد',status:'READY',fulfillmentType:'COLLECTION'})
assert.match(message,/جاهز للاستلام/)
assert.match(message,/CM-TEST-001/)
assert.ok(!message.includes('تم الدفع')) // never claim payment on a B2B company account
const approved=buildOrderStatusWhatsAppMessage({reference:'CM-TEST-002',status:'APPROVED',fulfillmentType:'DELIVERY'})
assert.match(approved,/تأكيد واعتماد/)
console.log('Phone and WhatsApp QA: international numbers, Jordan, invalid numbers, messages passed')
