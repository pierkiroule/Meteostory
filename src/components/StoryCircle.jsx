import { useEffect, useRef } from 'react'
import { weatherById } from '../data/weather'

const TAU = Math.PI * 2

export function StoryCircle({ moments, startYear, interactive = false, onAdd }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const size = canvas.clientWidth
    canvas.width = size * ratio
    canvas.height = size * ratio
    context.scale(ratio, ratio)
    const center = size / 2
    const outer = size * 0.39
    const inner = outer * 0.57
    const styles = getComputedStyle(document.documentElement)

    context.clearRect(0, 0, size, size)
    context.beginPath()
    context.arc(center, center, outer, 0, TAU)
    context.arc(center, center, inner, 0, TAU, true)
    context.fillStyle = styles.getPropertyValue('--paper')
    context.fill()
    context.strokeStyle = styles.getPropertyValue('--line')
    context.stroke()

    moments.forEach((moment) => {
      const weather = weatherById(moment.weather)
      if (!weather) return
      const angle = moment.progress * TAU - Math.PI / 2
      const radius = inner + moment.intensity * (outer - inner)
      const x = center + Math.cos(angle) * radius
      const y = center + Math.sin(angle) * radius
      const gradient = context.createRadialGradient(x, y, 0, x, y, 38)
      gradient.addColorStop(0, `${weather.color}88`)
      gradient.addColorStop(1, `${weather.color}00`)
      context.fillStyle = gradient
      context.fillRect(x - 38, y - 38, 76, 76)
      context.font = `${22 + moment.intensity * 10}px sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(weather.emoji, x, y)
    })

    const endYear = new Date().getFullYear()
    const count = endYear - startYear
    const every = count > 25 ? 5 : count > 12 ? 2 : 1
    context.fillStyle = styles.getPropertyValue('--muted')
    context.font = '500 10px DM Sans'
    context.textAlign = 'center'
    for (let year = startYear; year <= endYear; year += every) {
      const progress = (year - startYear) / Math.max(1, count)
      const angle = progress * TAU - Math.PI / 2
      context.fillText(String(year), center + Math.cos(angle) * (outer + 22), center + Math.sin(angle) * (outer + 22))
    }
  }, [moments, startYear])

  const handleClick = (event) => {
    if (!interactive || !onAdd) return
    const rect = event.currentTarget.getBoundingClientRect()
    const center = rect.width / 2
    const dx = event.clientX - rect.left - center
    const dy = event.clientY - rect.top - center
    const distance = Math.hypot(dx, dy)
    const outer = rect.width * 0.39
    const inner = outer * 0.57
    if (distance < inner - 12 || distance > outer + 16) return
    let angle = Math.atan2(dy, dx) + Math.PI / 2
    if (angle < 0) angle += TAU
    onAdd({ progress: angle / TAU, intensity: Math.max(0, Math.min(1, (distance - inner) / (outer - inner))) })
  }

  return <canvas ref={canvasRef} className="story-circle" onClick={handleClick} aria-label="Frise chronologique circulaire" />
}
