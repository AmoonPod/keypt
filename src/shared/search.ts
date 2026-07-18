import type { ClipboardItemView } from './contracts'

function normalize(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

export function searchClipboardItems(
  items: readonly ClipboardItemView[],
  rawQuery: string
): ClipboardItemView[] {
  const query = normalize(rawQuery)

  if (!query) return [...items]

  const terms = query.split(' ').filter(Boolean)

  return items
    .map((item, index) => {
      const haystack = normalize(
        `${item.preview}\n${item.searchText}\n${item.sourceApp}\n${item.kind}`
      )

      if (!terms.every((term) => haystack.includes(term))) return null

      let score = 0
      if (normalize(item.preview).startsWith(query)) score += 100
      if (normalize(item.preview).includes(query)) score += 60
      if (normalize(item.sourceApp).includes(query)) score += 20
      if (item.kind === query) score += 16
      score -= index * 0.001

      return { item, score }
    })
    .filter((result): result is { item: ClipboardItemView; score: number } => result !== null)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}
