import { useMemo, useRef, useState } from 'react'
import { StoryCircle } from './components/StoryCircle'
import { StoryTimeline } from './components/StoryTimeline'
import { positionFromPoint, progressLabel } from './data/timeline'
import { WEATHERS, weatherById } from './data/weather'
import { useLocalStory } from './hooks/useLocalStory'

const yearNow = new Date().getFullYear()
let audioContext

const playDropSound = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  audioContext ||= new AudioContext()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(440, audioContext.currentTime); oscillator.frequency.exponentialRampToValueAtTime(760, audioContext.currentTime + .09)
  gain.gain.setValueAtTime(.0001, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.08, audioContext.currentTime + .015); gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .12)
  oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .13)
}

function Intro({ hasStory, ambience, onAmbience, onStart, onResume }) {
  return <main className="screen intro">
    <div className="hero-orbit" aria-hidden="true"><span key={ambience.id}>{ambience.emoji}</span></div>
    <div className="eyebrow">Cartographie sensible</div>
    <h1>Nos vies ont<br />leur propre <em>météo</em></h1>
    <p className="lead">Déposez vos ressentis sur le temps. Seul, en famille ou entre proches.</p>
    <div className="intro-weather" aria-label="Choisir une ambiance">
      {WEATHERS.slice(0, 6).map((weather) => <button key={weather.id} className={ambience.id === weather.id ? 'active' : ''} onClick={() => onAmbience(weather.id)} aria-label={`Ambiance ${weather.name}`} aria-pressed={ambience.id === weather.id}>{weather.emoji}</button>)}
    </div>
    <div className="mode-cards">
      <button className="mode-card" onClick={() => onStart('solo')}><span>01</span><b>Mon histoire</b><small>Composer ma météo personnelle</small><i>→</i></button>
      <button className="mode-card multi" onClick={() => onStart('group')}><span>02 · MULTI</span><b>Nos perceptions</b><small>Comparer les ressentis du groupe</small><i>＋</i></button>
    </div>
    {hasStory && <button className="resume-link" onClick={onResume}>↗ Reprendre l'histoire en cours</button>}
  </main>
}

function Setup({ story, onChange, onParticipantsChange, onNext }) {
  const value = story.startYear
  return <main className="screen setup">
    <div className="step">01 <span>/ 03</span></div>
    <h2>Quand commence<br />votre <em>histoire&nbsp;?</em></h2>
    <p className="lead">Choisissez l'année de départ. Le cercle se construira jusqu'à aujourd'hui.</p>
    <section className="year-card">
      <button aria-label="Année précédente" onClick={() => onChange(value - 1)}>−</button>
      <div><strong>{value}</strong><small>jusqu'à {yearNow}</small></div>
      <button aria-label="Année suivante" onClick={() => onChange(value + 1)}>+</button>
      <input type="range" min={yearNow - 80} max={yearNow - 1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </section>
    {story.mode === 'group' && <section className="people-setup">
      <div><strong>Qui participe&nbsp;?</strong><small>Chaque personne déposera sa propre perception.</small></div>
      {story.participants.map((person, index) => <label key={person.id}><span>{index + 1}</span><input value={person.name} maxLength="18" aria-label={`Nom de la personne ${index + 1}`} onChange={(event) => onParticipantsChange(story.participants.map((item) => item.id === person.id ? { ...item, name: event.target.value } : item))} />{story.participants.length > 2 && <button onClick={() => onParticipantsChange(story.participants.filter((item) => item.id !== person.id))} aria-label={`Retirer ${person.name || `la personne ${index + 1}`}`}>×</button>}</label>)}
      {story.participants.length < 6 && <button className="add-person" onClick={() => onParticipantsChange([...story.participants, { id: crypto.randomUUID(), name: `Personne ${story.participants.length + 1}` }])}>＋ Ajouter une personne</button>}
    </section>}
    <button className="button primary" onClick={onNext}>Construire le cercle <span>→</span></button>
  </main>
}

function Editor({ story, setStory, initialWeather, onWeatherChange, onFinish }) {
  const [selected, setSelected] = useState(initialWeather)
  const [activePerson, setActivePerson] = useState(story.participants?.[0]?.id || 'solo')
  const paletteDrag = useRef(null)
  const [dragGhost, setDragGhost] = useState(null)
  const [dropActive, setDropActive] = useState(false)
  const [previewPosition, setPreviewPosition] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [dropBurst, setDropBurst] = useState(null)
  const [view, setView] = useState('circle')
  const [positionLabel, setPositionLabel] = useState('')
  const addMoment = ({ progress, intensity, weather = selected }) => setStory((current) => ({ ...current, moments: [...current.moments, { id: crypto.randomUUID(), weather, progress, intensity, author: activePerson }] }))
  const moveMoment = (id, position) => setStory((current) => ({ ...current, moments: current.moments.map((moment) => moment.id === id ? { ...moment, ...position } : moment) }))
  const undo = () => setStory((current) => ({ ...current, moments: current.moments.slice(0, -1) }))
  const startPaletteDrag = (event, weather) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    paletteDrag.current = weather
    setSelected(weather.id)
    onWeatherChange(weather.id)
    setDragGhost({ weather, x: event.clientX, y: event.clientY })
    if (event.pointerType === 'touch') navigator.vibrate?.(8)
  }
  const getPalettePosition = (event) => {
    const timeline = document.querySelector(`.editor [data-timeline="${view}"]`)
    return positionFromPoint(event.clientX, event.clientY, timeline, view, story.startYear)
  }
  const movePaletteDrag = (event) => {
    if (!paletteDrag.current) return
    setDragGhost((current) => ({ ...current, x: event.clientX, y: event.clientY }))
    const position = getPalettePosition(event)
    setDropActive(Boolean(position))
    setPreviewPosition(position)
    setPositionLabel(position ? progressLabel(position.progress, story.startYear) : '')
  }
  const finishPaletteDrag = (event, cancelled = false) => {
    const weather = paletteDrag.current
    if (!weather) return
    const position = !cancelled && getPalettePosition(event)
    if (position) addMoment({ ...position, weather: weather.id })
    if (position) {
      navigator.vibrate?.([12, 24, 18])
      if (soundEnabled) playDropSound()
      const burst = { id: crypto.randomUUID(), x: event.clientX, y: event.clientY }
      setDropBurst(burst)
      setTimeout(() => setDropBurst((current) => current?.id === burst.id ? null : current), 650)
    }
    paletteDrag.current = null
    setDragGhost(null)
    setDropActive(false)
    setPreviewPosition(null)
  }
  const finishMomentMove = (event) => {
    navigator.vibrate?.(12)
    if (soundEnabled) playDropSound()
    if (event?.clientX) {
      const burst = { id: crypto.randomUUID(), x: event.clientX, y: event.clientY }
      setDropBurst(burst)
      setTimeout(() => setDropBurst((current) => current?.id === burst.id ? null : current), 650)
    }
  }
  return <main className="screen editor">
    <div className="editor-heading"><div className="step">02 <span>/ 03</span></div><h2>Composez votre ciel</h2><p>Glissez une météo sur le fil : elle s'aimante au mois le plus proche et reste déplaçable.</p></div>
    <div className="view-switcher" role="group" aria-label="Choisir la disposition de la frise">
      <button className={view === 'circle' ? 'active' : ''} onClick={() => setView('circle')} aria-pressed={view === 'circle'}>◯ <span>Circulaire</span></button>
      <button className={view === 'horizontal' ? 'active' : ''} onClick={() => setView('horizontal')} aria-pressed={view === 'horizontal'}>↔ <span>Horizontale</span></button>
      <button className={view === 'vertical' ? 'active' : ''} onClick={() => setView('vertical')} aria-pressed={view === 'vertical'}>↕ <span>Verticale</span></button>
    </div>
    <button className={`sound-toggle${soundEnabled ? ' active' : ''}`} onClick={() => setSoundEnabled((enabled) => !enabled)} aria-pressed={soundEnabled} aria-label={`Effets sonores ${soundEnabled ? 'activés' : 'désactivés'}`}>{soundEnabled ? '♪ Son' : '♩ Son'}</button>
    {story.mode === 'group' && <div className="people-switcher" role="group" aria-label="Personne qui raconte">
      {story.participants.map((person, index) => <button key={person.id} className={activePerson === person.id ? 'active' : ''} onClick={() => setActivePerson(person.id)} aria-pressed={activePerson === person.id}><i style={{ '--person': index }} />{person.name || `Personne ${index + 1}`}</button>)}
    </div>}
    <div className="position-readout" aria-live="polite">{positionLabel || 'Survolez la frise pour choisir un mois'}</div>
    {view === 'circle'
      ? <div className="circle-wrap editor-circle"><StoryCircle {...story} interactive dropActive={dropActive} previewPosition={previewPosition} onAdd={addMoment} onMove={moveMoment} onMoveEnd={finishMomentMove} onPreview={setPositionLabel} /><div className="circle-center"><strong>{story.moments.length}</strong><small>perles météo</small></div></div>
      : <StoryTimeline {...story} view={view} interactive dropActive={dropActive} previewPosition={previewPosition} onMove={moveMoment} onMoveEnd={finishMomentMove} onPreview={setPositionLabel} />}
    <section className="weather-dock" aria-label="Palette météo">
      {WEATHERS.map((weather) => <button key={weather.id} className={selected === weather.id ? 'selected' : ''} onClick={() => { setSelected(weather.id); onWeatherChange(weather.id) }} onPointerDown={(event) => startPaletteDrag(event, weather)} onPointerMove={movePaletteDrag} onPointerUp={finishPaletteDrag} onPointerCancel={(event) => finishPaletteDrag(event, true)} onLostPointerCapture={(event) => finishPaletteDrag(event, true)} aria-label={`${weather.name}, à glisser sur la frise`}><b>{weather.emoji}</b><span>{weather.name}</span></button>)}
    </section>
    {dragGhost && <div className="drag-ghost" style={{ left: dragGhost.x, top: dragGhost.y }} aria-hidden="true">{dragGhost.weather.emoji}</div>}
    {dragGhost && <div className="drag-particles" style={{ left: dragGhost.x, top: dragGhost.y }} aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ '--i': index }} />)}</div>}
    {dropBurst && <div className="drop-burst" style={{ left: dropBurst.x, top: dropBurst.y }} aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--i': index }} />)}</div>}
    <div className="editor-actions"><button className="icon-button" onClick={undo} disabled={!story.moments.length} aria-label="Annuler">↶</button><button className="button primary" onClick={onFinish} disabled={!story.moments.length}>Voir ma meteoStoory <span>→</span></button></div>
  </main>
}

