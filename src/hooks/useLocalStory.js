import { useCallback, useState } from 'react'

const KEY = 'meteostory.story.v1'
const fallback = () => ({ startYear: new Date().getFullYear() - 8, moments: [] })

const readStory = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    return saved?.startYear && Array.isArray(saved.moments) ? saved : fallback()
  } catch {
    return fallback()
  }
}

export function useLocalStory() {
  const [story, setStoryState] = useState(readStory)
  const setStory = useCallback((value) => {
    setStoryState((current) => {
      const next = typeof value === 'function' ? value(current) : value
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return [story, setStory]
}
