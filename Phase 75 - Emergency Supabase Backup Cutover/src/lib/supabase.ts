import { createClient } from '@supabase/supabase-js'

// Emergency cutover: explicitly bind to Chef Mujahed's BACKUP.
// Do not allow stale Figma Make VITE_SUPABASE_* env values to override this project.
export const supabaseUrl = 'https://xyjcazsrqjfnsexypwag.supabase.co'
export const supabasePublishableKey = 'sb_publishable_ThyDkyyTqnYEE2FoZdo48A_MQF5PIP2'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
