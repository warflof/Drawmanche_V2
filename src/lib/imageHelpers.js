import { supabase } from './supabase'

export function getDisplayUrl(path) {
  if (!path) return ''
  const relative = path.startsWith('dessins-display/')
    ? path.slice('dessins-display/'.length)
    : path
  return supabase.storage.from('dessins-display').getPublicUrl(relative).data.publicUrl
}
