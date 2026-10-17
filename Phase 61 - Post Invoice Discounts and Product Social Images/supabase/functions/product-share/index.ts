// Public read-only social sharing endpoint. Crawler receives server-generated OG meta.
// Human visitors are sent to the canonical Figma Make storefront product route.

const origin=(Deno.env.get('SITE_URL')||'https://chefmujahed.com').replace(/\/$/,'')
const projectUrl=Deno.env.get('SUPABASE_URL')||'https://hqvxhhhwzhefydvwlpje.supabase.co'
const anonKey=Deno.env.get('SUPABASE_ANON_KEY')||''
const escapeHtml=(input:unknown)=>String(input??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch))
const headers={'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=120, s-maxage=300','x-content-type-options':'nosniff'}
const error=(msg:string,code=404)=>new Response(msg,{status:code,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}})
Deno.serve(async(req)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return error('Method not allowed',405)
  try{
    const url=new URL(req.url)
    const slug=(url.searchParams.get('slug')||'').trim()
    const channel=(url.searchParams.get('channel')||'B2C').toUpperCase()
    if(!slug||slug.length>150||!(/^[\p{L}\p{N}_-]+$/u.test(slug))||!['B2B','B2C'].includes(channel))return error('Invalid product link',400)
    if(!anonKey)return error('Public catalog API is not configured',503)
    const getPublic=async(path:string)=>{
      const res=await fetch(projectUrl+'/rest/v1/'+path,{headers:{apikey:anonKey,Authorization:'Bearer '+anonKey,Accept:'application/json'}})
      if(!res.ok)throw new Error('Public catalog returned '+res.status)
      return await res.json()
    }
    const channelList=channel==='B2B'?'(B2B,BOTH)':'(B2C,BOTH)'
    const params=new URLSearchParams({
      select:'id,name_ar,slug,short_description_ar,channel',
      slug:'eq.'+slug,public_visible:'eq.true',status:'eq.ACTIVE',availability:'eq.AVAILABLE',
      channel:'in.'+channelList,limit:'1',
    })
    const [product]=await getPublic('products?'+params.toString())
    if(!product)return error('Product not found')
    const imageParams=new URLSearchParams({select:'image_url,is_primary,sort_order',
      product_id:'eq.'+product.id,is_active:'eq.true',order:'is_primary.desc,sort_order.asc',limit:'4'})
    const imgs=await getPublic('product_images?'+imageParams.toString())
    const validImage=(imgs||[]).find((x:{image_url:string})=>{try{return new URL(x.image_url).protocol==='https:'}catch{return false}})?.image_url||''
    const path=(channel==='B2B'?'/business/product/':'/product/')+encodeURIComponent(product.slug)
    const canonical=origin+path
    const share=url.origin+url.pathname+'?slug='+encodeURIComponent(slug)+'&channel='+channel
    const title=product.name_ar+' | الشيف مجاهد'
    const description=product.short_description_ar?.trim()||'اكتشف '+product.name_ar+' من منتجات الشيف مجاهد في إربد.'
    const html=`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>${escapeHtml(title)}</title>
      <meta name="description" content="${escapeHtml(description)}"/>
      <meta property="og:type" content="product"/>
      <meta property="og:site_name" content="Chef Mujahed"/>
      <meta property="og:locale" content="ar_JO"/>
      <meta property="og:title" content="${escapeHtml(title)}"/>
      <meta property="og:description" content="${escapeHtml(description)}"/>
      <meta property="og:url" content="${escapeHtml(share)}"/>
      ${validImage?`<meta property="og:image" content="${escapeHtml(validImage)}"/><meta property="og:image:secure_url" content="${escapeHtml(validImage)}"/><meta property="og:image:alt" content="${escapeHtml(product.name_ar)}"/>`:''}
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:title" content="${escapeHtml(title)}"/>
      <meta name="twitter:description" content="${escapeHtml(description)}"/>
      ${validImage?`<meta name="twitter:image" content="${escapeHtml(validImage)}"/>`:''}
      <link rel="canonical" href="${escapeHtml(canonical)}"/>
      <meta http-equiv="refresh" content="1;url=${escapeHtml(canonical)}"/>
      </head><body style="font:16px/1.5 Arial;padding:32px;background:#F8F2EA;color:#281B14">
      <p>جاري نقلك إلى <strong>${escapeHtml(product.name_ar)}</strong>...</p>
      <p><a href="${escapeHtml(canonical)}">افتح صفحة المنتج</a></p>
      <script>window.location.replace(${JSON.stringify(canonical).replace(/</g,'\\u003c')})</script>
      </body></html>`
    return new Response(req.method==='HEAD'?null:html,{headers})
  }catch(e){console.error('product-share exception',e);return error('Share preview temporarily unavailable',500)}
})
