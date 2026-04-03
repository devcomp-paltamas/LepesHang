export const defaultPlannerEntry = {
  id: null,
  sourceId: '',
}

export const taskPriorityOptions = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

export const SOURCE_LIBRARY_PAGE_SIZE = 8

export function getContentTypeLabel(contentType) {
  return (
    {
      audio: 'Hanganyag',
      video: 'Videó',
      course: 'Kurzus',
      article: 'Cikk',
    }[contentType] || contentType
  )
}

export function getRoutineBlockLabel(name) {
  return (
    {
      'Reggeli seta': 'Reggeli séta',
      'Esti onfejlesztes': 'Esti önfejlesztés',
    }[name] || name
  )
}
