import { useEffect, useRef, useState } from 'react'
import { weatherById } from '../data/weather'
import { progressLabel, snapProgress } from '../data/timeline'

const TAU = Math.PI * 2

export function positionToMoment(clientX, clientY, element, startYear) {
  const rect = element.getBoundingClientRect()
  const center = rect.width / 2
  const dx = clientX - rect.left - center
  const dy = clientY - rect.top - center
  const distance = Math.hypot(dx, dy)
  const outer = rect.width * 0.39
  const inner = outer * 0.57
  if (distance < inner - 12 || distance > outer + 16) return null
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += TAU
  return { progress: snapProgress(angle / TAU, startYear), intensity: Math.max(0, Math.min(1, (distance - inner) / (outer - inner))) }
}

const momentPoint = (moment, size) => {
  const center = size / 2
  const outer = size * .39
  const inner = outer * .57
  const angle = moment.progress * TAU - Math.PI / 2
  const radius = inner + moment.intensity * (outer - inner)
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius }
}

export function StoryCircle({ moments, startYear, interactive = false, onAdd, onMove, onPreview }) {
  const canvasRef = useRef(null)
  const moving = useRef(null)
  const suppressClick = useRef(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const size = canvas.clientWidth
    canvas.width = size * ratio
    canvas.height = size * ratio
    context.scale(ratio, ratio)
    const center = size / 2
    const outer = size * .39
    const inner = outer * .57
    const styles = getComputedStyle(document.documentElement)
    context.clearRect(0, 0, size, size)
    context.beginPath(); context.arc(center, center, outer, 0, TAU); context.arc(center, center, inner, 0, TAU, true)
    context.fillStyle = styles.getPropertyValue('--paper'); context.fill()
    context.strokeStyle = styles.getPropertyValue('--line'); context.stroke()
    moments.forEach((moment) => {
      const weather = weatherById(moment.weather)
      if (!weather) return
      const { x, y } = momentPoint(moment, size)
      const gradient = context.createRadialGradient(x, y, 0, x, y, 38)
      gradient.addColorStop(0, `${weather.color}88`); gradient.addColorStop(1, `${weather.color}00`)
      context.fillStyle = gradient; context.fillRect(x - 38, y - 38, 76, 76)
      context.font = `${22 + moment.intensity * 10}px sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(weather.emoji, x, y)
    })
    const endYear = new Date().getFullYear()
    const count = endYear - startYear
    const every = count > 25 ? 5 : count > 12 ? 2 : 1
    context.fillStyle = styles.getPropertyValue('--muted'); context.font = '500 10px DM Sans'; context.textAlign = 'center'
    for (let year = startYear; year <= endYear; year += every) {
      const angle = ((year - startYear) / Math.max(1, count)) * TAU - Math.PI / 2
      context.fillText(String(year), center + Math.cos(angle) * (outer + 22), center + Math.sin(angle) * (outer + 22))
    }
  }, [moments, startYear])

  const getPosition = (event) => positionToMoment(event.clientX, event.clientY, event.currentTarget, startYear)
  const preview = (value) => onPreview?.(value ? progressLabel(value.progress, startYear) : '')
  const handlePointerDown = (event) => {
    if (!interactive) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const match = [...moments].reverse().find((moment) => { const point = momentPoint(moment, rect.width); return Math.hypot(point.x - x, point.y - y) < 24 })
    if (match) { moving.current = match.id; suppressClick.current = true; event.currentTarget.setPointerCapture(event.pointerId); preview(match) }
  }
  const handlePointerMove = (event) => {
    const value = getPosition(event)
    preview(value)
    if (moving.current && value) onMove?.(moving.current, value)
  }
  const handleClick = (event) => {
    if (!interactive || !onAdd || suppressClick.current) { suppressClick.current = false; return }
    const value = getPosition(event)
    if (value) onAdd(value)
  }
  const handleDrop = (event) => {
    event.preventDefault(); setDragOver(false)
    const value = getPosition(event)
    const momentId = event.dataTransfer.getData('application/x-meteostory-moment')
    const weather = event.dataTransfer.getData('application/x-meteostory-weather') || event.dataTransfer.getData('text/plain')
    if (value && momentId) onMove?.(momentId, value)
    else if (value && weatherById(weather)) onAdd?.({ ...value, weather })
    preview(value)
  }

  return <canvas ref={canvasRef} className={`story-circle${dragOver ? ' drag-over' : ''}`} data-timeline="circle"
    onClick={handleClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
    onPointerUp={() => { moving.current = null }} onPointerCancel={() => { moving.current = null }} onPointerLeave={() => !moving.current && preview(null)}
    onDragEnter={() => setDragOver(true)} onDragLeave={() => setDragOver(false)} onDragOver={(event) => { event.preventDefault(); preview(getPosition(event)) }} onDrop={handleDrop}
    aria-label="Frise chronologique circulaire, zone de dépôt et de repositionnement des météos" />
}
