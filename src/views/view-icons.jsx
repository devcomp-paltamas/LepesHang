export function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M8 10v7" />
      <path d="M12 10v7" />
      <path d="M16 10v7" />
      <path d="M6 7l1 12h10l1-12" />
    </svg>
  )
}

export function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20l4.2-1 9.4-9.4a1.8 1.8 0 000-2.6l-.6-.6a1.8 1.8 0 00-2.6 0L5 15.8 4 20z" />
      <path d="M13.5 7.5l3 3" />
    </svg>
  )
}

export function ChevronIcon({ direction = 'left' }) {
  const path = direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
