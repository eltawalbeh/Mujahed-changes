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
  createClientId,
  isUuid,
  requestItemCount,
  sameRequestItemConfiguration,
  type AddRequestItemInput,
} from '@/domain/request'
import type { B2BCompanyDraft, FulfillmentDraft, RequestItem } from '@/types/request'

const STORAGE_KEY = 'chef-mujahed:b2b-request-draft:v1'

type ContextValue = {
  items: RequestItem[]
  itemCount: number
  isRequestOpen: boolean
  clientSubmissionId: string
  company: B2BCompanyDraft
  fulfillment: FulfillmentDraft
  generalNotes: string
  addItem: (item: AddRequestItemInput) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  clearRequest: () => void
  openRequest: () => void
  closeRequest: () => void
  setCompany: (value: B2BCompanyDraft) => void
  setFulfillment: (value: FulfillmentDraft) => void
  setGeneralNotes: (value: string) => void
}

const B2BRequestDraftContext = createContext<ContextValue | null>(null)
const defaultCompany: B2BCompanyDraft = { companyName: '', contactName: '', phone: '', email: '' }
const defaultFulfillment: FulfillmentDraft = {
  type: 'DELIVERY',
  address: '',
  locationNotes: '',
  preferredDate: '',
  preferredTime: '',
}

function readDraft() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function B2BRequestDraftProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readDraft(), []) as any
  const [items, setItems] = useState<RequestItem[]>(initial.items ?? [])
  const [clientSubmissionId, setClientSubmissionId] = useState<string>(() =>
    isUuid(initial.clientSubmissionId) ? initial.clientSubmissionId : createClientId(),
  )
  const [company, setCompany] = useState<B2BCompanyDraft>(initial.company ?? defaultCompany)
  const [fulfillment, setFulfillment] = useState<FulfillmentDraft>(initial.fulfillment ?? defaultFulfillment)
  const [generalNotes, setGeneralNotes] = useState<string>(initial.generalNotes ?? '')
  const [isRequestOpen, setIsRequestOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, clientSubmissionId, company, fulfillment, generalNotes }))
  }, [items, clientSubmissionId, company, fulfillment, generalNotes])

  const addItem = useCallback((incoming: AddRequestItemInput) => {
    setItems((current) => {
      const index = current.findIndex((item) => sameRequestItemConfiguration(item, incoming))
      if (index >= 0) {
        return current.map((item, i) => i === index ? { ...item, quantity: item.quantity + incoming.quantity } : item)
      }
      return [...current, { ...incoming, id: createClientId(), addedAt: new Date().toISOString() }]
    })
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
  }, [])

  const removeItem = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), [])

  const clearRequest = useCallback(() => {
    setItems([])
    setClientSubmissionId(createClientId())
    setCompany(defaultCompany)
    setFulfillment(defaultFulfillment)
    setGeneralNotes('')
    setIsRequestOpen(false)
  }, [])

  const itemCount = useMemo(() => requestItemCount(items), [items])

  const value = useMemo<ContextValue>(() => ({
    items,
    itemCount,
    isRequestOpen,
    clientSubmissionId,
    company,
    fulfillment,
    generalNotes,
    addItem,
    updateQuantity,
    removeItem,
    clearRequest,
    openRequest: () => setIsRequestOpen(true),
    closeRequest: () => setIsRequestOpen(false),
    setCompany,
    setFulfillment,
    setGeneralNotes,
  }), [items, itemCount, isRequestOpen, clientSubmissionId, company, fulfillment, generalNotes, addItem, updateQuantity, removeItem, clearRequest])

  return <B2BRequestDraftContext.Provider value={value}>{children}</B2BRequestDraftContext.Provider>
}

export function useB2BRequestDraft() {
  const value = useContext(B2BRequestDraftContext)
  if (!value) throw new Error('useB2BRequestDraft must be used inside B2BRequestDraftProvider')
  return value
}
