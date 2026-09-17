import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { DashboardError, DashboardLoading, DashboardRestricted } from '@/components/dashboard/DashboardStates'
import {
  createDashboardUser,
  listDashboardUsers,
  resetDashboardUserPassword,
  updateDashboardUserRole,
  updateDashboardUserStatus,
} from '@/data/auth'
import { useDashboard } from '@/state/DashboardContext'
import { canManageUsers, roleLabel } from '@/lib/dashboardPermissions'
import type { DashboardRole, DashboardUserListItem, DashboardUserStatus } from '@/types/dashboard'

const roleOptions: DashboardRole[] = ['SUPER_ADMIN','ADMIN','SUPERVISOR']

export default function UsersPage() {
  const { role, runtime } = useDashboard()
  const [items, setItems] = useState<DashboardUserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState({ displayName:'', email:'', role:'SUPERVISOR' as DashboardRole })
  const [busy, setBusy] = useState('')
  const [credential, setCredential] = useState<{email:string; password:string; title:string}|null>(null)

  const load = useCallback(async () => {
    if (!canManageUsers(role)) return
    try { setLoading(true); setError(''); const data=await listDashboardUsers({q}); setItems(data.items) }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل المستخدمين.') }
    finally { setLoading(false) }
  }, [role,q])

  useEffect(()=>{ void load() },[load])
  const currentUserId = runtime.access?.userId
  const visible = useMemo(()=>items,[items])

  if (!canManageUsers(role)) return <DashboardRestricted />

  const create = async () => {
    if (!form.displayName.trim() || !form.email.trim()) return
    try {
      setBusy('create'); setError('')
      const result=await createDashboardUser(form)
      if (result.temporaryPassword) setCredential({email:form.email.trim(),password:result.temporaryPassword,title:'تم إنشاء المستخدم'})
      setForm({displayName:'',email:'',role:'SUPERVISOR'})
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء المستخدم.') }
    finally { setBusy('') }
  }

  const changeRole = async (user: DashboardUserListItem, next: DashboardRole) => {
    try { setBusy(user.userId); await updateDashboardUserRole(user.userId,next); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث الصلاحية.') }
    finally { setBusy('') }
  }

  const changeStatus = async (user: DashboardUserListItem, next: DashboardUserStatus) => {
    try { setBusy(user.userId); await updateDashboardUserStatus(user.userId,next); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث الحالة.') }
    finally { setBusy('') }
  }

  const resetPassword = async (user: DashboardUserListItem) => {
    try {
      setBusy(user.userId); const result=await resetDashboardUserPassword(user.userId)
      if (result.temporaryPassword) setCredential({email:user.email,password:result.temporaryPassword,title:'كلمة مرور مؤقتة جديدة'})
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إعادة تعيين كلمة المرور.') }
    finally { setBusy('') }
  }

  return <main className="p-4 lg:p-8">
    <div className="mx-auto max-w-[1200px] space-y-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">إضافة مستخدم داخلي</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">يتم إنشاء كلمة مرور مؤقتة وتظهر مرة واحدة فقط. المستخدم سيُطلب منه تغييرها عند أول دخول.</p></div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]">
          <input value={form.displayName} onChange={(e)=>setForm({...form,displayName:e.target.value})} placeholder="اسم المستخدم" className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3"/>
          <input dir="ltr" type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="name@example.com" className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-left"/>
          <select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value as DashboardRole})} className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3">{roleOptions.map((r)=><option key={r} value={r}>{roleLabel(r)}</option>)}</select>
          <Button onClick={()=>void create()} disabled={busy==='create'}>{busy==='create'?'جاري الإنشاء...':'إضافة المستخدم'}</Button>
        </div>
      </section>

      {credential ? <section className="rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="text-right"><p className="text-xs font-bold text-[var(--color-accent)]">تظهر مرة واحدة</p><h3 className="mt-1 text-lg font-bold">{credential.title}</h3><p dir="ltr" className="mt-3 text-left font-mono text-sm">{credential.email}</p><p dir="ltr" className="mt-2 rounded-xl bg-[var(--color-bg)] p-3 text-left font-mono text-base font-bold">{credential.password}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={()=>void navigator.clipboard.writeText(`${credential.email}\n${credential.password}`)}>نسخ البيانات</Button><Button variant="ghost" onClick={()=>setCredential(null)}>إغلاق</Button></div></div></section> : null}

      {error ? <div className="rounded-xl bg-[#FFF1F1] p-3 text-center text-sm font-semibold text-[#9B2C2C]">{error}</div> : null}

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">المستخدمون والصلاحيات</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">إدارة الوصول الداخلي للـDashboard فقط. شاشة المطبخ تبقى بنظام PIN منفصل.</p></div><div className="flex gap-2"><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="بحث بالاسم أو البريد" className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3"/><Button variant="secondary" onClick={()=>void load()}>بحث</Button></div></div>
        {loading ? <DashboardLoading/> : visible.length ? <div className="mt-5"><div className="space-y-3 md:hidden">{visible.map(user=>{const self=user.userId===currentUserId;return <article key={user.userId} className="rounded-xl border border-[var(--color-border)] p-4 text-right"><div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.status==='ACTIVE'?'bg-[#E8F5E9] text-[#507047]':'bg-[#FFF1F1] text-[#9B2C2C]'}`}>{user.status==='ACTIVE'?'نشط':'موقوف'}</span><div className="min-w-0"><p className="font-bold">{user.displayName}{self?' · أنت':''}</p><p dir="ltr" className="mt-1 truncate text-right text-xs text-[var(--color-text-muted)]">{user.email}</p></div></div><div className="mt-3 grid gap-3 border-t border-[var(--color-border)] pt-3"><label className="text-xs text-[var(--color-text-muted)]">الصلاحية<select disabled={self||busy===user.userId} value={user.role} onChange={(e)=>void changeRole(user,e.target.value as DashboardRole)} className="mt-1 block h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm text-[var(--color-text)]">{roleOptions.map((r)=><option key={r} value={r}>{roleLabel(r)}</option>)}</select></label><p className="text-xs text-[var(--color-text-muted)]">آخر دخول: {user.lastLoginAt?new Date(user.lastLoginAt).toLocaleString('ar-JO'):'لم يسجل بعد'}</p><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={self||busy===user.userId} onClick={()=>void changeStatus(user,user.status==='ACTIVE'?'SUSPENDED':'ACTIVE')}>{user.status==='ACTIVE'?'إيقاف':'إعادة تفعيل'}</Button><Button size="sm" variant="ghost" disabled={self||busy===user.userId} onClick={()=>void resetPassword(user)}>كلمة مرور جديدة</Button></div></div></article>})}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-right text-sm"><thead><tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]"><th className="p-3">المستخدم</th><th className="p-3">الصلاحية</th><th className="p-3">الحالة</th><th className="p-3">آخر دخول</th><th className="p-3">إجراءات</th></tr></thead><tbody>{visible.map((user)=>{const self=user.userId===currentUserId;return <tr key={user.userId} className="border-b border-[var(--color-border)] last:border-0"><td className="p-3"><p className="font-bold">{user.displayName}{self?' · أنت':''}</p><p dir="ltr" className="mt-1 text-right text-xs text-[var(--color-text-muted)]">{user.email}</p>{user.mustChangePassword?<span className="mt-2 inline-block rounded-full bg-[var(--color-bg)] px-2 py-1 text-[11px]">بانتظار تغيير كلمة المرور</span>:null}</td><td className="p-3"><select disabled={self||busy===user.userId} value={user.role} onChange={(e)=>void changeRole(user,e.target.value as DashboardRole)} className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-2">{roleOptions.map((r)=><option key={r} value={r}>{roleLabel(r)}</option>)}</select></td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.status==='ACTIVE'?'bg-[#E8F5E9] text-[#507047]':'bg-[#FFF1F1] text-[#9B2C2C]'}`}>{user.status==='ACTIVE'?'نشط':'موقوف'}</span></td><td className="p-3 text-[var(--color-text-muted)]">{user.lastLoginAt?new Date(user.lastLoginAt).toLocaleString('ar-JO'):'لم يسجل بعد'}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={self||busy===user.userId} onClick={()=>void changeStatus(user,user.status==='ACTIVE'?'SUSPENDED':'ACTIVE')}>{user.status==='ACTIVE'?'إيقاف':'إعادة تفعيل'}</Button><Button size="sm" variant="ghost" disabled={self||busy===user.userId} onClick={()=>void resetPassword(user)}>كلمة مرور جديدة</Button></div></td></tr>})}</tbody></table></div></div> : <div className="mt-6"><DashboardError onRetry={()=>void load()}/></div>}
      </section>
    </div>
  </main>
}
