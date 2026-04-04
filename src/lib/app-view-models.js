export function buildTodayHeroViewModel(todayView) {
  return {
    selectedDateKey: todayView.selectedDateKey,
    selectedDateLabel: todayView.selectedDateLabel,
    routineCards: todayView.derived.routineCards,
    onPreviousDay: todayView.goToPreviousDay,
    onNextDay: todayView.goToNextDay,
    onStart: todayView.handleStart,
    onSelectLog: todayView.handleTodayViewSelectLog,
  }
}

export function buildTodayContentViewModel({ data, todayView }) {
  return {
    selectedDateKey: todayView.selectedDateKey,
    thought: {
      form: todayView.thoughtForm,
      saveState: todayView.thoughtSaveState,
      isAvailable: data.thought_entries_available,
      onChange: todayView.handleThoughtChange,
      onSubmit: todayView.handleThoughtSave,
    },
    activity: {
      panelRef: todayView.activityPanelRef,
      activeLog: todayView.activeLog,
      sourceName: todayView.activeLogSourceName,
      blockName: todayView.activeLogBlockName,
      values: todayView.completionValues,
      onChange: todayView.handleCompletionChange,
      onSubmit: todayView.handleComplete,
    },
    habits: {
      items: data.habits,
      isAvailable: data.habit_tracking_available,
      availabilityStatus: data.habit_tracking_status,
      form: todayView.habitForm,
      draftValues: todayView.habitDraftValues,
      progressValues: todayView.habitProgressValues,
      logsByKey: todayView.derived.habitLogsByKey,
      historyDays: todayView.derived.historyDays,
      onFormChange: todayView.handleHabitFormChange,
      onCreate: todayView.handleHabitCreate,
      onDraftChange: todayView.handleHabitDraftChange,
      onSave: todayView.handleHabitSave,
      onDelete: todayView.handleHabitDelete,
      onProgressChange: todayView.handleHabitProgressChange,
      onProgressSave: todayView.handleHabitProgressSave,
      onProgressStep: todayView.handleHabitProgressStep,
      onRetryAvailabilityCheck: todayView.handleHabitAvailabilityRetry,
    },
  }
}

export function buildDetailsViewModel({ data, detailsView, todayView }) {
  return {
    switcher: {
      weekOffset: detailsView.weekOffset,
      onWeekOffsetChange: detailsView.setWeekOffset,
    },
    planner: {
      days: detailsView.plannerDays,
      routineBlocks: data.routine_blocks,
      sourceOptions: data.sources,
      values: detailsView.plannerValues,
      onChange: detailsView.updatePlannerValue,
      onSave: detailsView.handlePlannerSave,
    },
    library: {
      stats: todayView.derived.stats,
      sourceLibrary: data.sources,
      sourceForm: detailsView.sourceForm,
      weeklyRecommendation: detailsView.weeklyRecommendation,
      dailyRecommendationForm: detailsView.dailyRecommendationForm,
      providerOptions: data.provider_options,
      categoryOptions: data.category_options,
      optionForm: detailsView.optionForm,
      onSourceChange: detailsView.handleSourceFormChange,
      onSourceSubmit: detailsView.handleSourceSubmit,
      onWeeklyRecommendationChange: detailsView.setWeeklyRecommendation,
      onWeeklyRecommendationSave: detailsView.handleWeeklyRecommendationSave,
      onDailyRecommendationChange: detailsView.handleDailyRecommendationChange,
      onDailyRecommendationSave: detailsView.handleDailyRecommendationSave,
      onEditSource: detailsView.handleEditSource,
      onToggleSource: detailsView.handleToggleSource,
      onOptionChange: detailsView.handleOptionFormChange,
      onOptionSave: detailsView.handleOptionSave,
      onOptionDelete: detailsView.handleOptionDelete,
    },
  }
}
