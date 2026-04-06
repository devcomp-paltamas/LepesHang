import Clarity from '@microsoft/clarity'

let initializedProjectId = ''

function getRuntimeEnv() {
  if (typeof window === 'undefined') {
    return {}
  }

  return window.__LEPESHANG_ENV__ || {}
}

export function getClarityProjectId() {
  const runtimeEnv = getRuntimeEnv()

  return import.meta.env.VITE_CLARITY_PROJECT_ID || runtimeEnv.VITE_CLARITY_PROJECT_ID || ''
}

function publishClarityStatus(status) {
  if (typeof window !== 'undefined') {
    window.__LEPESHANG_CLARITY__ = status
  }

  return status
}

export function initializeClarity() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      enabled: false,
      status: 'server',
      projectId: '',
    }
  }

  const projectId = getClarityProjectId()

  if (!projectId) {
    return publishClarityStatus({
      enabled: false,
      status: 'disabled',
      projectId: '',
      reason: 'missing-project-id',
    })
  }

  if (initializedProjectId === projectId || document.getElementById('clarity-script')) {
    initializedProjectId = projectId

    return publishClarityStatus({
      enabled: true,
      status: 'already-initialized',
      projectId,
    })
  }

  try {
    Clarity.init(projectId)
    initializedProjectId = projectId

    return publishClarityStatus({
      enabled: true,
      status: 'initialized',
      projectId,
    })
  } catch (error) {
    return publishClarityStatus({
      enabled: false,
      status: 'error',
      projectId,
      reason: error instanceof Error ? error.message : 'unknown-error',
    })
  }
}

export function applyClarityConsent(consent = 'unknown') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      enabled: false,
      status: 'server',
      projectId: '',
      consent,
    }
  }

  const projectId = getClarityProjectId()

  if (!projectId) {
    return publishClarityStatus({
      enabled: false,
      status: 'disabled',
      projectId: '',
      consent,
      reason: 'missing-project-id',
    })
  }

  if (consent !== 'granted') {
    if (typeof window.clarity === 'function') {
      Clarity.consentV2({
        ad_Storage: 'denied',
        analytics_Storage: 'denied',
      })
    }

    return publishClarityStatus({
      enabled: false,
      status: consent === 'denied' ? 'consent-denied' : 'waiting-for-consent',
      projectId,
      consent,
    })
  }

  const initializationResult = initializeClarity()

  if (!initializationResult.enabled) {
    return publishClarityStatus({
      ...initializationResult,
      consent,
    })
  }

  Clarity.consentV2({
    ad_Storage: 'granted',
    analytics_Storage: 'granted',
  })

  return publishClarityStatus({
    enabled: true,
    status: 'consent-granted',
    projectId,
    consent,
  })
}
