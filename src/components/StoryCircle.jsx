import { useEffect, useRef } from 'react'
import { weatherById } from '../data/weather'
import { positionFromPoint, progressLabel } from '../data/timeline'

const TAU = Math.PI * 2

export function positionToMoment(clientX, clientY, element, startYear) {
  return positionFromPoint(clientX, clientY, element, 'circle', startYear)
}

const momentPoint = (moment, size) => {
  const center = size / 2
  const outer = size * .39
  const inner = outer * .57
  const angle = moment.progress * TAU - Math.PI / 2
  const radius = inner + moment.intensity * (outer - inner)
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius }
}

export function StoryCircle({ moments, startYear, interactive = false, dropActive = false, onAdd, onMove, onPreview }) {
  const canvasRef = useRef(null)
  const moving = useRef(null)
  const suppressClick = useRef(false)

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
  const finishMove = () => {
    moving.current = null
    // A click is dispatched after pointerup. Clear the guard just after it.
    setTimeout(() => { suppressClick.current = false }, 0)
  }

  return <canvas ref={canvasRef} className={`story-circle${interactive ? ' interactive' : ''}${dropActive ? ' drag-over' : ''}`} data-timeline="circle"
    onClick={handleClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
    onPointerUp={finishMove} onPointerCancel={finishMove} onLostPointerCapture={finishMove} onPointerLeave={() => !moving.current && preview(null)}
    aria-label="Frise chronologique circulaire, zone de dépôt et de repositionnement des météos" />
}
