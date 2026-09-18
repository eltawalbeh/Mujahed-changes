import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { List, MagnifyingGlass, X } from '@phosphor-icons/react'
import BrandLogo from './BrandLogo'
import IconButton from '@/components/ui/IconButton'
import BagIcon from '@/components/ui/BagIcon'
import { getPublicProducts } from '@/data/catalog'
import type { Product } from '@/types/product'
import { useRequestDraft } from '@/state/RequestDraftContext'

function navClass(active: boolean) { return active ? 'text-sm font-bold text-[var(--color-text)]' : 'text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]' }

export default function PublicHeader() {
  const { itemCount, openRequest } = useRequestDraft()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => { if (searchOpen && products.length === 0) void getPublicProducts().then(setProducts).catch(() => undefined) }, [searchOpen, products.length])
  const results = useMemo(() => { const value = query.trim().toLowerCase(); return value ? products.filter((product) => (product.name + ' ' + (product.shortDescription || '')).toLowerCase().includes(value)).slice(0, 6) : [] }, [products, query])
  const closeMenu = () => setMenuOpen(false)
  const nav = <><Link onClick={closeMenu} to="/" className={navClass(location.pathname === '/')}>الرئيسية</Link><Link onClick={closeMenu} to="/products" className={navClass(location.pathname === '/products' || location.pathname.startsWith('/product'))}>قائمتنا</Link><Link onClick={closeMenu} to="/business" className={navClass(location.pathname.startsWith('/business'))}>للشركات</Link><Link onClick={closeMenu} to="/about" className={navClass(location.pathname === '/about')}>عن الشيف مجاهد</Link></>
  const searchBox = <div className="relative w-full max-w-xl"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن منتج..." className="h-11 w-full border-0 border-b-2 border-[var(--color-border)] bg-transparent px-1 text-right outline-none transition-colors focus:border-[var(--color-accent)]" />{results.length ? <div className="absolute top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-xl">{results.map((product) => <Link key={product.id} to={'/product/' + product.slug} onClick={() => { setSearchOpen(false); setQuery('') }} className="block border-b border-[var(--color-border)] px-4 py-3 text-right text-sm hover:bg-[var(--color-bg)]">{product.name}</Link>)}</div> : null}</div>
  return <header dir="rtl" className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color:var(--color-surface)]/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 md:h-20 md:px-16"><Link to="/" aria-label="العودة إلى الرئيسية" className="shrink-0"><BrandLogo compact /></Link>{searchOpen ? <div className="hidden flex-1 justify-center px-4 md:flex">{searchBox}</div> : <nav className="hidden items-center gap-8 md:flex" aria-label="التنقل الرئيسي">{nav}</nav>}<div className="flex items-center gap-1.5"><IconButton label={searchOpen ? 'إغلاق البحث' : 'البحث في القائمة'} onClick={() => { setSearchOpen((value) => !value); setQuery('') }}>{searchOpen ? <X size={20} /> : <MagnifyingGlass size={20} />}</IconButton><IconButton label="الطلب" onClick={openRequest}><span className="relative inline-flex"><BagIcon />{itemCount > 0 ? <span className="absolute -left-2 -top-2 min-w-5 rounded-full bg-[var(--color-accent)] px-1 text-center text-[10px] font-bold leading-5 text-white">{itemCount}</span> : null}</span></IconButton><button type="button" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-lg border border-[var(--color-border)] md:hidden" aria-label="فتح القائمة"><List size={20} /></button></div></div>{searchOpen ? <div className="border-t border-[var(--color-border)] p-3 md:hidden">{searchBox}</div> : null}{menuOpen ? <div className="fixed inset-0 z-[80] flex min-h-[100dvh] flex-col bg-[var(--color-surface)] px-5 py-[max(1.25rem,env(safe-area-inset-top))] md:hidden"><div className="flex h-12 items-center justify-between"><Link to="/" onClick={closeMenu}><BrandLogo compact /></Link><button type="button" onClick={closeMenu} className="grid size-11 place-items-center rounded-xl border border-[var(--color-border)]" aria-label="إغلاق القائمة"><X size={22} /></button></div><nav className="mt-14 flex flex-col items-start gap-7 text-right" aria-label="التنقل الرئيسي للجوال">{nav}</nav><div className="mt-auto border-t border-[var(--color-border)] pt-5"><button type="button" onClick={() => { closeMenu(); openRequest() }} className="flex min-h-12 w-full items-center justify-between rounded-xl bg-[var(--color-text)] px-4 font-semibold text-[var(--color-on-primary)]"><span>{itemCount ? `${itemCount} منتجات في الطلب` : 'الطلب الحالي'}</span><BagIcon /></button></div></div> : null}</header>
}
