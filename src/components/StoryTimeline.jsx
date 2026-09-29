import { useRef, useState } from 'react'
import { weatherById } from '../data/weather'
import { progressLabel, snapProgress, totalMonths } from '../data/timeline'

export function linearPosition(clientX, clientY, element, view, startYear) {
  const rect = element.getBoundingClientRect()
  const horizontal = view === 'horizontal'
  const progress = horizontal ? (clientX - rect.left) / rect.width : (clientY - rect.top) / rect.height
  const intensity = horizontal ? 1 - ((clientY - rect.top) / rect.height) : (clientX - rect.left) / rect.width
  if (progress < -.03 || progress > 1.03 || intensity < -.15 || intensity > 1.15) return null
  return { progress: snapProgress(progress, startYear), intensity: Math.max(0, Math.min(1, intensity)) }
}

export function StoryTimeline({ moments, startYear, view, interactive = false, onAdd, onMove, onPreview }) {
  const [dragOver, setDragOver] = useState(false)
  const activeMoment = useRef(null)

  const position = (event) => linearPosition(event.clientX, event.clientY, event.currentTarget, view, startYear)
  const preview = (value) => onPreview?.(value ? progressLabel(value.progress, startYear) : '')
  const handleDragOver = (event) => {
    event.preventDefault()
    setDragOver(true)
    preview(position(event))
  }
  const handleDrop = (event) => {
    event.preventDefault()
    setDragOver(false)
    const value = position(event)
    const momentId = event.dataTransfer.getData('application/x-meteostory-moment')
    const weather = event.dataTransfer.getData('application/x-meteostory-weather') || event.dataTransfer.getData('text/plain')
    if (value && momentId) onMove?.(momentId, value)
    else if (value && weatherById(weather)) onAdd?.({ ...value, weather })
    preview(value)
  }
  const handlePointerMove = (event) => {
    const value = position(event)
    preview(value)
    if (activeMoment.current && value) onMove?.(activeMoment.current, value)
  }

  return <div
    className={`linear-timeline ${view}${dragOver ? ' drag-over' : ''}`}
    data-timeline={view}
    onDragOver={handleDragOver}
    onDragLeave={() => setDragOver(false)}
    onDrop={handleDrop}
    onPointerMove={handlePointerMove}
    onPointerLeave={() => !activeMoment.current && preview(null)}
    onPointerUp={() => { activeMoment.current = null }}
    aria-label={`Frise ${view === 'horizontal' ? 'horizontale' : 'verticale'}, zone de dépôt des météos`}
  >
    <span className="timeline-start">Jan. {startYear}</span>
    <span className="timeline-end">Aujourd'hui</span>
    <i className="timeline-line" aria-hidden="true" />
    {moments.map((moment) => {
      const weather = weatherById(moment.weather)
      const style = view === 'horizontal'
        ? { left: `${moment.progress * 100}%`, bottom: `${12 + moment.intensity * 68}%` }
        : { top: `${moment.progress * 100}%`, left: `${12 + moment.intensity * 68}%` }
      return <button
        key={moment.id}
        className="timeline-moment"
        style={style}
        draggable={interactive}
        disabled={!interactive}
        onDragStart={(event) => { event.dataTransfer.setData('application/x-meteostory-moment', moment.id); event.dataTransfer.effectAllowed = 'move' }}
        onPointerDown={(event) => { if (interactive) { activeMoment.current = moment.id; event.currentTarget.setPointerCapture(event.pointerId) } }}
        onKeyDown={(event) => {
          if (!interactive || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
          event.preventDefault()
          const backwards = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          const nextProgress = snapProgress(moment.progress + (backwards ? -1 : 1) / totalMonths(startYear), startYear)
          onMove?.(moment.id, { progress: nextProgress, intensity: moment.intensity })
          preview({ ...moment, progress: nextProgress })
        }}
        onFocus={() => preview(moment)}
        aria-label={`${weather?.name}, ${progressLabel(moment.progress, startYear)}. Faire glisser pour déplacer.`}
        title={progressLabel(moment.progress, startYear)}
      >{weather?.emoji}</button>
    })}
  </div>
}
