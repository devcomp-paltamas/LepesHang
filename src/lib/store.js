import { addDays, formatDateKey, startOfWeek } from "./date.js";
import { isSupabaseEnabled, supabase } from "./supabase.js";

const LEGACY_LOCAL_STORAGE_KEY = "lepeshang-app-state";
const HABIT_TABLES_CACHE_KEY = "lepeshang-habit-tables-available";
const TASK_PRIORITIES = new Set([
  "A1",
  "A2",
  "A3",
  "B1",
  "B2",
  "B3",
  "C1",
  "C2",
  "C3",
]);
let habitTablesAvailable = null;

function getTodayDateKey() {
  return formatDateKey(new Date());
}

function clearLegacyLocalState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
}

function readHabitTablesAvailabilityCache() {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(HABIT_TABLES_CACHE_KEY);
  if (rawValue === "available") return true;
  if (rawValue === "missing") return false;
  return null;
}

function writeHabitTablesAvailabilityCache(value) {
  habitTablesAvailable = value;

  if (typeof window === "undefined") return;

  if (value === null) {
    window.localStorage.removeItem(HABIT_TABLES_CACHE_KEY);
    return;
  }

  window.localStorage.setItem(
    HABIT_TABLES_CACHE_KEY,
    value ? "available" : "missing",
  );
}

function getCurrentWeekRange(weekOffset = 0) {
  const start = addDays(startOfWeek(new Date()), weekOffset * 7);
  const end = addDays(start, 6);
  return {
    start: formatDateKey(start),
    end: formatDateKey(end),
  };
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function normalizeState(state) {
  return {
    provider_options: state.provider_options || [],
    category_options: state.category_options || [],
    routine_blocks: state.routine_blocks || [],
    sources: state.sources || [],
    habits: state.habits || [],
    habit_logs: state.habit_logs || [],
    habit_tracking_available: state.habit_tracking_available ?? false,
    habit_tracking_status: state.habit_tracking_status || "unchecked",
    weekly_plan: state.weekly_plan || null,
    schedule_items: state.schedule_items || [],
    activity_logs: state.activity_logs || [],
    thought_entries: state.thought_entries || [],
    thought_entries_available: state.thought_entries_available ?? false,
    task_entries: state.task_entries || [],
    task_entries_available: state.task_entries_available ?? false,
    knowledge_entries: state.knowledge_entries || [],
    ai_recommendations: state.ai_recommendations || [],
    notifications: state.notifications || [],
  };
}

function isMissingHabitTableError(error) {
  if (!error) return false;

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.status === 404 ||
    error.message?.includes("Could not find the table") ||
    error.message?.includes("relation") ||
    error.message?.includes("habits") ||
    error.message?.includes("habit_logs")
  );
}

function isMissingThoughtTableError(error) {
  if (!error) return false;

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.status === 404 ||
    error.message?.includes("Could not find the table") ||
    error.message?.includes("relation") ||
    error.message?.includes("thought_entries")
  );
}

function isMissingTaskTableError(error) {
  if (!error) return false;

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (error.code === "42703" && error.message?.includes("plan_date")) ||
    error.status === 404 ||
    error.message?.includes("Could not find the table") ||
    error.message?.includes("relation") ||
    error.message?.includes("task_entries")
  );
}

