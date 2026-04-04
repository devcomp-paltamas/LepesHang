import { supabase } from '../supabase.js'
import { makeId } from './shared.js'

const START_LOG_SELECT =
  'id, schedule_item_id, routine_block_id, source_id, completion_status, notes, rating, created_at'

async function getScheduleItemById(scheduleItemId) {
  const { data, error } = await supabase
    .from('schedule_items')
    .select('id, routine_block_id, source_id, status')
    .eq('id', scheduleItemId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function getInProgressLog(scheduleItemId) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(START_LOG_SELECT)
    .eq('schedule_item_id', scheduleItemId)
    .eq('completion_status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}

function toStartedRoutineLog({ log = null, scheduleItem, routineBlock }) {
  return {
    id: log?.id || null,
    schedule_item_id: scheduleItem.id,
    routine_block_id: log?.routine_block_id || scheduleItem.routine_block_id || routineBlock.id,
    source_id: log?.source_id ?? scheduleItem.source_id ?? null,
    completion_status: 'in_progress',
    notes: log?.notes || '',
    rating: log?.rating ?? null,
  }
}

async function ensureScheduleInProgress(scheduleItem) {
  const latestScheduleItem = await getScheduleItemById(scheduleItem.id)

  if (!latestScheduleItem?.id) {
    throw new Error('Az ütemezett blokk nem található.')
  }

  if (latestScheduleItem.status === 'done' || latestScheduleItem.status === 'skipped') {
    throw new Error('A lezárt vagy kihagyott blokk nem indítható újra.')
  }

  if (latestScheduleItem.status === 'in_progress') {
    return latestScheduleItem
  }

  const { error: updateError } = await supabase
    .from('schedule_items')
    .update({ status: 'in_progress' })
    .eq('id', scheduleItem.id)
    .eq('status', 'planned')

  if (updateError) {
    const recoveredScheduleItem = await getScheduleItemById(scheduleItem.id)

    if (recoveredScheduleItem?.status === 'in_progress') {
      return recoveredScheduleItem
    }

    throw updateError
  }

  const refreshedScheduleItem = await getScheduleItemById(scheduleItem.id)

  if (!refreshedScheduleItem?.id) {
    throw new Error('Az ütemezett blokk nem található a frissítés után.')
  }

  if (refreshedScheduleItem.status !== 'in_progress') {
    throw new Error('A blokk állapota nem frissült elindítottra.')
  }

  return refreshedScheduleItem
}

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

  const currentScheduleItem = await ensureScheduleInProgress(scheduleItem)
  const existingLog = await getInProgressLog(scheduleItem.id)

  if (existingLog) {
    return toStartedRoutineLog({
      log: existingLog,
      scheduleItem: currentScheduleItem,
      routineBlock,
    })
  }

  const logPayload = {
    id: makeId(),
    schedule_item_id: scheduleItem.id,
    routine_block_id: currentScheduleItem.routine_block_id || routineBlock.id,
    source_id: currentScheduleItem.source_id || null,
    completion_status: 'in_progress',
  }

  const { error: insertError } = await supabase.from('activity_logs').insert(logPayload)

  if (!insertError) {
    return logPayload
  }

  const recoveredLog = await getInProgressLog(scheduleItem.id)

  if (recoveredLog) {
    return toStartedRoutineLog({
      log: recoveredLog,
      scheduleItem: currentScheduleItem,
      routineBlock,
    })
  }

  const recoveredScheduleItem = await getScheduleItemById(scheduleItem.id)

  if (recoveredScheduleItem?.status === 'in_progress') {
    return toStartedRoutineLog({
      scheduleItem: recoveredScheduleItem,
      routineBlock,
    })
  }

  throw insertError
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
