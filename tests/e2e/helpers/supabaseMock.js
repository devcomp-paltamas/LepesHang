function createBaseMockState() {
  return {
    provider_options: [],
    category_options: [],
    routine_blocks: [
      { id: 'block-1', name: 'Reggeli seta', mode: 'morning', theme_mode: 'auto', is_active: true },
      { id: 'block-2', name: 'Esti onfejlesztes', mode: 'evening', theme_mode: 'auto', is_active: true },
    ],
    sources: [],
    habits: [],
    habit_logs: [],
    weekly_plan: {
      id: 'plan-1',
      week_start_date: '2026-03-23',
      week_end_date: '2026-03-29',
      status: 'draft',
      ai_recommendation: '',
    },
    schedule_items: [],
    activity_logs: [],
    thought_entries: [],
    task_entries: [],
    knowledge_entries: [],
    ai_recommendations: [],
    notifications: [],
  }
}

function normalizeScheduleItem(item) {
  return {
    ...item,
    routine_block_id: item.routine_block_id || item.block_id,
    scheduled_date: item.scheduled_date || item.schedule_date,
    is_quick_play: item.is_quick_play ?? false,
    priority: item.priority ?? 1,
  }
}

function normalizeActivityLog(log) {
  return {
    ...log,
    routine_block_id: log.routine_block_id || log.block_id,
    notes: log.notes ?? log.completion_notes ?? '',
    rating: log.rating ?? log.completion_rating ?? null,
  }
}

function createLegacyActivityLogs(scheduleItems, activityLogs) {
  const knownScheduleIds = new Set(activityLogs.map((log) => log.schedule_item_id).filter(Boolean))

  return scheduleItems.flatMap((item) => {
    if (!item.id || knownScheduleIds.has(item.id)) {
      return []
    }

    const derivedStatus =
      item.status === 'done'
        ? 'done'
        : item.status === 'skipped'
          ? 'missed'
          : item.status === 'in_progress'
            ? 'in_progress'
            : null

    const notes = item.notes ?? item.completion_notes ?? ''
    const rating = item.rating ?? item.completion_rating ?? null
    const hasLegacyPayload = Boolean(derivedStatus || notes || rating !== null)

    if (!hasLegacyPayload || !item.routine_block_id) {
      return []
    }

    return [
      {
        id: `activity-${item.id}`,
        schedule_item_id: item.id,
        routine_block_id: item.routine_block_id,
        source_id: item.source_id || null,
        completion_status: derivedStatus || 'in_progress',
        notes,
        rating,
        created_at: item.started_at || item.completed_at || '2026-03-29T08:30:00.000Z',
      },
    ]
  })
}

export function createMockState(overrides = {}) {
  const base = createBaseMockState()
  const merged = {
    ...base,
    ...overrides,
    weekly_plan: {
      ...base.weekly_plan,
      ...(overrides.weekly_plan || {}),
    },
  }

  const normalizedScheduleItems = (merged.schedule_items || []).map(normalizeScheduleItem)
  const normalizedActivityLogs = (merged.activity_logs || []).map(normalizeActivityLog)

  merged.schedule_items = normalizedScheduleItems
  merged.activity_logs = [
    ...normalizedActivityLogs,
    ...createLegacyActivityLogs(normalizedScheduleItems, normalizedActivityLogs),
  ]

  return JSON.parse(JSON.stringify(merged))
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  })
}

function readEqFilter(searchParams, key) {
  const value = searchParams.get(key)

  if (!value || !value.startsWith('eq.')) return null

  return decodeURIComponent(value.slice(3))
}

function readLtFilter(searchParams, key) {
  const value = searchParams.get(key)

  if (!value || !value.startsWith('lt.')) return null

  return decodeURIComponent(value.slice(3))
}

function readGteFilter(searchParams, key) {
  const value = searchParams.get(key)

  if (!value || !value.startsWith('gte.')) return null

  return decodeURIComponent(value.slice(4))
}

function readLteFilter(searchParams, key) {
  const value = searchParams.get(key)

  if (!value || !value.startsWith('lte.')) return null

  return decodeURIComponent(value.slice(4))
}

