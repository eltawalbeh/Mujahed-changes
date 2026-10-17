import * as XLSX from 'xlsx'
import type { CatalogCategory } from '@/data/catalog'

export type BulkUnit = {label:string;channel:'B2C'|'B2B';priceJod?:string;availability?:string;sortOrder?:number}
export type BulkProductRow = {
  nameAr:string;sku:string;rowRef?:string;channel:'B2C'|'B2B'|string;
  categorySlug?:string;shortDescriptionAr?:string;longDescriptionAr?:string;
  basePriceJod?:string;availability?:'AVAILABLE'|'UNAVAILABLE'|string;
  b2bAllowCustomUnit?:boolean;units?:BulkUnit[];imageUrl?:string;slug?:string
}

const productHeaders={
  rowRef:['رقم صف المنتج','product_row','row_ref'],
  nameAr:['الاسم','اسم المنتج','name','name_ar'],
  sku:['SKU موجود (للتحديث فقط)','SKU','sku'],
  channel:['القناة','channel'],
  categorySlug:['التصنيف','category_slug','category'],
  shortDescriptionAr:['الوصف المختصر','short_description_ar'],
  longDescriptionAr:['الوصف الكامل','long_description_ar'],
  basePriceJod:['السعر الأساسي JOD','base_price_jod'],
  availability:['الظهور','التوفر','availability'],
  b2bAllowCustomUnit:['وحدة مخصصة B2B','b2b_allow_custom_unit'],
  imageUrl:['رابط الصورة','image_url'],
  slug:['Slug','slug'],
} as const
const unitHeaders={
  rowRef:['رقم صف المنتج','product_row','row_ref'],
  sku:['SKU المنتج','product_sku','sku'],
  label:['اسم الوحدة','unit_label'],
  priceJod:['سعر الوحدة JOD','unit_price_jod'],
  availability:['توفر الوحدة','unit_availability'],
  sortOrder:['ترتيب','sort_order'],
} as const
function pick(row:Record<string,any>,names:readonly string[]) {
  for(const name of names)if(row[name]!=null)return String(row[name]).trim()
  return ''
}
function bool(v:string){return ['1','true','yes','y','نعم','صح'].includes(v.toLowerCase())}

export async function parseBulkProductFile(file:File):Promise<BulkProductRow[]>{
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'})
  const sheet=wb.Sheets.Products??wb.Sheets[wb.SheetNames[0]]
  if(!sheet) throw new Error('الملف لا يحتوي على ورقة منتجات.')
  const products=XLSX.utils.sheet_to_json<Record<string,any>>(sheet,{defval:''})
  const rawUnits=wb.Sheets.Units?XLSX.utils.sheet_to_json<Record<string,any>>(wb.Sheets.Units,{defval:''}):[]
  const grouped=new Map<string,Array<Omit<BulkUnit,'channel'>>>()
  for(const row of rawUnits){
    const rowRef=pick(row,unitHeaders.rowRef),sku=pick(row,unitHeaders.sku).toUpperCase()
    const label=pick(row,unitHeaders.label)
    if(!label)continue
    if(!rowRef&&!sku)throw new Error('ورقة Units: كل وحدة تحتاج رقم صف المنتج. SKU القديم مسموح فقط لتحديث منتج موجود.')
    const key=rowRef?'ROW:'+rowRef:'SKU:'+sku
    const list=grouped.get(key)??[]
    list.push({label,priceJod:pick(row,unitHeaders.priceJod),availability:pick(row,unitHeaders.availability).toUpperCase()||'AVAILABLE',sortOrder:Number(pick(row,unitHeaders.sortOrder)||list.length+1)})
    grouped.set(key,list)
  }

  const all=new Set<string>()
  const output=products.map((row,index)=>{
    const ref=pick(row,productHeaders.rowRef)||String(index+1)
    const sku=pick(row,productHeaders.sku).toUpperCase()
    if(all.has(ref))throw new Error('رقم صف المنتج مكرر في ملف Excel: '+ref)
    all.add(ref)
    const value:BulkProductRow={
      rowRef:ref,
      nameAr:pick(row,productHeaders.nameAr),
      sku,
      channel:pick(row,productHeaders.channel).toUpperCase()||'B2C',
      availability:pick(row,productHeaders.availability).toUpperCase()||'UNAVAILABLE',
    }
    for(const [key,names] of Object.entries(productHeaders)){
      if(['rowRef','nameAr','sku','channel','availability','b2bAllowCustomUnit'].includes(key))continue
      const v=pick(row,names)
      if(v)(value as unknown as Record<string,any>)[key]=v
    }
    const custom=pick(row,productHeaders.b2bAllowCustomUnit)
    if(custom)value.b2bAllowCustomUnit=bool(custom)
    const linked=grouped.get('ROW:'+ref)??(sku?grouped.get('SKU:'+sku):undefined)
    if(linked){value.units=linked.map(unit=>({...unit,channel:value.channel as 'B2C'|'B2B'}));grouped.delete('ROW:'+ref);if(sku)grouped.delete('SKU:'+sku)}
    return value
  }).filter(row=>row.nameAr||row.sku)
  if(grouped.size)throw new Error('يوجد وحدات في ورقة Units لا ترتبط بمنتج. تأكد أن «رقم صف المنتج» مطابق لورقة Products: '+[...grouped.keys()].join('، '))
  return output
}

