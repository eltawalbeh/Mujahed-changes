import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main dir="rtl" className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-4 text-center text-[var(--color-text)]"><section className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-[0_18px_60px_rgba(29,23,20,.08)]"><p className="text-sm font-bold text-[var(--color-accent)]">تعذر فتح الصفحة</p><h1 className="mt-3 text-2xl font-bold">حدث خطأ غير متوقع</h1><p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">لم يتم حذف بيانات طلبك. أعد تحميل الصفحة، ثم تواصل معنا إذا تكرر الأمر.</p><button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-12 rounded-xl bg-[var(--color-text)] px-5 text-sm font-semibold text-[var(--color-on-primary)]">إعادة تحميل الصفحة</button></section></main>
  }
}
