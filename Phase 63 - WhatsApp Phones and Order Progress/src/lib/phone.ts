/**
 * Phone numbers are stored as E.164 (+country + national number).
 * Default is Jordan, without guessing that an unfamiliar local number is Jordanian.
 * WhatsApp wa.me links use ONLY the resulting digits (without +, spaces, or dashes).
 */
export const COUNTRY_DIAL_CODES = [
  {code:'962',label:'الأردن (+962)'},
  {code:'966',label:'السعودية (+966)'},
  {code:'971',label:'الإمارات (+971)'},
  {code:'970',label:'فلسطين (+970)'},
  {code:'964',label:'العراق (+964)'},
  {code:'965',label:'الكويت (+965)'},
  {code:'974',label:'قطر (+974)'},
  {code:'973',label:'البحرين (+973)'},
  {code:'968',label:'عُمان (+968)'},
  {code:'961',label:'لبنان (+961)'},
  {code:'963',label:'سوريا (+963)'},
  {code:'20',label:'مصر (+20)'},
  {code:'1',label:'أمريكا/كندا (+1)'},
  {code:'44',label:'بريطانيا (+44)'},
  {code:'90',label:'تركيا (+90)'},
] as const

const latinDigits=(value:string)=>value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g,c=>{
  const n=c.charCodeAt(0)
  return String(n >= 0x6f0 ? n-0x6f0 : n-0x660)
})

export function normalizePhoneToE164(value:string|null|undefined, defaultDialCode='962'):string|null {
  const raw=latinDigits(String(value??'').trim()).replace(/[\u200e\u200f\u061c]/g,'')
  if(!raw)return null
  if(/[^\d\s()+.\-]/.test(raw))return null
  const digits=raw.replace(/\D/g,'')
  if(!digits)return null

  let international=''
  if(raw.trim().startsWith('+')||digits.startsWith('00')){
    international=digits.startsWith('00')?digits.slice(2):digits
  }else if(digits.startsWith('962')&&digits.length===12){
    international=digits
  }else {
    const dial=defaultDialCode.replace(/\D/g,'')
    if(!dial||dial.startsWith('0'))return null
    if(digits.startsWith(dial)&&digits.length>=dial.length+7){
      international=digits
    }else if(dial==='962') {
      // Jordan mobile: 077, 078 or 079 + 7 additional digits.
      const local=digits.startsWith('0')?digits.slice(1):digits
      if(!/^7[789]\d{7}$/.test(local))return null
      international='962'+local
    } else {
      international=dial+digits.replace(/^0+/,'')
    }
  }
  if(!/^[1-9]\d{7,14}$/.test(international))return null
  // Never turn a malformed Jordanian local number into a valid-looking wa.me link.
  if(international.startsWith('962')&&!/^9627[789]\d{7}$/.test(international))return null
  return '+'+international
}

export function whatsAppDigits(value:string|null|undefined, defaultDialCode='962'):string|null{
  const number=normalizePhoneToE164(value,defaultDialCode)
  return number?number.slice(1):null
}
