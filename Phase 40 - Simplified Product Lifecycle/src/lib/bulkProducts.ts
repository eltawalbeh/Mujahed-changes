import * as XLSX from 'xlsx'
import type { CatalogCategory } from '@/data/catalog'

export type BulkUnit={label:string;channel:'B2C'|'B2B';priceJod?:string;availability?:string;sortOrder?:number}
export type BulkProductRow={nameAr:string;sku:string;channel:'B2C'|'B2B'|string;categorySlug?:string;shortDescriptionAr?:string;longDescriptionAr?:string;basePriceJod?:string;availability?:'AVAILABLE'|'UNAVAILABLE'|string;b2bAllowCustomUnit?:boolean;units?:BulkUnit[];imageUrl?:string;slug?:string}

const productHeaders={nameAr:['الاسم','اسم المنتج','name','name_ar'],sku:['SKU','sku'],channel:['القناة','channel'],categorySlug:['التصنيف','category_slug','category'],shortDescriptionAr:['الوصف المختصر','short_description_ar'],longDescriptionAr:['الوصف الكامل','long_description_ar'],basePriceJod:['السعر الأساسي JOD','base_price_jod'],availability:['التوفر','availability'],b2bAllowCustomUnit:['وحدة مخصصة B2B','b2b_allow_custom_unit'],imageUrl:['رابط الصورة','image_url'],slug:['Slug','slug']} as const
const unitHeaders={sku:['SKU المنتج','product_sku','sku'],label:['اسم الوحدة','unit_label'],priceJod:['سعر الوحدة JOD','unit_price_jod'],availability:['توفر الوحدة','unit_availability'],sortOrder:['ترتيب','sort_order']} as const
function pick(row:Record<string,any>,names:readonly string[]){for(const name of names)if(row[name]!=null)return String(row[name]).trim();return''}
function bool(v:string){return['1','true','yes','y','نعم','صح'].includes(v.toLowerCase())}

export async function parseBulkProductFile(file:File):Promise<BulkProductRow[]>{
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'})
  const products=XLSX.utils.sheet_to_json<Record<string,any>>(wb.Sheets.Products??wb.Sheets[wb.SheetNames[0]],{defval:''})
  const rawUnits=wb.Sheets.Units?XLSX.utils.sheet_to_json<Record<string,any>>(wb.Sheets.Units,{defval:''}):[]
  const grouped=new Map<string,Array<Omit<BulkUnit,'channel'>>>()
  for(const row of rawUnits){const sku=pick(row,unitHeaders.sku).toUpperCase(),label=pick(row,unitHeaders.label);if(!sku||!label)continue;const list=grouped.get(sku)??[];list.push({label,priceJod:pick(row,unitHeaders.priceJod),availability:pick(row,unitHeaders.availability).toUpperCase()||'AVAILABLE',sortOrder:Number(pick(row,unitHeaders.sortOrder)||list.length+1)});grouped.set(sku,list)}
  return products.map(row=>{
    const value:Record<string,any>={nameAr:pick(row,productHeaders.nameAr),sku:pick(row,productHeaders.sku).toUpperCase(),channel:pick(row,productHeaders.channel).toUpperCase()||'B2C',availability:pick(row,productHeaders.availability).toUpperCase()||'AVAILABLE'}
    for(const[key,names]of Object.entries(productHeaders)){if(['nameAr','sku','channel','availability','b2bAllowCustomUnit'].includes(key))continue;const v=pick(row,names);if(v)value[key]=v}
    const custom=pick(row,productHeaders.b2bAllowCustomUnit);if(custom)value.b2bAllowCustomUnit=bool(custom)
    const units=grouped.get(value.sku);if(units)value.units=units.map(unit=>({...unit,channel:value.channel}))
    return value as BulkProductRow
  }).filter(row=>row.nameAr||row.sku)
}

export function downloadBulkProductTemplate(categories:CatalogCategory[]){
  const products=XLSX.utils.json_to_sheet([{'اسم المنتج':'مثال منتج','SKU':'CM-001','القناة':'B2C','التصنيف':categories[0]?.slug??'','الوصف المختصر':'','الوصف الكامل':'','السعر الأساسي JOD':'5.000','التوفر':'AVAILABLE','وحدة مخصصة B2B':'لا','رابط الصورة':'','Slug':''}])
  const units=XLSX.utils.json_to_sheet([{'SKU المنتج':'CM-001','اسم الوحدة':'علبة صغيرة','سعر الوحدة JOD':'5.000','توفر الوحدة':'AVAILABLE','ترتيب':1}])
  const categoriesSheet=XLSX.utils.json_to_sheet(categories.map(x=>({'اسم التصنيف':x.label,'Slug المطلوب':x.slug})))
  const info=XLSX.utils.aoa_to_sheet([['تعليمات'],['ورقة Products: صف واحد لكل منتج. اختر B2C أو B2B؛ المنتج المتاح ينشر تلقائياً.'],['لتوفير المنتج للقناتين، أضف صفين بنفس الاسم وSKU مختلف: واحد B2C وواحد B2B. لكل صف وحداته وأسعاره الخاصة.'],['التوفر: AVAILABLE للنشر مباشرة، UNAVAILABLE للإبقاء مخفياً. لا توجد حالة مسودة أو خطوة نشر منفصلة.'],['احذف من القالب أعمدة الحالة الداخلية والظهور اليدوي؛ التوفر هو الذي يتحكم بهما تلقائياً.'],['السعر الأساسي اختياري عند وجود وحدات مسعّرة. SKU موجود = تحديث المنتج والوحدات المرفقة به فقط.'],['ورقة Units: SKU المنتج، اسم الوحدة، سعرها، توفرها، وترتيبها. القناة تؤخذ تلقائياً من المنتج.']])
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,products,'Products');XLSX.utils.book_append_sheet(wb,units,'Units');XLSX.utils.book_append_sheet(wb,categoriesSheet,'Categories');XLSX.utils.book_append_sheet(wb,info,'Instructions');XLSX.writeFile(wb,'chef-mujahed-products-template.xlsx')
}
