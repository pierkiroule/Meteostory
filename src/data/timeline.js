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
    const radius = rect.width * .34
    // A generous magnetic field makes the thin wire easy to target.
    if (Math.abs(distance - radius) > Math.min(74, rect.width * .2)) return null
    let angle = Math.atan2(dy, dx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2
    return { progress: snapProgress(angle / (Math.PI * 2), startYear), intensity: .5 }
  }

  const horizontal = view === 'horizontal'
  const progress = horizontal ? x / rect.width : y / rect.height
  if (progress < -.03 || progress > 1.03 || x < 0 || x > rect.width || y < 0 || y > rect.height) return null
  return { progress: snapProgress(progress, startYear), intensity: .5 }
}

export const timelineTicks = (startYear) => {
  const endYear = new Date().getFullYear()
  const span = endYear - startYear
  const step = span > 30 ? 5 : span > 14 ? 2 : 1
  const ticks = []
  for (let year = startYear; year <= endYear; year += step) {
    ticks.push({ year, label: String(year), progress: ((year - startYear) * 12) / totalMonths(startYear) })
  }
  if ((ticks.at(-1)?.progress ?? 0) < .995) ticks.push({ year: 'today', label: "Auj.", progress: 1 })
  return ticks.map((tick) => ({ ...tick, progress: Math.min(1, tick.progress) }))
}

export const collisionLanes = (moments, threshold = .055) => {
  const lastByLane = new Map()
  const lanes = new Map()
  const order = [0, -1, 1, -2, 2, -3, 3]
  ;[...moments].sort((a, b) => a.progress - b.progress).forEach((moment) => {
    const lane = order.find((candidate) => moment.progress - (lastByLane.get(candidate) ?? -Infinity) >= threshold) ?? 0
    lastByLane.set(lane, moment.progress)
    lanes.set(moment.id, lane)
  })
  return lanes
}