async function ensureDailyTaskPlan(planDate) {
  const { data: todayPlanRows, error: todayPlanError } = await supabase
    .from("task_entries")
    .select("id")
    .eq("plan_date", planDate)
    .limit(1);

  if (isMissingTaskTableError(todayPlanError)) {
    return;
  }
  if (todayPlanError) {
    throw todayPlanError;
  }
  if (todayPlanRows?.length) {
    return;
  }

  const { data: previousRows, error: previousRowsError } = await supabase
    .from("task_entries")
    .select("description, priority, is_completed, plan_date, created_at")
    .lt("plan_date", planDate)
    .order("plan_date", { ascending: false })
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(300);

  if (isMissingTaskTableError(previousRowsError)) {
    return;
  }
  if (previousRowsError) {
    throw previousRowsError;
  }

  const rows = previousRows || [];
  if (!rows.length) {
    return;
  }

  const latestPlanDate = rows[0].plan_date;
  const rowsToCarry = rows.filter(
    (row) => row.plan_date === latestPlanDate && !row.is_completed,
  );

  if (!rowsToCarry.length) {
    return;
  }

  const payload = rowsToCarry.map((row) => ({
    id: makeId(),
    plan_date: planDate,
    priority: row.priority,
    description: row.description,
    is_completed: false,
    completed_at: null,
  }));

  const { error: insertError } = await supabase
    .from("task_entries")
    .insert(payload);

  if (isMissingTaskTableError(insertError)) {
    return;
  }
  if (insertError) {
    throw insertError;
  }
}

function getOptionalHabitQueries(habitLogStart, habitLogEnd) {
  if (habitTablesAvailable === null) {
    habitTablesAvailable = readHabitTablesAvailabilityCache();
  }

  if (habitTablesAvailable !== true) {
    return [
      Promise.resolve({ data: [], error: null }),
      Promise.resolve({ data: [], error: null }),
    ];
  }

  return [
    supabase.from("habits").select("*").order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("*")
      .gte("target_date", habitLogStart)
      .lte("target_date", habitLogEnd)
      .order("target_date", { ascending: false }),
  ];
}

