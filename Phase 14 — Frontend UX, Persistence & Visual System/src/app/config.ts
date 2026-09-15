export const appConfig = {
  name: 'Chef Mujahed',
  locale: 'en-JO',
  currency: 'JOD',
  direction: 'rtl' as const,
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER?.trim() ?? '',
} as const
