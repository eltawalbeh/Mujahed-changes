import { supabase } from '@/lib/supabase'
import type { DashboardRuntime } from '@/data/dashboard'

export type PlatformStatus = { websiteEnabled: boolean; appEnabled: boolean; updatedAt?: string }
export type DataSnapshot = { id: string; scope: 'OPERATIONAL'|'CATALOG'|'CONTENT'|'FULL'; createdAt: string; restoredAt?: string | null }

export async function getPublicPlatformStatus(): Promise<PlatformStatus> {
  const { data, error } = await supabase.rpc('get_public_platform_status')
  if (error) return { websiteEnabled: true, appEnabled: true }
  return { websiteEnabled: data?.websiteEnabled !== false, appEnabled: data?.appEnabled !== false }
}
async function adminRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> { const { data, error }=await supabase.rpc(name,args); if(error) throw error; return data as T }
export async function getPlatformSettings(runtime: DashboardRuntime): Promise<PlatformStatus> { if(runtime.mode==='preview') return {websiteEnabled:true,appEnabled:true}; return adminRpc('dashboard_get_platform_settings') }
export async function updatePlatformSettings(runtime: DashboardRuntime, websiteEnabled: boolean, appEnabled: boolean): Promise<PlatformStatus> { if(runtime.mode==='preview') return {websiteEnabled,appEnabled}; return adminRpc('dashboard_update_platform_settings',{p_website_enabled:websiteEnabled,p_app_enabled:appEnabled}) }
export async function listDataSnapshots(runtime: DashboardRuntime): Promise<DataSnapshot[]> { if(runtime.mode==='preview') return []; return adminRpc('dashboard_list_data_snapshots') }
export async function resetData(runtime: DashboardRuntime, scope: DataSnapshot['scope']): Promise<{snapshot:{id:string}}> { if(runtime.mode==='preview') throw new Error('المعاينة لا تسمح بإعادة ضبط البيانات.'); return adminRpc('dashboard_reset_data',{p_scope:scope,p_confirmation:'RESET'}) }
export async function restoreDataSnapshot(runtime: DashboardRuntime, snapshotId: string): Promise<void> { if(runtime.mode==='preview') throw new Error('المعاينة لا تسمح بالاستعادة.'); await adminRpc('dashboard_restore_data_snapshot',{p_snapshot_id:snapshotId}) }
