import { useRef } from 'react'
import { weatherById } from '../data/weather'
import { positionFromPoint, progressLabel, snapProgress, totalMonths } from '../data/timeline'

export function linearPosition(clientX, clientY, element, view, startYear) {
  return positionFromPoint(clientX, clientY, element, view, startYear)
}

export function StoryTimeline({ moments, startYear, view, interactive = false, dropActive = false, onMove, onPreview }) {
  const activeMoment = useRef(null)

  const position = (event) => linearPosition(event.clientX, event.clientY, event.currentTarget, view, startYear)
  const preview = (value) => onPreview?.(value ? progressLabel(value.progress, startYear) : '')
  const handlePointerMove = (event) => {
    const value = position(event)
    preview(value)
    if (activeMoment.current && value) onMove?.(activeMoment.current, value)
  }

  return <div
    className={`linear-timeline ${view}${dropActive ? ' drag-over' : ''}`}
    data-timeline={view}
    onPointerMove={handlePointerMove}
    onPointerLeave={() => !activeMoment.current && preview(null)}
    onPointerUp={() => { activeMoment.current = null }}
    onPointerCancel={() => { activeMoment.current = null }}
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
        disabled={!interactive}
        onPointerDown={(event) => { if (interactive) { activeMoment.current = moment.id; event.currentTarget.setPointerCapture(event.pointerId) } }}
        onLostPointerCapture={() => { activeMoment.current = null }}
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
