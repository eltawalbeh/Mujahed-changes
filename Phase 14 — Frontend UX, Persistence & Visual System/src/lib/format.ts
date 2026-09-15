import { appConfig } from '@/app/config'

export function formatJod(value: number) {
  return new Intl.NumberFormat('en-JO', {
    style: 'currency',
    currency: appConfig.currency,
    maximumFractionDigits: 3,
  }).format(value)
}