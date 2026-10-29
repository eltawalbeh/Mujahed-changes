import { createClient } from '@supabase/supabase-js'

// Emergency Supabase database cutover. This project ID is intentionally fixed:
// Figma Make's previously configured VITE_SUPABASE_* values still point at the
// restricted project and MUST NOT silently override the backup project.
const supabaseUrl = 'https://xyjcazsrqjfnsexypwag.supabase.co'
const supabasePublishableKey = 'sb_publishable_ThyDkyyTqnYEE2FoZdo48A_MQF5PIP2'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'chef-mujahed-backup-auth-v1',
  },
})
