import { useMemo, useState } from 'react'
import { StoryCircle, positionToMoment } from './components/StoryCircle'
import { WEATHERS, weatherById } from './data/weather'
import { useLocalStory } from './hooks/useLocalStory'

const yearNow = new Date().getFullYear()

function Intro({ hasStory, onStart, onResume }) {
  return <main className="screen intro">
    <div className="hero-orbit" aria-hidden="true"><span>🌦️</span></div>
    <div className="eyebrow">Votre récit sensible</div>
    <h1>La météo<br />de mon <em>histoire</em></h1>
    <p className="lead">Posez sur le temps les éclaircies, les orages et les brumes que vous avez traversés.</p>
    <div className="actions"><button className="button primary" onClick={onStart}>Commencer <span>→</span></button>{hasStory && <button className="button ghost" onClick={onResume}>Reprendre mon histoire</button>}</div>
  </main>
}

function Setup({ value, onChange, onNext }) {
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
    <button className="button primary" onClick={onNext}>Construire le cercle <span>→</span></button>
  </main>
}

function Editor({ story, setStory, onFinish }) {
  const [selected, setSelected] = useState('sun')
  const [touchDrag, setTouchDrag] = useState(null)
  const addMoment = ({ progress, intensity, weather = selected }) => setStory((current) => ({ ...current, moments: [...current.moments, { id: crypto.randomUUID(), weather, progress, intensity }] }))
  const undo = () => setStory((current) => ({ ...current, moments: current.moments.slice(0, -1) }))
  const startDrag = (event, weather) => {
    event.dataTransfer.setData('application/x-meteostory-weather', weather.id)
    event.dataTransfer.setData('text/plain', weather.id)
    event.dataTransfer.effectAllowed = 'copy'
    setSelected(weather.id)
  }
  const startTouchDrag = (event, weather) => {
    if (event.pointerType === 'mouse') return
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelected(weather.id)
    setTouchDrag({ weather, x: event.clientX, y: event.clientY })
  }
  const moveTouchDrag = (event) => {
    if (touchDrag) setTouchDrag((current) => ({ ...current, x: event.clientX, y: event.clientY }))
  }
  const endTouchDrag = (event) => {
    if (!touchDrag) return
    const circle = document.querySelector('.editor .story-circle')
    const position = circle && positionToMoment(event.clientX, event.clientY, circle)
    if (position) addMoment({ ...position, weather: touchDrag.weather.id })
    setTouchDrag(null)
  }
  return <main className="screen editor">
    <div className="editor-heading"><div className="step">02 <span>/ 03</span></div><h2>Composez votre ciel</h2><p>Glissez une météo sur le cercle à l'endroit qui vous ressemble.</p></div>
    <div className="circle-wrap"><StoryCircle {...story} interactive onAdd={addMoment} /><div className="circle-center"><strong>{story.moments.length}</strong><small>moments déposés</small></div></div>
    <section className="weather-dock" aria-label="Palette météo">
      {WEATHERS.map((weather) => <button key={weather.id} draggable className={selected === weather.id ? 'selected' : ''} onClick={() => setSelected(weather.id)} onDragStart={(event) => startDrag(event, weather)} onPointerDown={(event) => startTouchDrag(event, weather)} onPointerMove={moveTouchDrag} onPointerUp={endTouchDrag} onPointerCancel={() => setTouchDrag(null)} aria-label={`${weather.name}, à glisser sur le cercle`}><b>{weather.emoji}</b><span>{weather.name}</span></button>)}
    </section>
    {touchDrag && <div className="drag-ghost" style={{ left: touchDrag.x, top: touchDrag.y }} aria-hidden="true">{touchDrag.weather.emoji}</div>}
    <div className="editor-actions"><button className="icon-button" onClick={undo} disabled={!story.moments.length} aria-label="Annuler">↶</button><button className="button primary" onClick={onFinish} disabled={!story.moments.length}>Voir ma MeteoStory <span>→</span></button></div>
  </main>
}

function Result({ story, onEdit, onRestart }) {
  const dominant = useMemo(() => {
    const counts = story.moments.reduce((all, item) => ({ ...all, [item.weather]: (all[item.weather] || 0) + 1 }), {})
    return weatherById(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0])
  }, [story.moments])
  return <main className="screen result">
    <div className="step">03 <span>/ 03</span></div><h2>Votre <em>MeteoStory</em></h2><p className="lead">La météo de votre histoire, d'un seul regard.</p>
    <div className="circle-wrap result-circle"><StoryCircle {...story} /><div className="circle-center"><b>{dominant?.emoji}</b><strong>{story.startYear} — {yearNow}</strong><small>{story.moments.length} moments</small></div></div>
    <div className="summary-chips">{WEATHERS.map((weather) => { const count = story.moments.filter((item) => item.weather === weather.id).length; return count ? <span key={weather.id}>{weather.emoji} {count} {weather.name.toLowerCase()}</span> : null })}</div>
    <div className="actions"><button className="button primary" onClick={onEdit}>Continuer l'histoire</button><button className="button ghost" onClick={onRestart}>Nouvelle MeteoStory</button></div>
  </main>
}

export default function App() {
  const [story, setStory] = useLocalStory()
  const [screen, setScreen] = useState('intro')
  const startNew = () => { setStory({ startYear: yearNow - 8, moments: [] }); setScreen('setup') }
  return <div className="app-shell">
    <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
    <header><button className="brand" onClick={() => setScreen('intro')}>Meteo<span>Story</span></button><span className="header-note">Une histoire à ressentir</span></header>
    {screen === 'intro' && <Intro hasStory={story.moments.length > 0} onStart={startNew} onResume={() => setScreen('editor')} />}
    {screen === 'setup' && <Setup value={story.startYear} onChange={(startYear) => setStory((current) => ({ ...current, startYear }))} onNext={() => setScreen('editor')} />}
    {screen === 'editor' && <Editor story={story} setStory={setStory} onFinish={() => setScreen('result')} />}
    {screen === 'result' && <Result story={story} onEdit={() => setScreen('editor')} onRestart={startNew} />}
  </div>
}
