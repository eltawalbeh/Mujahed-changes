import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  b2cObservedSubtotal,
  createClientId,
  isUuid,
  requestItemCount,
  sameRequestItemConfiguration,
  type AddRequestItemInput,
} from '@/domain/request'
import type {
  B2CCustomerDraft,
  FulfillmentDraft,
  RequestItem,
} from '@/types/request'

const STORAGE_KEY = 'chef-mujahed:b2c-request-draft:v2'

type RequestDraftContextValue = {
  items: RequestItem[]
  itemCount: number
  subtotal: number
  isRequestOpen: boolean
  clientSubmissionId: string
  customer: B2CCustomerDraft
  fulfillment: FulfillmentDraft
  generalNotes: string
  addItem: (item: AddRequestItemInput) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  clearRequest: () => void
  openRequest: () => void
  closeRequest: () => void
  setCustomer: (value: B2CCustomerDraft) => void
  setFulfillment: (value: FulfillmentDraft) => void
  setGeneralNotes: (value: string) => void
}

const RequestDraftContext = createContext<RequestDraftContextValue | null>(null)

type StoredDraft = {
  items?: RequestItem[]
  clientSubmissionId?: string
  customer?: B2CCustomerDraft
  fulfillment?: FulfillmentDraft
  generalNotes?: string
}

const defaultCustomer: B2CCustomerDraft = { name: '', phone: '', email: '' }
const defaultFulfillment: FulfillmentDraft = {
  type: 'DELIVERY',
  address: '',
  locationNotes: '',
  preferredDate: '',
  preferredTime: '',
}

function readStoredDraft(): StoredDraft {
  if (typeof window === 'undefined') return {}
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function RequestDraftProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readStoredDraft(), [])
  const [items, setItems] = useState<RequestItem[]>(initial.items ?? [])
  const [clientSubmissionId, setClientSubmissionId] = useState(() =>
    isUuid(initial.clientSubmissionId) ? initial.clientSubmissionId : createClientId(),
  )
  const [customer, setCustomer] = useState<B2CCustomerDraft>(initial.customer ?? defaultCustomer)
  const [fulfillment, setFulfillment] = useState<FulfillmentDraft>(initial.fulfillment ?? defaultFulfillment)
  const [generalNotes, setGeneralNotes] = useState(initial.generalNotes ?? '')
  const [isRequestOpen, setIsRequestOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, clientSubmissionId, customer, fulfillment, generalNotes }),
    )
  }, [items, clientSubmissionId, customer, fulfillment, generalNotes])

  const addItem = useCallback((incoming: AddRequestItemInput) => {
    setItems((current) => {
      const existingIndex = current.findIndex((item) =>
        sameRequestItemConfiguration(item, incoming),
      )
      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + incoming.quantity }
            : item,
        )
      }
      return [
        ...current,
        { ...incoming, id: createClientId(), addedAt: new Date().toISOString() },
      ]
    })
    setIsRequestOpen(true)
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setItems((current) => current.map((item) =>
      item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item,
    ))
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId))
  }, [])

  const clearRequest = useCallback(() => {
    setItems([])
    setClientSubmissionId(createClientId())
    setCustomer(defaultCustomer)
    setFulfillment(defaultFulfillment)
    setGeneralNotes('')
    setIsRequestOpen(false)
  }, [])

  const itemCount = useMemo(() => requestItemCount(items), [items])
  const subtotal = useMemo(() => b2cObservedSubtotal(items), [items])

  const value = useMemo<RequestDraftContextValue>(() => ({
    items,
    itemCount,
    subtotal,
    isRequestOpen,
    clientSubmissionId,
    customer,
    fulfillment,
    generalNotes,
    addItem,
    updateQuantity,
    removeItem,
    clearRequest,
    openRequest: () => setIsRequestOpen(true),
    closeRequest: () => setIsRequestOpen(false),
    setCustomer,
    setFulfillment,
    setGeneralNotes,
  }), [items, itemCount, subtotal, isRequestOpen, clientSubmissionId, customer, fulfillment, generalNotes, addItem, updateQuantity, removeItem, clearRequest])

  return <RequestDraftContext.Provider value={value}>{children}</RequestDraftContext.Provider>
}

export function useRequestDraft() {
  const context = useContext(RequestDraftContext)
  if (!context) throw new Error('useRequestDraft must be used inside RequestDraftProvider')
  return context
}