export function downloadBulkProductTemplate(categories:CatalogCategory[]){
  const products=XLSX.utils.json_to_sheet([
    {'رقم صف المنتج':'1','اسم المنتج':'مثال منتج للأفراد','القناة':'B2C','التصنيف':categories[0]?.slug??'','الوصف المختصر':'','الوصف الكامل':'','السعر الأساسي JOD':'5.000','الظهور':'UNAVAILABLE','وحدة مخصصة B2B':'لا','SKU موجود (للتحديث فقط)':''},
    {'رقم صف المنتج':'2','اسم المنتج':'مثال توريد شركات','القناة':'B2B','التصنيف':categories[0]?.slug??'','الوصف المختصر':'','الوصف الكامل':'','السعر الأساسي JOD':'','الظهور':'UNAVAILABLE','وحدة مخصصة B2B':'لا','SKU موجود (للتحديث فقط)':''},
  ])
  const units=XLSX.utils.json_to_sheet([
    {'رقم صف المنتج':'1','اسم الوحدة':'قطعة','سعر الوحدة JOD':'5.000','توفر الوحدة':'AVAILABLE','ترتيب':1},
    {'رقم صف المنتج':'2','اسم الوحدة':'علبة','سعر الوحدة JOD':'','توفر الوحدة':'AVAILABLE','ترتيب':1},
  ])
  const categoriesSheet=XLSX.utils.json_to_sheet(categories.map(x=>({'اسم التصنيف':x.label,'Slug المطلوب':x.slug})))
  const info=XLSX.utils.aoa_to_sheet([
    ['تعليمات'],
    ['لا تكتب SKU للمنتجات الجديدة؛ النظام سيصدر CM-B2C-0001 أو CM-B2B-0001 تلقائيًا عند الاستيراد. الرقم الفعلي يعتمد على التسلسل الحالي.'],
    ['رقم صف المنتج (1، 2، 3...) هو مرجع محلي لربط وحدات المنتج في Excel، وليس SKU.'],
    ['ضع رقم صف المنتج نفسه في ورقتي Products وUnits لربط العبوات بالمنتج المناسب.'],
    ['SKU موجود (للتحديث فقط): املأه حصريًا إذا كنت تحدّث منتجًا موجودًا بالفعل، ولا تخترع أي SKU جديد.'],
    ['منتجات B2C وB2B تأخذ تسلسلات منفصلة؛ المنتج الجديد يُنشأ مخفيًا لحين اكتمال وحداته وصوره.'],
    ['المنتجات الحالية وأرقام SKU القديمة لا تتغير.'],
  ])
  const wb=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb,products,'Products')
  XLSX.utils.book_append_sheet(wb,units,'Units')
  XLSX.utils.book_append_sheet(wb,categoriesSheet,'Categories')
  XLSX.utils.book_append_sheet(wb,info,'Instructions')
  XLSX.writeFile(wb,'chef-mujahed-automatic-sku-template.xlsx')
}
