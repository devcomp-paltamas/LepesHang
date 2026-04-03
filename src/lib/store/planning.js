import { supabase } from '../supabase.js'
import { makeId } from './shared.js'

export async function saveScheduleItem(input) {
  let scheduleItemId = input.id || null

  if (!scheduleItemId && input.weekly_plan_id) {
    const { data: existingItem, error: lookupError } = await supabase
      .from('schedule_items')
      .select('id')
      .eq('weekly_plan_id', input.weekly_plan_id)
      .eq('routine_block_id', input.routine_block_id)
      .eq('scheduled_date', input.scheduled_date)
      .maybeSingle()

    if (lookupError) throw lookupError
    scheduleItemId = existingItem?.id || null
  }

  const payload = {
    id: scheduleItemId || makeId(),
    weekly_plan_id: input.weekly_plan_id,
    routine_block_id: input.routine_block_id,
    source_id: input.source_id || null,
    scheduled_date: input.scheduled_date,
    status: input.status || 'planned',
    is_quick_play: Boolean(input.is_quick_play),
    priority: input.priority || 1,
  }

  if (input.weekly_plan) {
    const { error: planError } = await supabase.from('weekly_plans').upsert({
      id: input.weekly_plan.id,
      week_start_date: input.weekly_plan.week_start_date,
      week_end_date: input.weekly_plan.week_end_date,
      status: input.weekly_plan.status || 'draft',
      ai_recommendation: input.weekly_plan.ai_recommendation || '',
    })

    if (planError) throw planError
  }

  const { error } = await supabase.from('schedule_items').upsert(payload)
  if (error) throw error

  return payload
}

export async function startRoutine({ scheduleItem, routineBlock }) {
  if (!scheduleItem?.id) {
    throw new Error('A blokk nem indítható érvényes ütemezés nélkül.')
  }

  if (scheduleItem.status === 'done' || scheduleItem.status === 'skipped') {
    throw new Error('A lezárt vagy kihagyott blokk nem indítható újra.')
  }

  const { data: existingLogs, error: existingLogError } = await supabase
    .from('activity_logs')
    .select('id, schedule_item_id, routine_block_id, source_id, completion_status, notes, rating, created_at')
    .eq('schedule_item_id', scheduleItem.id)
    .eq('completion_status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingLogError) throw existingLogError
  const existingLog = existingLogs?.[0] || null

  if (existingLog?.id) {
    const { error: syncStatusError } = await supabase
      .from('schedule_items')
      .update({ status: 'in_progress' })
      .eq('id', scheduleItem.id)
      .eq('status', 'planned')

    if (syncStatusError) throw syncStatusError

    return {
      id: existingLog.id,
      schedule_item_id: scheduleItem.id,
      routine_block_id: existingLog.routine_block_id || scheduleItem.routine_block_id || routineBlock.id,
      source_id: existingLog.source_id ?? scheduleItem.source_id ?? null,
      completion_status: 'in_progress',
      notes: existingLog.notes || '',
      rating: existingLog.rating ?? null,
    }
  }

  const logPayload = {
    id: makeId(),
    schedule_item_id: scheduleItem.id,
    routine_block_id: scheduleItem.routine_block_id || routineBlock.id,
    source_id: scheduleItem.source_id || null,
    completion_status: 'in_progress',
  }

  const [{ error: scheduleError }, { error: logError }] = await Promise.all([
    supabase.from('schedule_items').update({ status: 'in_progress' }).eq('id', scheduleItem.id).eq('status', 'planned'),
    supabase.from('activity_logs').insert(logPayload),
  ])

  if (scheduleError || logError) {
    const [recoveredLogResult, recoveredScheduleResult] = await Promise.all([
      supabase
        .from('activity_logs')
        .select('id, schedule_item_id, routine_block_id, source_id, completion_status, notes, rating, created_at')
        .eq('schedule_item_id', scheduleItem.id)
        .eq('completion_status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase.from('schedule_items').select('id, status').eq('id', scheduleItem.id).maybeSingle(),
    ])

    const recoveredLog =
      !recoveredLogResult.error && recoveredLogResult.data?.length ? recoveredLogResult.data[0] : null
    const recoveredStatus =
      !recoveredScheduleResult.error && recoveredScheduleResult.data ? recoveredScheduleResult.data.status : null

    if (recoveredLog && recoveredStatus === 'in_progress') {
      return {
        id: recoveredLog.id,
        schedule_item_id: recoveredLog.schedule_item_id || scheduleItem.id,
        routine_block_id: recoveredLog.routine_block_id || scheduleItem.routine_block_id || routineBlock.id,
        source_id: recoveredLog.source_id ?? scheduleItem.source_id ?? null,
        completion_status: 'in_progress',
        notes: recoveredLog.notes || '',
        rating: recoveredLog.rating ?? null,
      }
    }

    throw logError || scheduleError || recoveredLogResult.error || recoveredScheduleResult.error
  }

  return logPayload
}

export async function completeRoutine({
  logId,
  scheduleItemId,
  routineBlockId,
  sourceId,
  completionStatus,
  rating,
  notes,
}) {
  const logPatch = {
    completion_status: completionStatus,
    rating: rating ? Number(rating) : null,
    notes: notes || '',
  }

  const schedulePatch = {
    status: completionStatus === 'missed' ? 'skipped' : 'done',
  }

  const logOperation = logId
    ? supabase.from('activity_logs').update(logPatch).eq('id', logId)
    : supabase.from('activity_logs').insert({
        id: makeId(),
        schedule_item_id: scheduleItemId,
        routine_block_id: routineBlockId,
        source_id: sourceId || null,
        ...logPatch,
      })

  const [{ error: logError }, { error: scheduleError }] = await Promise.all([
    logOperation,
    supabase.from('schedule_items').update(schedulePatch).eq('id', scheduleItemId),
  ])

  if (logError) throw logError
  if (scheduleError) throw scheduleError

  return { id: logId, ...logPatch }
}

export async function saveWeeklyRecommendation(input) {
  const payload = {
    id: input.id || makeId(),
    week_start_date: input.week_start_date,
    week_end_date: input.week_end_date,
    status: input.status || 'draft',
    ai_recommendation: input.ai_recommendation?.trim() || '',
  }

  const { error } = await supabase.from('weekly_plans').upsert(payload)
  if (error) throw error

  return payload
}

export async function saveDailyRecommendation(input) {
  const payload = {
    id: input.id || makeId(),
    weekly_plan_id: input.weekly_plan_id || null,
    target_date: input.target_date,
    routine_block_id: input.routine_block_id || null,
    recommended_source_id: input.recommended_source_id || null,
    recommendation_text: input.recommendation_text?.trim() || '',
    reasoning_summary: input.reasoning_summary?.trim() || '',
  }

  if (!payload.target_date || !payload.recommendation_text) {
    throw new Error('A dátum és az ajánlás szövege kötelező.')
  }

  const { error } = await supabase.from('ai_recommendations').upsert(payload)
  if (error) throw error

  return payload
}
