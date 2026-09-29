import { useEffect, useRef } from 'react'
import { weatherById } from '../data/weather'
import { collisionLanes, positionFromPoint, progressLabel, timelineTicks } from '../data/timeline'

const TAU = Math.PI * 2

export function positionToMoment(clientX, clientY, element, startYear) {
  return positionFromPoint(clientX, clientY, element, 'circle', startYear)
}

const momentPoint = (moment, size, lane = 0) => {
  const center = size / 2
  const angle = moment.progress * TAU - Math.PI / 2
  const radius = size * .34 + lane * 20
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius }
}

export function StoryCircle({ moments, startYear, interactive = false, dropActive = false, previewPosition, onAdd, onMove, onMoveEnd, onPreview }) {
  const canvasRef = useRef(null)
  const moving = useRef(null)
  const suppressClick = useRef(false)
  const didMove = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const size = canvas.clientWidth
    canvas.width = size * ratio
    canvas.height = size * ratio
    context.scale(ratio, ratio)
    const center = size / 2
    const radius = size * .34
    const styles = getComputedStyle(document.documentElement)
    context.clearRect(0, 0, size, size)
    context.beginPath(); context.arc(center, center, radius, 0, TAU)
    context.lineWidth = dropActive ? 4 : 2
    context.strokeStyle = dropActive ? styles.getPropertyValue('--accent') : styles.getPropertyValue('--line'); context.stroke()
    const lanes = collisionLanes(moments, .042)
    moments.forEach((moment) => {
      const weather = weatherById(moment.weather)
      if (!weather) return
      const { x, y } = momentPoint(moment, size, lanes.get(moment.id) || 0)
      const gradient = context.createRadialGradient(x, y, 0, x, y, 38)
      gradient.addColorStop(0, `${weather.color}88`); gradient.addColorStop(1, `${weather.color}00`)
      context.fillStyle = gradient; context.fillRect(x - 38, y - 38, 76, 76)
      context.font = '28px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(weather.emoji, x, y)
    })
    context.lineWidth = 1; context.strokeStyle = styles.getPropertyValue('--line')
    context.fillStyle = styles.getPropertyValue('--muted'); context.font = '500 10px DM Sans'; context.textAlign = 'center'
    timelineTicks(startYear).forEach(({ label, progress }) => {
      const angle = progress * TAU - Math.PI / 2
      const ax = Math.cos(angle); const ay = Math.sin(angle)
      context.beginPath(); context.moveTo(center + ax * (radius - 5), center + ay * (radius - 5)); context.lineTo(center + ax * (radius + 5), center + ay * (radius + 5)); context.stroke()
      context.fillText(label, center + ax * (radius + 20), center + ay * (radius + 20))
    })
    if (previewPosition) {
      const { x, y } = momentPoint(previewPosition, size)
      context.beginPath(); context.arc(x, y, 9, 0, TAU); context.fillStyle = styles.getPropertyValue('--accent'); context.globalAlpha = .3; context.fill(); context.globalAlpha = 1
    }
  }, [dropActive, moments, previewPosition, startYear])

  const getPosition = (event) => positionToMoment(event.clientX, event.clientY, event.currentTarget, startYear)
  const preview = (value) => onPreview?.(value ? progressLabel(value.progress, startYear) : '')
  const handlePointerDown = (event) => {
    if (!interactive) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const lanes = collisionLanes(moments, .042)
    const match = [...moments].reverse().find((moment) => { const point = momentPoint(moment, rect.width, lanes.get(moment.id) || 0); return Math.hypot(point.x - x, point.y - y) < 25 })
    if (match) { moving.current = match.id; didMove.current = false; suppressClick.current = true; event.currentTarget.setPointerCapture(event.pointerId); preview(match) }
  }
  const handlePointerMove = (event) => {
    const value = getPosition(event)
    preview(value)
    if (moving.current && value) { didMove.current = true; onMove?.(moving.current, value) }
  }
  const handleClick = (event) => {
    if (!interactive || !onAdd || suppressClick.current) { suppressClick.current = false; return }
    const value = getPosition(event)
    if (value) onAdd(value)
  }
  const finishMove = (event) => {
    if (moving.current && didMove.current) onMoveEnd?.(event)
    moving.current = null
    didMove.current = false
    // A click is dispatched after pointerup. Clear the guard just after it.
    setTimeout(() => { suppressClick.current = false }, 0)
  }

  return <canvas ref={canvasRef} className={`story-circle${interactive ? ' interactive' : ''}${dropActive ? ' drag-over' : ''}`} data-timeline="circle"
    onClick={handleClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
    onPointerUp={finishMove} onPointerCancel={finishMove} onLostPointerCapture={finishMove} onPointerLeave={() => !moving.current && preview(null)}
    aria-label="Frise chronologique circulaire, zone de dépôt et de repositionnement des météos" />
}
