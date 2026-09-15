import { useCallback, useEffect, useMemo, useState } from 'react'
import B2BHeader from '@/components/b2b/B2BHeader'
import B2BProductCard from '@/components/b2b/B2BProductCard'
import B2BSearchOverlay from '@/components/b2b/B2BSearchOverlay'
import PublicFooter from '@/components/public/PublicFooter'
import CategoryChips from '@/components/public/CategoryChips'
import CatalogSkeleton from '@/components/public/CatalogSkeleton'
import StatePanel from '@/components/ui/StatePanel'
import { getB2BProducts, getPublicCategories, type CatalogCategory } from '@/data/catalog'
import { useSitePage } from '@/hooks/useSitePage'
import type { Product } from '@/types/product'

export default function B2BHomePage() {
  const content = useSitePage<any>('business')
  const [categories,setCategories]=useState<CatalogCategory[]>([]); const [products,setProducts]=useState<Product[]>([]); const [activeCategory,setActiveCategory]=useState('all'); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [searchOpen,setSearchOpen]=useState(false)
  const load=useCallback(async()=>{try{setLoading(true);setError('');const [c,p]=await Promise.all([getPublicCategories(),getB2BProducts()]);setCategories(c);setProducts(p)}catch{setError('تعذر تحميل منتجات الشركات حالياً.')}finally{setLoading(false)}},[])
  useEffect(()=>{void load()},[load])
  const categoryOptions=useMemo(()=>[{id:'all',label:'الكل'},...categories.map(c=>({id:c.id,label:c.label}))],[categories])
  const visible=useMemo(()=>activeCategory==='all'?products:products.filter(p=>p.categoryId===activeCategory),[activeCategory,products])
  return <div className="min-h-screen overflow-x-hidden bg-[var(--color-bg)]"><B2BHeader onSearch={()=>setSearchOpen(true)}/><main>
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"><div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-14 md:px-16 md:py-20 lg:grid-cols-[1fr_0.72fr]" dir="ltr"><div className="grid min-h-[330px] place-items-center overflow-hidden rounded-[32px] bg-[var(--color-text-muted)] p-8 text-center text-[var(--color-surface)]">{content.heroImageUrl?<img src={content.heroImageUrl} alt="" className="h-full w-full object-cover"/>:<div><span className="text-7xl font-bold">B2B</span><p className="mt-4 text-sm tracking-[.1em]">حلويات · كميات · تخصيص</p></div>}</div><div dir="rtl" className="self-center text-right"><div className="inline-flex items-center gap-2 rounded-full border border-[rgba(112,138,100,.2)] bg-[rgba(112,138,100,.1)] px-4 py-2 text-sm font-semibold text-[#708A64]"><span className="size-2 rounded-full bg-[#708A64]"/>{content.eyebrow}</div><h1 className="mt-5 text-[38px] font-bold leading-tight md:text-[52px]">{content.title}</h1><p className="mt-5 max-w-[620px] text-base leading-8 text-[var(--color-text-muted)]">{content.description}</p><a href="#business-products" className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#2E1E17] px-7 font-semibold text-white shadow-sm transition-colors hover:bg-[#4A3024]">ابدأ من المنتجات</a></div></div></section>
    <section className="mx-auto max-w-[1440px] px-4 py-12 md:px-16 md:py-16"><div className="grid gap-4 md:grid-cols-3">{(content.steps??[]).map((step:any,index:number)=><article key={index} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-right"><span className="text-xs font-bold text-[var(--color-accent)]">{String(index+1).padStart(2,'0')}</span><h2 className="mt-4 text-lg font-bold">{step.title}</h2><p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">{step.description}</p></article>)}</div></section>
    <section id="business-products" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]"><div className="mx-auto max-w-[1440px] px-4 py-10 md:px-16 md:py-14"><div className="mb-6 text-right"><p className="text-xs font-semibold text-[var(--color-accent)]">{content.catalogEyebrow}</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">{content.catalogTitle}</h2><p className="mt-2 text-sm text-[var(--color-text-muted)]">{content.catalogDescription}</p></div><div className="mb-6"><CategoryChips categories={categoryOptions} activeId={activeCategory} onChange={setActiveCategory}/></div>{loading?<CatalogSkeleton/>:error?<StatePanel title="تعذر تحميل منتجات الشركات" description={error} actionLabel="إعادة المحاولة" onAction={()=>void load()} tone="error"/>:visible.length?<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">{visible.map(p=><B2BProductCard key={p.id} product={p}/>)}</div>:<StatePanel title="لا توجد منتجات في هذا التصنيف"/>}</div></section>
    <section className="mx-auto max-w-[1440px] px-4 py-12 md:px-16 md:py-16"><div className="rounded-[28px] bg-[#2E1E17] p-7 text-right text-white md:p-10"><h2 className="text-2xl font-bold">{content.confirmationTitle}</h2><p className="mt-3 max-w-3xl text-sm leading-7 opacity-75">{content.confirmationDescription}</p></div></section>
  </main><PublicFooter/>{searchOpen?<B2BSearchOverlay products={products} onClose={()=>setSearchOpen(false)}/>:null}</div>
}
