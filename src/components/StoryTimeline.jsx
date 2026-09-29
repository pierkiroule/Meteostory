import { useRef } from 'react'
import { weatherById } from '../data/weather'
import { collisionLanes, positionFromPoint, progressLabel, snapProgress, timelineTicks, totalMonths } from '../data/timeline'

export function linearPosition(clientX, clientY, element, view, startYear) {
  return positionFromPoint(clientX, clientY, element, view, startYear)
}

export function StoryTimeline({ moments, startYear, view, interactive = false, dropActive = false, previewPosition, onMove, onMoveEnd, onPreview }) {
  const activeMoment = useRef(null)
  const didMove = useRef(false)
  const lanes = collisionLanes(moments, view === 'horizontal' ? .075 : .055)

  const position = (event) => linearPosition(event.clientX, event.clientY, event.currentTarget, view, startYear)
  const preview = (value) => onPreview?.(value ? progressLabel(value.progress, startYear) : '')
  const handlePointerMove = (event) => {
    const value = position(event)
    preview(value)
    if (activeMoment.current && value) { didMove.current = true; onMove?.(activeMoment.current, value) }
  }
  const finishMove = (event) => {
    if (activeMoment.current && didMove.current) onMoveEnd?.(event)
    activeMoment.current = null
    didMove.current = false
  }

  return <div
    className={`linear-timeline ${view}${dropActive ? ' drag-over' : ''}`}
    data-timeline={view}
    onPointerMove={handlePointerMove}
    onPointerLeave={() => !activeMoment.current && preview(null)}
    onPointerUp={finishMove}
    onPointerCancel={finishMove}
    aria-label={`Frise ${view === 'horizontal' ? 'horizontale' : 'verticale'}, zone de dépôt des météos`}
  >
    <i className="timeline-line" aria-hidden="true" />
    <div className="timeline-ticks" aria-hidden="true">
      {timelineTicks(startYear).map((tick) => <span key={tick.year} style={{ '--tick': `${tick.progress * 100}%` }}><i /> <b>{tick.label}</b></span>)}
    </div>
    {previewPosition && <i className="magnet-preview" style={view === 'horizontal' ? { left: `${previewPosition.progress * 100}%` } : { top: `${previewPosition.progress * 100}%` }} aria-hidden="true" />}
    {moments.map((moment) => {
      const weather = weatherById(moment.weather)
      const lane = lanes.get(moment.id) || 0
      const style = view === 'horizontal'
        ? { left: `${moment.progress * 100}%`, top: `calc(50% + ${lane * 32}px)` }
        : { top: `${moment.progress * 100}%`, left: `calc(50% + ${lane * 32}px)` }
      return <button
        key={moment.id}
        className="timeline-moment"
        style={style}
        disabled={!interactive}
        onPointerDown={(event) => { if (interactive) { activeMoment.current = moment.id; didMove.current = false; event.currentTarget.setPointerCapture(event.pointerId) } }}
        onLostPointerCapture={(event) => { if (activeMoment.current) finishMove(event) }}
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