function mergeOptionLists(state) {
  const providerSet = new Set(state.provider_options || []);
  const categorySet = new Set(state.category_options || []);

  for (const source of state.sources || []) {
    if (source.provider) providerSet.add(source.provider);
    if (source.category) categorySet.add(source.category);
  }

  return {
    ...state,
    provider_options: Array.from(providerSet).sort((left, right) =>
      left.localeCompare(right),
    ),
    category_options: Array.from(categorySet).sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

function getRoutineBlockSortKey(block) {
  const modeRank = {
    morning: 0,
    evening: 1,
    custom: 2,
  };

  return modeRank[block.mode] ?? 99;
}

async function loadFromSupabase(weekOffset = 0) {
  const { start, end } = getCurrentWeekRange(weekOffset);
  const habitLogStart = formatDateKey(addDays(start, -14));
  const habitLogEnd = formatDateKey(addDays(end, 14));
  const taskPlanDate = getTodayDateKey();

  await ensureDailyTaskPlan(taskPlanDate);

  const [
    providerOptionsResult,
    categoryOptionsResult,
    routineBlocksResult,
    sourcesResult,
    habitsResult,
    habitLogsResult,
    weeklyPlanResult,
    scheduleItemsResult,
    activityLogsResult,
    thoughtEntriesResult,
    taskEntriesResult,
    knowledgeEntriesResult,
    recommendationsResult,
    notificationsResult,
  ] = await Promise.all([
    supabase
      .from("provider_options")
      .select("value")
      .order("value", { ascending: true }),
    supabase
      .from("category_options")
      .select("value")
      .order("value", { ascending: true }),
    supabase.from("routine_blocks").select("*"),
    supabase.from("sources").select("*").order("provider", { ascending: true }),
    ...getOptionalHabitQueries(habitLogStart, habitLogEnd),
    supabase
      .from("weekly_plans")
      .select("*")
      .lte("week_start_date", start)
      .gte("week_end_date", end)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("schedule_items")
      .select("*")
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("thought_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("task_entries")
      .select("*")
      .order("plan_date", { ascending: false })
      .order("is_completed", { ascending: true })
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("knowledge_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ai_recommendations")
      .select("*")
      .gte("target_date", start)
      .lte("target_date", end)
      .order("target_date", { ascending: false }),
    supabase
      .from("notifications")
      .select("*")
      .order("title", { ascending: true }),
  ]);

  const errors = [
    providerOptionsResult.error,
    categoryOptionsResult.error,
    routineBlocksResult.error,
    sourcesResult.error,
    habitsResult.error,
    habitLogsResult.error,
    weeklyPlanResult.error,
    scheduleItemsResult.error,
    activityLogsResult.error,
    thoughtEntriesResult.error,
    taskEntriesResult.error,
    knowledgeEntriesResult.error,
    recommendationsResult.error,
    notificationsResult.error,
  ].filter(Boolean);
  const criticalErrors = errors.filter(
    (error) =>
      !isMissingHabitTableError(error) &&
      !isMissingThoughtTableError(error) &&
      !isMissingTaskTableError(error),
  );

  const habitFeatureMissing =
    isMissingHabitTableError(habitsResult.error) || isMissingHabitTableError(habitLogsResult.error);
  const thoughtFeatureMissing = isMissingThoughtTableError(thoughtEntriesResult.error);
  const taskFeatureMissing = isMissingTaskTableError(taskEntriesResult.error);

  if (habitFeatureMissing) {
    writeHabitTablesAvailabilityCache(false);
  } else if (!habitsResult.error && !habitLogsResult.error) {
    writeHabitTablesAvailabilityCache(true);
  }

  if (criticalErrors.length) {
    throw criticalErrors[0];
  }

  const habitTrackingStatus =
    habitTablesAvailable === true
      ? "available"
      : habitTablesAvailable === false
        ? "missing"
        : "unchecked";

  return normalizeState(
    mergeOptionLists({
      routine_blocks: (routineBlocksResult.data || []).sort((left, right) => {
        const rankDiff =
          getRoutineBlockSortKey(left) - getRoutineBlockSortKey(right);
        if (rankDiff !== 0) return rankDiff;
        return left.name.localeCompare(right.name);
      }),
      sources: sourcesResult.data || [],
      habits:
        habitTablesAvailable === true && !habitFeatureMissing
          ? (habitsResult.data || []).filter((habit) => habit.is_active !== false)
          : [],
      habit_logs: habitTablesAvailable === true && !habitFeatureMissing ? habitLogsResult.data || [] : [],
      habit_tracking_available: habitTablesAvailable === true && !habitFeatureMissing,
      habit_tracking_status: habitTrackingStatus,
      weekly_plan: weeklyPlanResult.data || null,
      schedule_items: scheduleItemsResult.data || [],
      activity_logs: activityLogsResult.data || [],
      thought_entries: thoughtFeatureMissing ? [] : thoughtEntriesResult.data || [],
      thought_entries_available: !thoughtFeatureMissing,
      task_entries: taskFeatureMissing ? [] : taskEntriesResult.data || [],
      task_entries_available: !taskFeatureMissing,
      knowledge_entries: knowledgeEntriesResult.data || [],
      ai_recommendations: recommendationsResult.data || [],
      notifications: notificationsResult.data || [],
      provider_options: (providerOptionsResult.data || []).map(
        (item) => item.value,
      ),
      category_options: (categoryOptionsResult.data || []).map(
        (item) => item.value,
      ),
    }),
  );
}

async function loadSupabaseWeekState(weekOffset = 0) {
  const { start, end } = getCurrentWeekRange(weekOffset);

  const state = await loadFromSupabase(weekOffset);

  if (
    state.weekly_plan?.week_start_date === start &&
    state.weekly_plan?.week_end_date === end
  ) {
    return state;
  }

  return {
    ...state,
    weekly_plan: {
      id: makeId(),
      week_start_date: start,
      week_end_date: end,
      status: "draft",
      ai_recommendation: "",
    },
    schedule_items: state.schedule_items.filter(
      (item) => item.scheduled_date >= start && item.scheduled_date <= end,
    ),
  };
}

export async function loadAppState(weekOffset = 0) {
  clearLegacyLocalState();

  if (!isSupabaseEnabled) {
    throw new Error("A Supabase-kapcsolat nincs beállítva.");
  }

  return loadSupabaseWeekState(weekOffset);
}

export async function saveHabit(input) {
  if (habitTablesAvailable === null) {
    habitTablesAvailable = readHabitTablesAvailabilityCache();
  }

  if (habitTablesAvailable !== true) {
    throw new Error("A szokáskövetőt előbb ellenőrizni kell, vagy létre kell hozni a hiányzó táblákat a Supabase adatbázisban.");
  }

  const payload = {
    id: input.id || makeId(),
    name: input.name?.trim() || "",
    daily_target: input.daily_target ? Number(input.daily_target) : 1,
    unit: input.unit?.trim() || "db",
    is_active: input.is_active ?? true,
  };

  if (!payload.name) {
    throw new Error("A szokás neve kötelező.");
  }

  if (!Number.isInteger(payload.daily_target) || payload.daily_target < 1) {
    throw new Error("A napi cél legalább 1 legyen.");
  }

  const { error } = await supabase.from("habits").upsert(payload);
  if (isMissingHabitTableError(error)) {
    writeHabitTablesAvailabilityCache(false);
    throw new Error("A szokáskövető táblákat előbb létre kell hozni a Supabase adatbázisban.");
  }
  if (error) throw error;

  writeHabitTablesAvailabilityCache(true);

  return payload;
}

export async function deleteHabit(habitId) {
  if (habitTablesAvailable === null) {
    habitTablesAvailable = readHabitTablesAvailabilityCache();
  }

  if (habitTablesAvailable !== true) {
    throw new Error("A szokáskövetőt előbb ellenőrizni kell, vagy létre kell hozni a hiányzó táblákat a Supabase adatbázisban.");
  }

  if (!habitId) {
    throw new Error("A törlendő szokás azonosítója hiányzik.");
  }

  const { error } = await supabase.from("habits").delete().eq("id", habitId);
  if (isMissingHabitTableError(error)) {
    writeHabitTablesAvailabilityCache(false);
    throw new Error("A szokáskövető táblákat előbb létre kell hozni a Supabase adatbázisban.");
  }
  if (error) throw error;

  writeHabitTablesAvailabilityCache(true);
}

export async function saveHabitLog(input) {
  if (habitTablesAvailable === null) {
    habitTablesAvailable = readHabitTablesAvailabilityCache();
  }

  if (habitTablesAvailable !== true) {
    throw new Error("A szokáskövetőt előbb ellenőrizni kell, vagy létre kell hozni a hiányzó táblákat a Supabase adatbázisban.");
  }

  const completedCount = Number(input.completed_count);
  const payload = {
    habit_id: input.habit_id,
    target_date: input.target_date,
    completed_count: Number.isFinite(completedCount) ? Math.max(0, Math.floor(completedCount)) : 0,
    notes: input.notes?.trim() || "",
  };

  if (input.id) {
    payload.id = input.id;
  }

  if (!payload.habit_id || !payload.target_date) {
    throw new Error("A szokás és a dátum kötelező.");
  }

  const { error } = await supabase
    .from("habit_logs")
    .upsert(payload, { onConflict: "habit_id,target_date" });
  if (isMissingHabitTableError(error)) {
    writeHabitTablesAvailabilityCache(false);
    throw new Error("A szokáskövető táblákat előbb létre kell hozni a Supabase adatbázisban.");
  }
  if (error) throw error;

  writeHabitTablesAvailabilityCache(true);

  return payload;
}

export function resetHabitTableAvailabilityCache() {
  writeHabitTablesAvailabilityCache(null);
}

export async function checkHabitTableAvailability() {
  const [habitsProbe, logsProbe] = await Promise.all([
    supabase.from("habits").select("id").limit(1),
    supabase.from("habit_logs").select("id").limit(1),
  ]);

  const missing =
    isMissingHabitTableError(habitsProbe.error) || isMissingHabitTableError(logsProbe.error);

  if (missing) {
    writeHabitTablesAvailabilityCache(false);
    return false;
  }

  if (habitsProbe.error) throw habitsProbe.error;
  if (logsProbe.error) throw logsProbe.error;

  writeHabitTablesAvailabilityCache(true);
  return true;
}

export async function saveScheduleItem(input) {
  let scheduleItemId = input.id || null;

  if (!scheduleItemId && input.weekly_plan_id) {
    const { data: existingItem, error: lookupError } = await supabase
      .from("schedule_items")
      .select("id")
      .eq("weekly_plan_id", input.weekly_plan_id)
      .eq("routine_block_id", input.routine_block_id)
      .eq("scheduled_date", input.scheduled_date)
      .maybeSingle();

    if (lookupError) throw lookupError;
    scheduleItemId = existingItem?.id || null;
  }

  const payload = {
    id: scheduleItemId || makeId(),
    weekly_plan_id: input.weekly_plan_id,
    routine_block_id: input.routine_block_id,
    source_id: input.source_id || null,
    scheduled_date: input.scheduled_date,
    status: input.status || "planned",
    is_quick_play: Boolean(input.is_quick_play),
    priority: input.priority || 1,
  };

  if (input.weekly_plan) {
    const { error: planError } = await supabase.from("weekly_plans").upsert({
      id: input.weekly_plan.id,
      week_start_date: input.weekly_plan.week_start_date,
      week_end_date: input.weekly_plan.week_end_date,
      status: input.weekly_plan.status || "draft",
      ai_recommendation: input.weekly_plan.ai_recommendation || "",
    });

    if (planError) throw planError;
  }

  const { error } = await supabase.from("schedule_items").upsert(payload);
  if (error) throw error;

  return payload;
}

export async function startRoutine({ scheduleItem, routineBlock }) {
  if (!scheduleItem?.id) {
    throw new Error("A blokk nem indítható érvényes ütemezés nélkül.");
  }

  if (scheduleItem.status === "done" || scheduleItem.status === "skipped") {
    throw new Error("A lezárt vagy kihagyott blokk nem indítható újra.");
  }

  const { data: existingLogs, error: existingLogError } = await supabase
    .from("activity_logs")
    .select(
      "id, schedule_item_id, routine_block_id, source_id, completion_status, notes, rating, created_at",
    )
    .eq("schedule_item_id", scheduleItem.id)
    .eq("completion_status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingLogError) throw existingLogError;
  const existingLog = existingLogs?.[0] || null;

  if (existingLog?.id) {
    const { error: syncStatusError } = await supabase
      .from("schedule_items")
      .update({ status: "in_progress" })
      .eq("id", scheduleItem.id)
      .eq("status", "planned");

    if (syncStatusError) throw syncStatusError;

    return {
      id: existingLog.id,
      schedule_item_id: scheduleItem.id,
      routine_block_id: existingLog.routine_block_id || scheduleItem.routine_block_id || routineBlock.id,
      source_id: existingLog.source_id ?? scheduleItem.source_id ?? null,
      completion_status: "in_progress",
      notes: existingLog.notes || "",
      rating: existingLog.rating ?? null,
    };
  }

  const logPayload = {
    id: makeId(),
    schedule_item_id: scheduleItem.id,
    routine_block_id: scheduleItem.routine_block_id || routineBlock.id,
    source_id: scheduleItem.source_id || null,
    completion_status: "in_progress",
  };

  const [{ error: scheduleError }, { error: logError }] = await Promise.all([
    supabase
      .from("schedule_items")
      .update({ status: "in_progress" })
      .eq("id", scheduleItem.id)
      .eq("status", "planned"),
    supabase.from("activity_logs").insert(logPayload),
  ]);

  if (scheduleError || logError) {
    const [recoveredLogResult, recoveredScheduleResult] = await Promise.all([
      supabase
        .from("activity_logs")
        .select(
          "id, schedule_item_id, routine_block_id, source_id, completion_status, notes, rating, created_at",
        )
        .eq("schedule_item_id", scheduleItem.id)
        .eq("completion_status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("schedule_items")
        .select("id, status")
        .eq("id", scheduleItem.id)
        .maybeSingle(),
    ]);

    const recoveredLog =
      !recoveredLogResult.error && recoveredLogResult.data?.length
        ? recoveredLogResult.data[0]
        : null;
    const recoveredStatus =
      !recoveredScheduleResult.error && recoveredScheduleResult.data
        ? recoveredScheduleResult.data.status
        : null;

    if (recoveredLog && recoveredStatus === "in_progress") {
      return {
        id: recoveredLog.id,
        schedule_item_id: recoveredLog.schedule_item_id || scheduleItem.id,
        routine_block_id: recoveredLog.routine_block_id || scheduleItem.routine_block_id || routineBlock.id,
        source_id: recoveredLog.source_id ?? scheduleItem.source_id ?? null,
        completion_status: "in_progress",
        notes: recoveredLog.notes || "",
        rating: recoveredLog.rating ?? null,
      };
    }

    throw logError || scheduleError || recoveredLogResult.error || recoveredScheduleResult.error;
  }

  return logPayload;
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
    notes: notes || "",
  };

  const schedulePatch = {
    status: completionStatus === "missed" ? "skipped" : "done",
  };

  const logOperation = logId
    ? supabase.from("activity_logs").update(logPatch).eq("id", logId)
    : supabase.from("activity_logs").insert({
        id: makeId(),
        schedule_item_id: scheduleItemId,
        routine_block_id: routineBlockId,
        source_id: sourceId || null,
        ...logPatch,
      });

  const [{ error: logError }, { error: scheduleError }] = await Promise.all([
    logOperation,
    supabase
      .from("schedule_items")
      .update(schedulePatch)
      .eq("id", scheduleItemId),
  ]);

  if (logError) throw logError;
  if (scheduleError) throw scheduleError;

  return { id: logId, ...logPatch };
}

export async function saveSource(input) {
  const payload = {
    id: input.id || makeId(),
    name: input.name?.trim() || "",
    provider: input.provider?.trim() || "",
    content_type: input.content_type || "audio",
    url: input.url?.trim() || "",
    category: input.category?.trim() || "",
    difficulty_level: input.difficulty_level
      ? Number(input.difficulty_level)
      : null,
    notes: input.notes?.trim() || "",
    is_active: input.is_active ?? true,
  };

  if (!payload.name || !payload.provider) {
    throw new Error("A név és a szolgáltató kötelező.");
  }

  const { error } = await supabase.from("sources").upsert(payload);
  if (error) throw error;

  return payload;
}

export async function saveThoughtEntry(input) {
  const payload = {
    id: input.id || makeId(),
    entry_date: input.entry_date,
    content: input.content?.trim() || "",
  };

  if (!payload.entry_date || !payload.content) {
    throw new Error("A dátum és a gondolat szövege kötelező.");
  }

  const { error } = await supabase.from("thought_entries").upsert(payload);
  if (isMissingThoughtTableError(error)) {
    throw new Error(
      "A gondolatnapló táblát előbb létre kell hozni a Supabase adatbázisban a frissített `supabase/schema.sql` alapján.",
    );
  }
  if (error) throw error;

  return payload;
}

export async function deleteThoughtEntry(entryId) {
  if (!entryId) {
    throw new Error("A törlendő gondolat azonosítója hiányzik.");
  }

  const { error } = await supabase.from("thought_entries").delete().eq("id", entryId);
  if (isMissingThoughtTableError(error)) {
    throw new Error(
      "A gondolatnapló táblát előbb létre kell hozni a Supabase adatbázisban a frissített `supabase/schema.sql` alapján.",
    );
  }
  if (error) throw error;
}

export async function saveTaskEntry(input) {
  const priority = String(input.priority || "").trim().toUpperCase();
  const planDate = input.plan_date || getTodayDateKey();
  const payload = {
    id: input.id || makeId(),
    plan_date: planDate,
    priority,
    description: input.description?.trim() || "",
    is_completed: Boolean(input.is_completed),
    completed_at: input.is_completed ? new Date().toISOString() : null,
  };

  if (!payload.plan_date) {
    throw new Error("A feladat dátuma kötelező.");
  }

  if (!TASK_PRIORITIES.has(payload.priority)) {
    throw new Error("A prioritás csak A1-A3, B1-B3 vagy C1-C3 lehet.");
  }

  if (!payload.description) {
    throw new Error("A feladat leírása kötelező.");
  }

  const { error } = await supabase.from("task_entries").upsert(payload);
  if (isMissingTaskTableError(error)) {
    throw new Error(
      "A feladatlista táblát előbb létre kell hozni a Supabase adatbázisban a frissített `supabase/schema.sql` alapján.",
    );
  }
  if (error) throw error;

  return payload;
}

export async function completeTaskEntry(taskId) {
  if (!taskId) {
    throw new Error("A lezárandó feladat azonosítója hiányzik.");
  }

  const { error } = await supabase
    .from("task_entries")
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq("id", taskId);

  if (isMissingTaskTableError(error)) {
    throw new Error(
      "A feladatlista táblát előbb létre kell hozni a Supabase adatbázisban a frissített `supabase/schema.sql` alapján.",
    );
  }
  if (error) throw error;
}

export async function setSourceActive(sourceId, isActive) {
  const { error } = await supabase
    .from("sources")
    .update({ is_active: isActive })
    .eq("id", sourceId);
  if (error) throw error;
}

export async function saveOptionItem(kind, value) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new Error("Az érték nem lehet üres.");
  }

  const table = kind === "provider" ? "provider_options" : "category_options";
  const { error } = await supabase
    .from(table)
    .upsert({ value: trimmedValue }, { onConflict: "value" });

  if (error) throw error;
}

export async function deleteOptionItem(kind, value) {
  const table = kind === "provider" ? "provider_options" : "category_options";
  const sourceColumn = kind === "provider" ? "provider" : "category";
  const { count, error: usageError } = await supabase
    .from("sources")
    .select("id", { count: "exact", head: true })
    .eq(sourceColumn, value);

  if (usageError) throw usageError;

  if ((count || 0) > 0) {
    throw new Error(
      kind === "provider"
        ? `A szolgáltató még ${count} forráshoz van rendelve, ezért nem törölhető.`
        : `A kategória még ${count} forráshoz van rendelve, ezért nem törölhető.`,
    );
  }

  const { error } = await supabase.from(table).delete().eq("value", value);

  if (error) throw error;
}

export async function saveWeeklyRecommendation(input) {
  const payload = {
    id: input.id || makeId(),
    week_start_date: input.week_start_date,
    week_end_date: input.week_end_date,
    status: input.status || "draft",
    ai_recommendation: input.ai_recommendation?.trim() || "",
  };

  const { error } = await supabase.from("weekly_plans").upsert(payload);
  if (error) throw error;

  return payload;
}

export async function saveDailyRecommendation(input) {
  const payload = {
    id: input.id || makeId(),
    weekly_plan_id: input.weekly_plan_id || null,
    target_date: input.target_date,
    routine_block_id: input.routine_block_id || null,
    recommended_source_id: input.recommended_source_id || null,
    recommendation_text: input.recommendation_text?.trim() || "",
    reasoning_summary: input.reasoning_summary?.trim() || "",
  };

  if (!payload.target_date || !payload.recommendation_text) {
    throw new Error("A dátum és az ajánlás szövege kötelező.");
  }

  const { error } = await supabase.from("ai_recommendations").upsert(payload);
  if (error) throw error;

  return payload;
}
