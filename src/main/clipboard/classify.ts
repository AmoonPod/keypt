import type { ClipKind } from '../../shared/contracts'

const CSS_COLOR = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\(\s*[-+\d.%\s,/]+\))$/i
const CODE_TOKENS = [
  /(?:^|\s)(?:const|let|var|function|class|interface|type|import|export|return|async|await)\b/,
  /(?:^|\s)(?:def|class|from|import|return|yield|lambda)\b.*:/,
  /(?:^|\s)(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b/i,
  /<\/?[a-z][^>]*>/i,
  /=>|::|===|!==|\{\s*["'\w-]+\s*:/,
  /^#!\//
]

export function detectColor(value: string): string | undefined {
  const candidate = value.trim()
  return CSS_COLOR.test(candidate) ? candidate : undefined
}

export function isWebLink(value: string): boolean {
  const candidate = value.trim()
  if (/^www\.[^\s]+$/i.test(candidate)) return true

  try {
    const url = new URL(candidate)
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function looksLikeCode(value: string): boolean {
  const text = value.trim()
  if (!text) return false

  let score = 0
  if (text.includes('\n')) score += 1
  if (/^\s{2,}\S/m.test(value) || /^\t+\S/m.test(value)) score += 1
  if (/[{}[\]();]/.test(text)) score += 1
  if (CODE_TOKENS.some((pattern) => pattern.test(text))) score += 2

  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed === 'object' && parsed !== null) score += 3
  } catch {
    // Most code is not JSON.
  }

  return score >= 3
}

export function classifyText(value: string): { kind: ClipKind; colorValue?: string } {
  const colorValue = detectColor(value)
  if (colorValue) return { kind: 'color', colorValue }
  if (isWebLink(value)) return { kind: 'link' }
  if (looksLikeCode(value)) return { kind: 'code' }
  return { kind: 'text' }
}

export function createTextPreview(value: string, limit = 500): string {
  const normalized = value.replace(/\r\n/g, '\n').trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit - 1).trimEnd()}…`
}
