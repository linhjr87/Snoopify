import { describe, it, expect, beforeEach } from 'vitest'
import { ACCENTS, applyTheme } from './tokens'

describe('tokens', () => {
  beforeEach(() => { document.documentElement.className = ''; document.documentElement.removeAttribute('style') })
  it('exposes Evergreen default accent', () => {
    expect(ACCENTS.Evergreen.accent).toBe('#2f5d4e')
  })
  it('applyTheme(true) adds dark class and sets accent var', () => {
    applyTheme(true, 'Indigo')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#3c4a86')
  })
  it('applyTheme(false) removes dark class', () => {
    applyTheme(true, 'Evergreen'); applyTheme(false, 'Evergreen')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
