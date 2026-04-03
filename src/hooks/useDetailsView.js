import { useEffect, useMemo, useState } from 'react'
import {
  createDefaultOptionForm,
  createDefaultRecommendationForm,
  createDefaultSourceForm,
} from '../lib/app-state.js'
import { buildPlannerState, getPlannerDays } from '../lib/app-selectors.js'
import {
  deleteOptionItem,
  saveDailyRecommendation,
  saveOptionItem,
  saveScheduleItem,
  saveSource,
  saveWeeklyRecommendation,
  setSourceActive,
} from '../lib/store.js'

export default function useDetailsView({ data, setError, showToast, reloadState }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [plannerValues, setPlannerValues] = useState({})
  const [sourceForm, setSourceForm] = useState(() => createDefaultSourceForm())
  const [optionForm, setOptionForm] = useState(() => createDefaultOptionForm())
  const [weeklyRecommendation, setWeeklyRecommendation] = useState('')
  const [dailyRecommendationForm, setDailyRecommendationForm] = useState(() => createDefaultRecommendationForm())

  useEffect(() => {
    if (!data.routine_blocks.length) return

    setPlannerValues(buildPlannerState(data.schedule_items, data.routine_blocks, weekOffset))
  }, [weekOffset, data.routine_blocks, data.schedule_items, data.sources])

  useEffect(() => {
    setWeeklyRecommendation(data.weekly_plan?.ai_recommendation || '')
  }, [data.weekly_plan])

  useEffect(() => {
    const selectedDate = dailyRecommendationForm.target_date || createDefaultRecommendationForm().target_date
    const match = data.ai_recommendations.find((item) => item.target_date === selectedDate)

    setDailyRecommendationForm({
      id: match?.id || null,
      target_date: selectedDate,
      recommendation_text: match?.recommendation_text || '',
      reasoning_summary: match?.reasoning_summary || '',
      recommended_source_id: match?.recommended_source_id || '',
    })
  }, [data.ai_recommendations, dailyRecommendationForm.target_date])

  const plannerDays = useMemo(() => getPlannerDays(weekOffset), [weekOffset])

  function updatePlannerValue(key, field, nextValue) {
    setPlannerValues((current) => {
      const next = { ...current[key], [field]: nextValue }
      return { ...current, [key]: next }
    })
  }

  async function handlePlannerSave(dateKey, routineBlockId, overrideValue = null) {
    const plannerKey = `${dateKey}:${routineBlockId}`
    const value = overrideValue || plannerValues[plannerKey]
    const source = data.sources.find((item) => item.id === value.sourceId)
    const routineBlock = data.routine_blocks.find((item) => item.id === routineBlockId)

    if (!routineBlock) return

    try {
      setError('')
      await saveScheduleItem({
        id: value.id,
        weekly_plan_id: data.weekly_plan?.id,
        weekly_plan: data.weekly_plan,
        routine_block_id: routineBlockId,
        source_id: value.sourceId || null,
        scheduled_date: dateKey,
        source,
      })
      await reloadState(weekOffset)
      showToast('success', 'A heti terv elmentve.')
    } catch {
      setError('A heti terv mentése nem sikerült.')
      showToast('error', 'A heti terv mentése nem sikerült.')
    }
  }

  async function handleSourceSubmit() {
    try {
      setError('')
      await saveSource(sourceForm)
      await reloadState(weekOffset)
      setSourceForm(createDefaultSourceForm())
      showToast('success', 'A forrás elmentve.')
    } catch (submitError) {
      setError(`A forrás mentése nem sikerült. ${submitError?.message || ''}`.trim())
      showToast('error', 'A forrás mentése nem sikerült.')
    }
  }

  function handleEditSource(source) {
    if (!source) {
      setSourceForm(createDefaultSourceForm())
      return
    }

    setSourceForm({
      id: source.id,
      name: source.name || '',
      provider: source.provider || '',
      content_type: source.content_type || 'audio',
      url: source.url || '',
      category: source.category || '',
      difficulty_level: source.difficulty_level ? String(source.difficulty_level) : '3',
      notes: source.notes || '',
      is_active: source.is_active ?? true,
    })
  }

  async function handleToggleSource(source) {
    try {
      setError('')
      await setSourceActive(source.id, !source.is_active)
      await reloadState(weekOffset)
      if (sourceForm.id === source.id) {
        setSourceForm((current) => ({ ...current, is_active: !source.is_active }))
      }
      showToast('success', source.is_active ? 'A forrás inaktiválva.' : 'A forrás aktiválva.')
    } catch {
      setError('A forrás állapotváltása nem sikerült.')
      showToast('error', 'A forrás állapotváltása nem sikerült.')
    }
  }

  async function handleOptionSave(kind) {
    try {
      setError('')
      await saveOptionItem(kind, optionForm[kind])
      await reloadState(weekOffset)
      setOptionForm((current) => ({ ...current, [kind]: '' }))
      showToast('success', 'A listaelem elmentve.')
    } catch (optionError) {
      setError(`A listaelem mentése nem sikerült. ${optionError?.message || ''}`.trim())
      showToast('error', 'A listaelem mentése nem sikerült.')
    }
  }

  async function handleOptionDelete(kind, value) {
    const label = kind === 'provider' ? 'szolgáltatót' : 'kategóriát'

    if (!window.confirm(`Biztos törölni szeretnéd ezt a ${label}: ${value}?`)) {
      return
    }

    try {
      setError('')
      await deleteOptionItem(kind, value)
      await reloadState(weekOffset)
      if (kind === 'provider' && sourceForm.provider === value) {
        setSourceForm((current) => ({ ...current, provider: '' }))
      }
      if (kind === 'category' && sourceForm.category === value) {
        setSourceForm((current) => ({ ...current, category: '' }))
      }
      showToast('success', 'A listaelem törölve.')
    } catch (optionError) {
      setError(`A listaelem törlése nem sikerült. ${optionError?.message || ''}`.trim())
      showToast('error', 'A listaelem törlése nem sikerült.')
    }
  }

  async function handleWeeklyRecommendationSave() {
    if (!data.weekly_plan) {
      setError('Nincs aktív heti terv.')
      showToast('error', 'Nincs aktív heti terv.')
      return
    }

    try {
      setError('')
      await saveWeeklyRecommendation({
        id: data.weekly_plan.id,
        week_start_date: data.weekly_plan.week_start_date,
        week_end_date: data.weekly_plan.week_end_date,
        status: data.weekly_plan.status,
        ai_recommendation: weeklyRecommendation,
      })
      await reloadState(weekOffset)
      showToast('success', 'A heti ajánlás elmentve.')
    } catch (saveError) {
      setError(`A heti ajánlás mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A heti ajánlás mentése nem sikerült.')
    }
  }

  async function handleDailyRecommendationSave() {
    try {
      setError('')
      await saveDailyRecommendation({
        id: dailyRecommendationForm.id,
        weekly_plan_id: data.weekly_plan?.id || null,
        target_date: dailyRecommendationForm.target_date,
        recommendation_text: dailyRecommendationForm.recommendation_text,
        reasoning_summary: dailyRecommendationForm.reasoning_summary,
        recommended_source_id: dailyRecommendationForm.recommended_source_id,
      })
      await reloadState(weekOffset)
      showToast('success', 'A napi ajánlás elmentve.')
    } catch (saveError) {
      setError(`A napi ajánlás mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A napi ajánlás mentése nem sikerült.')
    }
  }

  function handleSourceFormChange(field, value) {
    setSourceForm((current) => ({ ...current, [field]: value }))
  }

  function handleDailyRecommendationChange(field, value) {
    setDailyRecommendationForm((current) => ({ ...current, [field]: value }))
  }

  function handleOptionFormChange(field, value) {
    setOptionForm((current) => ({ ...current, [field]: value }))
  }

  return {
    weekOffset,
    setWeekOffset,
    plannerDays,
    plannerValues,
    updatePlannerValue,
    handlePlannerSave,
    sourceForm,
    weeklyRecommendation,
    setWeeklyRecommendation,
    dailyRecommendationForm,
    optionForm,
    handleSourceFormChange,
    handleSourceSubmit,
    handleWeeklyRecommendationSave,
    handleDailyRecommendationChange,
    handleDailyRecommendationSave,
    handleEditSource,
    handleToggleSource,
    handleOptionFormChange,
    handleOptionSave,
    handleOptionDelete,
  }
}
