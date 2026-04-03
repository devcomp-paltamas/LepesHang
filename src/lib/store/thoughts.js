import { supabase } from '../supabase.js'
import { isMissingThoughtTableError, makeId } from './shared.js'

export async function saveThoughtEntry(input) {
  const payload = {
    id: input.id || makeId(),
    entry_date: input.entry_date,
    content: input.content?.trim() || '',
  }

  if (!payload.entry_date || !payload.content) {
    throw new Error('A dátum és a gondolat szövege kötelező.')
  }

  const { error } = await supabase.from('thought_entries').upsert(payload)
  if (isMissingThoughtTableError(error)) {
    throw new Error(
      'A gondolatnapló táblát előbb létre kell hozni a Supabase adatbázisban a frissített `supabase/schema.sql` alapján.',
    )
  }
  if (error) throw error

  return payload
}

export async function deleteThoughtEntry(entryId) {
  if (!entryId) {
    throw new Error('A törlendő gondolat azonosítója hiányzik.')
  }

  const { error } = await supabase.from('thought_entries').delete().eq('id', entryId)
  if (isMissingThoughtTableError(error)) {
    throw new Error(
      'A gondolatnapló táblát előbb létre kell hozni a Supabase adatbázisban a frissített `supabase/schema.sql` alapján.',
    )
  }
  if (error) throw error
}
