import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import { paths } from '@/domain/paths'
import RequestItemRow from './RequestItemRow'
import RequestSummary from './RequestSummary'
import { useRequestDraft } from '@/state/RequestDraftContext'

export default function RequestPanel() {
  const navigate = useNavigate()
  const {
    items,
    itemCount,
    subtotal,
    isRequestOpen,
    closeRequest,
    updateQuantity,
    removeItem,
  } = useRequestDraft()

  if (!isRequestOpen) return null

  const continueRequest = () => {
    if (!items.length) return
    closeRequest()
    navigate(paths.b2c.details)
  }

  return (
    <>
      <button
        aria-label="إغلاق الطلب"
        className="fixed inset-0 z-50 bg-black/20"
        onClick={closeRequest}
      />

      <aside className="fixed inset-y-0 right-0 z-[60] hidden w-[380px] border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[-4px_0_12px_rgba(0,0,0,.06)] md:flex md:flex-col">
        <div className="flex items-center justify-between p-6">
          <button
            type="button"
            onClick={closeRequest}
            className="grid size-8 place-items-center rounded-full text-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
          >
            ×
          </button>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--color-accent)] px-2 py-1 text-xs font-bold text-white">
              {itemCount} منتجات
            </span>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              الطلب الحالي
            </h2>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)]" />

        <div className="flex-1 overflow-y-auto p-6">
          {items.length ? (
            <div className="space-y-3">
              {items.map((item) => (
                <RequestItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={(quantity) =>
                    updateQuantity(item.id, quantity)
                  }
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid min-h-[280px] place-items-center text-center">
              <div>
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--color-bg)] text-2xl">
                  ◫
                </div>
                <p className="mt-4 font-bold text-[var(--color-text)]">
                  الطلب فارغ
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  تصفح المنتجات وأضف ما يعجبك للمتابعة
                </p>
              </div>
            </div>
          )}
        </div>

        {items.length ? (
          <div className="border-t border-[var(--color-border)] p-6">
            <RequestSummary subtotal={subtotal} />
            <Button
              size="lg"
              className="mt-6 w-full"
              onClick={continueRequest}
            >
              متابعة الطلب
            </Button>
            <p className="mt-2 text-center text-[11px] text-[var(--color-text-muted)]">
              * الطلب خاضع للموافقة ولا يعتبر فاتورة نهائية
            </p>
          </div>
        ) : null}
      </aside>

      <section role="dialog" aria-modal="true" aria-labelledby="request-panel-title" className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[calc(100dvh-12px)] flex-col overflow-hidden rounded-t-[24px] bg-[var(--color-surface)] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,.12)] md:hidden">
        <div className="mx-auto h-1 w-10 rounded-full bg-[var(--color-border)]" />

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={closeRequest}
            className="grid size-10 place-items-center rounded-full text-xl text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            ×
          </button>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--color-text-muted)] px-2 py-1 text-xs text-white">
              {itemCount} منتجات
            </span>
            <h2 id="request-panel-title" className="text-lg font-bold text-[var(--color-text)]">
              الطلب
            </h2>
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--color-border)]" />

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {items.length ? (
            <div className="space-y-3">
              {items.map((item) => (
                <RequestItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={(quantity) =>
                    updateQuantity(item.id, quantity)
                  }
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--color-bg)] text-2xl">
                ◫
              </div>
              <p className="mt-4 font-bold text-[var(--color-text)]">
                الطلب فارغ
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                تصفح المنتجات وأضف ما يعجبك للمتابعة
              </p>
            </div>
          )}
        </div>

        {items.length ? (
          <>
            <div className="border-t border-[var(--color-border)] pt-4">
              <RequestSummary subtotal={subtotal} compact />
            </div>

            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={continueRequest}
            >
              متابعة الطلب
            </Button>

            <p className="mt-3 text-center text-[11px] text-[var(--color-text-muted)]">
              * الطلب خاضع للموافقة ولا يعتبر فاتورة نهائية
            </p>
          </>
        ) : null}
      </section>
    </>
  )
}
