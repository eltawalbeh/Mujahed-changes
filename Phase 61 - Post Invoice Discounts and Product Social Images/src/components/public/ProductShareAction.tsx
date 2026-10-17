import { useEffect, useState } from 'react'
import { ShareNetwork, Check } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import type { Product } from '@/types/product'

const edgeBase=(import.meta.env.VITE_SUPABASE_URL||'https://hqvxhhhwzhefydvwlpje.supabase.co').replace(/\/$/,'')
export function productShareUrl(product:Pick<Product,'slug'>,channel:'B2C'|'B2B'='B2C'){
  return edgeBase+'/functions/v1/product-share?slug='+encodeURIComponent(product.slug)+'&channel='+channel
}
/** Client-side head is useful to browsers; crawlers use the server-rendered link above. */
function upsert(name:string,content:string,property=false){
  const attr=property?'property':'name'
  let tag=document.head.querySelector<HTMLMetaElement>('meta['+attr+'="'+name+'"]')
  if(!tag){tag=document.createElement('meta');tag.setAttribute(attr,name);document.head.appendChild(tag)}
  tag.content=content
}
export function useProductSocialMeta(product:Product|null, channel:'B2C'|'B2B'='B2C'){
  useEffect(()=>{
    if(!product)return
    const title=product.name+' | الشيف مجاهد'
    const description=product.shortDescription||product.longDescription||'اكتشف '+product.name+' من الشيف مجاهد'
    const image=product.images?.find(i=>i.isPrimary)?.url||product.images?.[0]?.url||''
    const canonical=window.location.origin+(channel==='B2B'?'/business/product/':'/product/')+encodeURIComponent(product.slug)
    document.title=title
    upsert('description',description)
    upsert('og:title',title,true);upsert('og:description',description,true)
    upsert('og:type','product',true);upsert('og:url',productShareUrl(product,channel),true)
    upsert('twitter:card','summary_large_image');upsert('twitter:title',title);upsert('twitter:description',description)
    if(image){upsert('og:image',image,true);upsert('twitter:image',image)}
    else {document.head.querySelector('meta[property="og:image"]')?.remove();document.head.querySelector('meta[name="twitter:image"]')?.remove()}
    const link=document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if(link)link.href=canonical
  },[product,channel])
}
export default function ProductShareAction({product,channel}:{product:Product;channel:'B2C'|'B2B'}){
  const [copied,setCopied]=useState(false)
  const share=async()=>{
    const url=productShareUrl(product,channel)
    try{
      if(typeof navigator.share==='function'){
        await navigator.share({title:product.name,text:product.shortDescription||product.name,url})
      }else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(url);setCopied(true)
      }else{
        window.prompt('انسخ رابط مشاركة المنتج:',url);setCopied(true)
      }
    }catch(e:any){if(e?.name!=='AbortError')window.prompt('انسخ رابط مشاركة المنتج:',url)}
  }
  return <Button variant="secondary" onClick={()=>void share()} aria-label={'مشاركة '+product.name}>
    {copied?<Check size={18} aria-hidden="true"/>:<ShareNetwork size={18} aria-hidden="true"/>}
    {copied?'تم نسخ رابط المشاركة':'مشاركة المنتج'}
  </Button>
}
