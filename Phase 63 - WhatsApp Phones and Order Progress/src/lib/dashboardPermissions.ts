import type { DashboardRole } from '@/types/dashboard'

export function canManagePricing(role: DashboardRole) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function canLinkCustomers(role: DashboardRole) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function canEditBasePrice(role: DashboardRole) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function canEditOperationalProductFields(_role: DashboardRole) {
  return true
}

export function canManageContent(role: DashboardRole) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function canCreateOrImportProducts(role: DashboardRole) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function canManageProductionAccess(role: DashboardRole) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function canManageUsers(role: DashboardRole) {
  return role === 'SUPER_ADMIN'
}

export function roleLabel(role: DashboardRole) {
  if (role === 'SUPER_ADMIN') return 'مدير النظام'
  if (role === 'ADMIN') return 'مدير'
  return 'مشرف'
}

export function canManageOrderProgress(role: DashboardRole) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}
