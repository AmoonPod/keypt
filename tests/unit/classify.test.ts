import { describe, expect, it } from 'vitest'

import {
  classifyText,
  createTextPreview,
  detectColor,
  isWebLink,
  looksLikeCode
} from '../../src/main/clipboard/classify'

describe('clipboard classification', () => {
  it.each([
    ['#5B72D6', '#5B72D6'],
    ['rgb(91 114 214 / 80%)', 'rgb(91 114 214 / 80%)'],
    ['hsl(220, 60%, 50%)', 'hsl(220, 60%, 50%)']
  ])('recognizes CSS colors', (value, expected) => {
    expect(detectColor(value)).toBe(expected)
    expect(classifyText(value).kind).toBe('color')
  })

  it('recognizes web links without treating prose as a URL', () => {
    expect(isWebLink('https://github.com/electron/electron')).toBe(true)
    expect(isWebLink('www.example.com/docs')).toBe(true)
    expect(isWebLink('look at example.com later')).toBe(false)
    expect(classifyText('https://example.com').kind).toBe('link')
  })

  it.each([
    'const answer = { value: 42 };',
    '{"private":true,"history":[]}',
    'def copy_item(value):\n    return value',
    'SELECT id, value FROM clipboard_items;'
  ])('recognizes common code shapes', (value) => {
    expect(looksLikeCode(value)).toBe(true)
    expect(classifyText(value).kind).toBe('code')
  })

  it('leaves ordinary prose as text', () => {
    expect(classifyText('Keep the tool small and calm.').kind).toBe('text')
  })

  it('creates bounded, normalized previews without changing stored content', () => {
    expect(createTextPreview('  first\r\nsecond  ')).toBe('first\nsecond')
    expect(createTextPreview('abcdefgh', 6)).toBe('abcde…')
  })
})