export async function attachSupabaseMock(page, overrides = {}) {
  const {
    simulateActivityLogInsertFailureAfterWrite = false,
    ...stateOverrides
  } = overrides
  const state = createMockState(stateOverrides)
  let remainingActivityLogInsertFailures = simulateActivityLogInsertFailureAfterWrite ? 1 : 0

  await page.route('https://test.supabase.co/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').pop()

    if (!table) {
      await route.abort()
      return
    }

    if (request.method() === 'GET') {
      if (table === 'weekly_plans') {
        await fulfillJson(route, state.weekly_plan)
        return
      }

      if (table === 'task_entries') {
        const planDateEq = readEqFilter(url.searchParams, 'plan_date')
        const planDateLt = readLtFilter(url.searchParams, 'plan_date')
        const isCompletedEq = readEqFilter(url.searchParams, 'is_completed')
        const limit = Number(url.searchParams.get('limit') || 0)

        let rows = [...state.task_entries]

        if (planDateEq) {
          rows = rows.filter((entry) => entry.plan_date === planDateEq)
        }

        if (planDateLt) {
          rows = rows.filter((entry) => entry.plan_date < planDateLt)
        }

        if (isCompletedEq === 'true' || isCompletedEq === 'false') {
          const isCompleted = isCompletedEq === 'true'
          rows = rows.filter((entry) => Boolean(entry.is_completed) === isCompleted)
        }

        rows.sort((left, right) => {
          if (left.plan_date !== right.plan_date) return left.plan_date < right.plan_date ? 1 : -1
          const leftCreated = new Date(left.created_at || 0).getTime()
          const rightCreated = new Date(right.created_at || 0).getTime()
          return rightCreated - leftCreated
        })

        if (limit > 0) {
          rows = rows.slice(0, limit)
        }

        await fulfillJson(route, rows)
        return
      }

      if (table === 'schedule_items') {
        const id = readEqFilter(url.searchParams, 'id')
        const dateGte = readGteFilter(url.searchParams, 'scheduled_date')
        const dateLte = readLteFilter(url.searchParams, 'scheduled_date')

        let rows = [...state.schedule_items]

        if (id) {
          rows = rows.filter((item) => item.id === id)
        }

        if (dateGte) {
          rows = rows.filter((item) => item.scheduled_date >= dateGte)
        }

        if (dateLte) {
          rows = rows.filter((item) => item.scheduled_date <= dateLte)
        }

        await fulfillJson(route, id ? rows[0] || null : rows)
        return
      }

      if (table === 'activity_logs') {
        const scheduleItemId = readEqFilter(url.searchParams, 'schedule_item_id')
        const completionStatus = readEqFilter(url.searchParams, 'completion_status')
        const limit = Number(url.searchParams.get('limit') || 0)

        let rows = [...state.activity_logs]

        if (scheduleItemId) {
          rows = rows.filter((entry) => entry.schedule_item_id === scheduleItemId)
        }

        if (completionStatus) {
          rows = rows.filter((entry) => entry.completion_status === completionStatus)
        }

        rows.sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())

        if (limit > 0) {
          rows = rows.slice(0, limit)
        }

        await fulfillJson(route, rows)
        return
      }

      await fulfillJson(route, state[table] || [])
      return
    }

    if (request.method() === 'POST') {
      const rawBody = request.postData() || '{}'
      const payload = JSON.parse(rawBody)
      const records = Array.isArray(payload) ? payload : [payload]

      if (table === 'thought_entries') {
        records.forEach((record) => {
          state.thought_entries.unshift({
            id: record.id || `thought-${state.thought_entries.length + 1}`,
            entry_date: record.entry_date,
            content: record.content,
            created_at: record.created_at || '2026-03-29T08:30:00.000Z',
          })
        })
      }

      if (table === 'task_entries') {
        records.forEach((record) => {
          const nextEntry = {
            id: record.id || `task-${state.task_entries.length + 1}`,
            plan_date: record.plan_date || '2026-03-29',
            priority: record.priority || 'C3',
            description: record.description || '',
            is_completed: Boolean(record.is_completed),
            completed_at: record.completed_at || (record.is_completed ? '2026-03-29T08:30:00.000Z' : null),
            created_at: record.created_at || '2026-03-29T08:30:00.000Z',
          }
          const existingIndex = state.task_entries.findIndex((entry) => entry.id === nextEntry.id)

          if (existingIndex >= 0) {
            state.task_entries[existingIndex] = { ...state.task_entries[existingIndex], ...nextEntry }
            return
          }

          state.task_entries.unshift(nextEntry)
        })
      }

      if (table === 'habits') {
        records.forEach((record) => {
          const nextHabit = {
            id: record.id || `habit-${state.habits.length + 1}`,
            name: record.name || '',
            daily_target: Number(record.daily_target) || 1,
            unit: record.unit || 'db',
            is_active: record.is_active ?? true,
            created_at: record.created_at || '2026-03-29T08:30:00.000Z',
          }
          const existingIndex = state.habits.findIndex((entry) => entry.id === nextHabit.id)

          if (existingIndex >= 0) {
            state.habits[existingIndex] = { ...state.habits[existingIndex], ...nextHabit }
            return
          }

          state.habits.push(nextHabit)
        })
      }

      if (table === 'habit_logs') {
        records.forEach((record) => {
          const nextLog = {
            id: record.id || `habit-log-${state.habit_logs.length + 1}`,
            habit_id: record.habit_id,
            target_date: record.target_date,
            completed_count: Number(record.completed_count) || 0,
            notes: record.notes || '',
            created_at: record.created_at || '2026-03-29T08:30:00.000Z',
          }
          const existingIndex = state.habit_logs.findIndex(
            (entry) =>
              entry.id === nextLog.id ||
              (entry.habit_id === nextLog.habit_id && entry.target_date === nextLog.target_date),
          )

          if (existingIndex >= 0) {
            state.habit_logs[existingIndex] = { ...state.habit_logs[existingIndex], ...nextLog }
            return
          }

          state.habit_logs.unshift(nextLog)
        })
      }

      if (table === 'provider_options' || table === 'category_options') {
        const current = state[table]

        records.forEach((record) => {
          if (!record.value) return
          if (!current.some((item) => item.value === record.value)) {
            current.push({ value: record.value })
          }
        })
      }

      if (table === 'activity_logs') {
        records.forEach((record) => {
          state.activity_logs.unshift({
            id: record.id || `activity-${state.activity_logs.length + 1}`,
            schedule_item_id: record.schedule_item_id || null,
            routine_block_id: record.routine_block_id,
            source_id: record.source_id || null,
            completion_status: record.completion_status || 'in_progress',
            notes: record.notes || '',
            rating: record.rating ?? null,
            created_at: record.created_at || '2026-04-03T08:30:00.000Z',
          })
        })

        if (remainingActivityLogInsertFailures > 0) {
          remainingActivityLogInsertFailures -= 1
          await fulfillJson(route, { message: 'Mockolt hibas valasz log-iras utan.' }, 500)
          return
        }
      }

      await fulfillJson(route, records, 201)
      return
    }

    if (request.method() === 'PATCH') {
      if (table === 'task_entries') {
        const rawBody = request.postData() || '{}'
        const payload = JSON.parse(rawBody)
        const id = readEqFilter(url.searchParams, 'id') || ''
        const entryIndex = state.task_entries.findIndex((entry) => entry.id === id)

        if (entryIndex >= 0) {
          state.task_entries[entryIndex] = {
            ...state.task_entries[entryIndex],
            ...payload,
          }
        }
      }

      if (table === 'schedule_items') {
        const rawBody = request.postData() || '{}'
        const payload = JSON.parse(rawBody)
        const id = readEqFilter(url.searchParams, 'id') || ''
        const status = readEqFilter(url.searchParams, 'status')

        state.schedule_items = state.schedule_items.map((item) => {
          if (item.id !== id) {
            return item
          }

          if (status && item.status !== status) {
            return item
          }

          return {
            ...item,
            ...payload,
          }
        })
      }

      await fulfillJson(route, [])
      return
    }

    if (request.method() === 'DELETE') {
      if (table === 'habits') {
        const id = readEqFilter(url.searchParams, 'id') || ''
        state.habits = state.habits.filter((entry) => entry.id !== id)
        state.habit_logs = state.habit_logs.filter((entry) => entry.habit_id !== id)
      }

      if (table === 'task_entries') {
        const id = readEqFilter(url.searchParams, 'id') || ''
        state.task_entries = state.task_entries.filter((entry) => entry.id !== id)
      }

      if (table === 'thought_entries') {
        const id = readEqFilter(url.searchParams, 'id') || ''
        state.thought_entries = state.thought_entries.filter((entry) => entry.id !== id)
      }

      const value = readEqFilter(url.searchParams, 'value')

      if (table === 'provider_options' || table === 'category_options') {
        state[table] = (state[table] || []).filter((item) => item.value !== value)
      }

      await fulfillJson(route, [])
      return
    }

    if (request.method() === 'HEAD' && table === 'sources') {
      const field = url.searchParams.has('provider') ? 'provider' : 'category'
      const value = readEqFilter(url.searchParams, field)
      const count = state.sources.filter((item) => item[field] === value).length

      await route.fulfill({
        status: 200,
        headers: {
          'content-range': `0-${Math.max(count - 1, 0)}/${count}`,
        },
      })
      return
    }

    await fulfillJson(route, [])
  })
}
