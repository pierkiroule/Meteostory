const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

export const totalMonths = (startYear) => {
  const today = new Date()
  return Math.max(1, (today.getFullYear() - startYear) * 12 + today.getMonth())
}

export const snapProgress = (progress, startYear) => {
  const months = totalMonths(startYear)
  return Math.round(Math.max(0, Math.min(1, progress)) * months) / months
}

export const progressLabel = (progress, startYear) => {
  const monthIndex = Math.round(snapProgress(progress, startYear) * totalMonths(startYear))
  const date = new Date(startYear, monthIndex, 1)
  const label = monthFormatter.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export const positionFromPoint = (clientX, clientY, element, view, startYear) => {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top

  if (view === 'circle') {
    const center = rect.width / 2
    const dx = x - center
    const dy = y - center
    const distance = Math.hypot(dx, dy)
    const outer = rect.width * .39
    const inner = outer * .57
    if (distance < inner - 12 || distance > outer + 16) return null
    let angle = Math.atan2(dy, dx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2
    return { progress: snapProgress(angle / (Math.PI * 2), startYear), intensity: Math.max(0, Math.min(1, (distance - inner) / (outer - inner))) }
  }

  const horizontal = view === 'horizontal'
  const progress = horizontal ? x / rect.width : y / rect.height
  const intensity = horizontal ? 1 - (y / rect.height) : x / rect.width
  if (progress < -.03 || progress > 1.03 || intensity < -.15 || intensity > 1.15) return null
  return { progress: snapProgress(progress, startYear), intensity: Math.max(0, Math.min(1, intensity)) }
}
