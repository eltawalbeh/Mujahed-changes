import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
export type DashboardLocale = 'ar' | 'en'
type Preferences = { locale: DashboardLocale; setLocale: (locale: DashboardLocale) => void }
const Context = createContext<Preferences | null>(null)
const KEY = 'chef-mujahed-dashboard-locale'
export function DashboardPreferencesProvider({ children }: { children: ReactNode }) { const [locale,setLocaleState]=useState<DashboardLocale>(() => typeof window !== 'undefined' && window.localStorage.getItem(KEY)==='en' ? 'en' : 'ar'); const setLocale=(next:DashboardLocale)=>{setLocaleState(next); if(typeof window!=='undefined') window.localStorage.setItem(KEY,next)}; const value=useMemo(()=>({locale,setLocale}),[locale]); return <Context.Provider value={value}>{children}</Context.Provider> }
export function useDashboardPreferences(){ const value=useContext(Context); if(!value) throw new Error('useDashboardPreferences must be used inside DashboardPreferencesProvider'); return value }
