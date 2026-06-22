export type AccentName = 'Evergreen' | 'Indigo' | 'Clay'

export const ACCENTS: Record<AccentName, { accent: string; soft: string }> = {
  Evergreen: { accent: '#2f5d4e', soft: '#e7efea' },
  Indigo:    { accent: '#3c4a86', soft: '#e9ebf6' },
  Clay:      { accent: '#9c5a3c', soft: '#f3e9e2' },
}

export const LIGHT = { paper:'#f6f4ee', surface:'#fffdf9', ink:'#211f1b', muted:'#6f6a61', line:'#e8e3d8', track:'#ece7da' }
export const DARK  = { paper:'#191712', surface:'#221f18', ink:'#efe9df', muted:'#a39b8d', line:'#36322a', track:'#322e26' }

export function applyTheme(dark: boolean, accent: AccentName = 'Evergreen'): void {
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  const pal = dark ? DARK : LIGHT
  for (const [k, v] of Object.entries(pal)) root.style.setProperty(`--${k}`, v)
  const a = ACCENTS[accent] ?? ACCENTS.Evergreen
  root.style.setProperty('--accent', a.accent)
  root.style.setProperty('--accent-soft', dark ? `color-mix(in srgb, ${a.accent} 26%, ${pal.surface})` : a.soft)
  root.style.setProperty('--rust', '#9c5a3c')
}
