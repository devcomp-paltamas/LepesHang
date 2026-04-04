import { supabase } from '../supabase.js'
import { normalizeRichTextValue } from '../rich-text.js'
import { makeId } from './shared.js'

export async function saveSource(input) {
  const payload = {
    id: input.id || makeId(),
    name: input.name?.trim() || '',
    provider: input.provider?.trim() || '',
    content_type: input.content_type || 'audio',
    url: input.url?.trim() || '',
    category: input.category?.trim() || '',
    difficulty_level: input.difficulty_level ? Number(input.difficulty_level) : null,
    notes: normalizeRichTextValue(input.notes),
    is_active: input.is_active ?? true,
  }

  if (!payload.name || !payload.provider) {
    throw new Error('A név és a szolgáltató kötelező.')
  }

  const { error } = await supabase.from('sources').upsert(payload)
  if (error) throw error

  return payload
}

export async function setSourceActive(sourceId, isActive) {
  const { error } = await supabase.from('sources').update({ is_active: isActive }).eq('id', sourceId)
  if (error) throw error
}

export async function saveOptionItem(kind, value) {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    throw new Error('Az érték nem lehet üres.')
  }

  const table = kind === 'provider' ? 'provider_options' : 'category_options'
  const { error } = await supabase.from(table).upsert({ value: trimmedValue }, { onConflict: 'value' })

  if (error) throw error
}

export async function deleteOptionItem(kind, value) {
  const table = kind === 'provider' ? 'provider_options' : 'category_options'
  const sourceColumn = kind === 'provider' ? 'provider' : 'category'
  const { count, error: usageError } = await supabase
    .from('sources')
    .select('id', { count: 'exact', head: true })
    .eq(sourceColumn, value)

  if (usageError) throw usageError

  if ((count || 0) > 0) {
    throw new Error(
      kind === 'provider'
        ? `A szolgáltató még ${count} forráshoz van rendelve, ezért nem törölhető.`
        : `A kategória még ${count} forráshoz van rendelve, ezért nem törölhető.`,
    )
  }

  const { error } = await supabase.from(table).delete().eq('value', value)

  if (error) throw error
}