function Result({ story, onEdit, onRestart }) {
  const dominant = useMemo(() => {
    const counts = story.moments.reduce((all, item) => ({ ...all, [item.weather]: (all[item.weather] || 0) + 1 }), {})
    return weatherById(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0])
  }, [story.moments])
  return <main className="screen result">
    <div className="step">03 <span>/ 03</span></div><h2>Votre <em>meteoStoory</em></h2><p className="lead">La météo de votre histoire, d'un seul regard.</p>
    <div className="circle-wrap result-circle"><StoryCircle {...story} /><div className="circle-center"><b>{dominant?.emoji}</b><strong>{story.startYear} — {yearNow}</strong><small>{story.moments.length} moments</small></div></div>
    <div className="summary-chips">{WEATHERS.map((weather) => { const count = story.moments.filter((item) => item.weather === weather.id).length; return count ? <span key={weather.id}>{weather.emoji} {count} {weather.name.toLowerCase()}</span> : null })}</div>
    {story.mode === 'group' && <section className="group-comparison"><h3>Regards croisés</h3>{story.participants.map((person, index) => { const moments = story.moments.filter((moment) => (moment.author || story.participants[0].id) === person.id); const top = WEATHERS.map((weather) => ({ ...weather, count: moments.filter((moment) => moment.weather === weather.id).length })).sort((a, b) => b.count - a.count)[0]; return <div key={person.id}><i style={{ '--person': index }} /><strong>{person.name || `Personne ${index + 1}`}</strong><span>{top?.count ? `${top.emoji} ${top.name}` : 'Pas encore de météo'}</span><small>{moments.length} moments</small></div> })}</section>}
    <div className="actions"><button className="button primary" onClick={onEdit}>Continuer l'histoire</button><button className="button ghost" onClick={onRestart}>Nouvelle meteoStoory</button></div>
  </main>
}

