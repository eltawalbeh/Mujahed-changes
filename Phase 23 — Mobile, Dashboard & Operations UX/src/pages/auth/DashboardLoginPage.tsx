import { FormEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/public/BrandLogo'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { dashboardSignIn } from '@/data/auth'
import { supabase } from '@/lib/supabase'

export default function DashboardLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)))
  }, [])

  if (hasSession === true) return <Navigate to="/dashboard" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) return
    try {
      setBusy(true)
      setError('')
      const access = await dashboardSignIn(email, password)
      navigate(access.mustChangePassword ? '/dashboard/change-password' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-4 py-10 text-[var(--color-text)]">
      <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_18px_60px_rgba(29,23,20,.08)] md:p-9">
        <div className="text-center">
          <BrandLogo className="justify-center" />
          <p className="mt-5 text-xs font-bold text-[var(--color-accent)]">الوصول الداخلي</p>
          <h1 className="mt-2 text-3xl font-bold">تسجيل الدخول</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">للمستخدمين المصرح لهم فقط.</p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-right">
            <span className="mb-1.5 block text-sm font-semibold">البريد الإلكتروني</span>
            <input dir="ltr" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-left outline-none focus:border-[var(--color-accent)]" />
          </label>
          <label className="block text-right">
            <span className="mb-1.5 block text-sm font-semibold">كلمة المرور</span>
            <div className="relative" dir="ltr"><input type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 pr-12 text-left outline-none focus:border-[var(--color-accent)]" /><button type="button" onClick={()=>setShowPassword(value=>!value)} className="absolute inset-y-0 right-2 my-auto grid size-9 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]" aria-label={showPassword?'إخفاء كلمة المرور':'إظهار كلمة المرور'}>{showPassword?<EyeSlash size={20}/>:<Eye size={20}/>}</button></div>
          </label>
          {error ? <div role="alert" className="rounded-xl bg-[#FFF1F1] p-3 text-center text-sm font-semibold text-[#9B2C2C]">{error}</div> : null}
          <Button size="lg" className="w-full" type="submit" disabled={busy || !email.trim() || !password}>{busy ? 'جاري تسجيل الدخول...' : 'دخول لوحة التحكم'}</Button>
        </form>

        <p className="mt-5 text-center text-xs leading-6 text-[var(--color-text-muted)]">نسيت كلمة المرور؟ اطلب من مدير النظام إصدار كلمة مرور مؤقتة جديدة.</p>
      </section>
    </main>
  )
}
