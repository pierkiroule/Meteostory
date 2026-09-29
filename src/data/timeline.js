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