export default function App() {
  const [story, setStory] = useLocalStory()
  const [screen, setScreen] = useState('intro')
  const [ambienceId, setAmbienceId] = useState('clear')
  const ambience = weatherById(ambienceId) || WEATHERS[0]
  const startNew = (mode = 'solo') => { setStory({ startYear: yearNow - 8, moments: [], mode, participants: mode === 'group' ? [{ id: crypto.randomUUID(), name: 'Moi' }, { id: crypto.randomUUID(), name: 'Un proche' }] : [{ id: 'solo', name: 'Moi' }] }); setScreen('setup') }
  return <div className={`app-shell weather-${ambience.id}`} style={{ '--accent': ambience.color, '--mood': ambience.color }}>
    <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
    <div className="weather-scene" key={ambience.id} aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <span key={index} style={{ '--x': `${(index * 37) % 100}%`, '--d': `${(index % 7) * -.45}s`, '--s': `${.7 + (index % 4) * .18}` }}>{ambience.emoji}</span>)}</div>
    <header><button className="brand" onClick={() => setScreen('intro')}>meteo<span>Stoory</span></button><span className="header-note">Une histoire à ressentir</span></header>
    {screen === 'intro' && <Intro hasStory={story.moments.length > 0} ambience={ambience} onAmbience={setAmbienceId} onStart={startNew} onResume={() => setScreen('editor')} />}
    {screen === 'setup' && <Setup story={story} onChange={(startYear) => setStory((current) => ({ ...current, startYear }))} onParticipantsChange={(participants) => setStory((current) => ({ ...current, participants }))} onNext={() => setScreen('editor')} />}
    {screen === 'editor' && <Editor story={story} setStory={setStory} initialWeather={ambienceId} onWeatherChange={setAmbienceId} onFinish={() => setScreen('result')} />}
    {screen === 'result' && <Result story={story} onEdit={() => setScreen('editor')} onRestart={() => startNew('solo')} />}
  </div>
}
