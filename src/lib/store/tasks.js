import { supabase } from '../supabase.js'
import {
  getTodayDateKey,
  isMissingTaskTableError,
  makeId,
  TASK_PRIORITIES,
} from './shared.js'

export async function ensureDailyTaskPlan(planDate) {
  const { data: todayPlanRows, error: todayPlanError } = await supabase
    .from('task_entries')
    .select('id')
    .eq('plan_date', planDate)
    .limit(1)

  if (isMissingTaskTableError(todayPlanError)) {
    return
  }
  if (todayPlanError) {
    throw todayPlanError
  }
  if (todayPlanRows?.length) {
    return
  }

  const { data: previousRows, error: previousRowsError } = await supabase
    .from('task_entries')
    .select('description, priority, is_completed, plan_date, created_at')
    .lt('plan_date', planDate)
    .order('plan_date', { ascending: false })
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(300)

  if (isMissingTaskTableError(previousRowsError)) {
    return
  }
  if (previousRowsError) {
    throw previousRowsError
  }

  const rows = previousRows || []
  if (!rows.length) {
    return
  }

  const latestPlanDate = rows[0].plan_date
  const rowsToCarry = rows.filter((row) => row.plan_date === latestPlanDate && !row.is_completed)

  if (!rowsToCarry.length) {
    return
  }

  const payload = rowsToCarry.map((row) => ({
    id: makeId(),
    plan_date: planDate,
    priority: row.priority,
    description: row.description,
    is_completed: false,
    completed_at: null,
  }))

  const { error: insertError } = await supabase.from('task_entries').insert(payload)

  if (isMissingTaskTableError(insertError)) {
    return
  }
  if (insertError) {
    throw insertError
  }
}

export async function saveTaskEntry(input) {
  const priority = String(input.priority || '').trim().toUpperCase()
  const planDate = input.plan_date || getTodayDateKey()
  const payload = {
    id: input.id || makeId(),
    plan_date: planDate,
    priority,
    description: input.description?.trim() || '',
    is_completed: Boolean(input.is_completed),
    completed_at: input.is_completed ? new Date().toISOString() : null,
  }

  if (!payload.plan_date) {
    throw new Error('A feladat dátuma kötelező.')
  }

  if (!TASK_PRIORITIES.has(payload.priority)) {
    throw new Error('A prioritás csak A1-A3, B1-B3 vagy C1-C3 lehet.')
  }

  if (!payload.description) {
    throw new Error('A feladat leírása kötelező.')
  }

  const { error } = await supabase.from('task_entries').upsert(payload)
  if (isMissingTaskTableError(error)) {
    throw new Error(
      'A feladatlista táblát előbb létre kell hozni a Supabase adatbázisban a frissített `supabase/schema.sql` alapján.',
    )
  }
  if (error) throw error

  return payload
}

export async function completeTaskEntry(taskId) {
  if (!taskId) {
    throw new Error('A lezárandó feladat azonosítója hiányzik.')
  }

  const { error } = await supabase
    .from('task_entries')
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq('id', taskId)

  if (isMissingTaskTableError(error)) {
    throw new Error(
      'A feladatlista táblát előbb létre kell hozni a Supabase adatbázisban a frissített `supabase/schema.sql` alapján.',
    )
  }
  if (error) throw error
}
