export const WEATHERS = [
  { id: 'sun', emoji: '☀️', name: 'Soleil', color: '#efb83f' },
  { id: 'clear', emoji: '🌤️', name: 'Éclaircies', color: '#75b7bd' },
  { id: 'cloud', emoji: '☁️', name: 'Nuages', color: '#899aa2' },
  { id: 'rain', emoji: '🌧️', name: 'Pluie', color: '#467eaa' },
  { id: 'storm', emoji: '⛈️', name: 'Tempête', color: '#666095' },
  { id: 'fog', emoji: '🌫️', name: 'Brume', color: '#aebbb7' },
  { id: 'rainbow', emoji: '🌈', name: 'Arc-en-ciel', color: '#c980b0' },
  { id: 'snow', emoji: '❄️', name: 'Neige', color: '#bad3e8' },
  { id: 'wind', emoji: '💨', name: 'Vent', color: '#78af9e' },
  { id: 'heat', emoji: '🔥', name: 'Canicule', color: '#e77848' },
  { id: 'night', emoji: '🌙', name: 'Nuit', color: '#505a98' },
  { id: 'tornado', emoji: '🌪️', name: 'Tornade', color: '#786e7a' },
]

export const weatherById = (id) => WEATHERS.find((weather) => weather.id === id)
