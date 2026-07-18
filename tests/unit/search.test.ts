import { describe, expect, it } from 'vitest'

import type { ClipboardItemView } from '../../src/shared/contracts'
import { searchClipboardItems } from '../../src/shared/search'

const base: Omit<ClipboardItemView, 'id' | 'kind' | 'preview' | 'searchText' | 'sourceApp'> = {
  copiedAt: 1,
  pinned: false,
  byteSize: 10
}

const items: ClipboardItemView[] = [
  {
    ...base,
    id: '6b9a2227-4a5f-4773-ad77-f76d9a175eee',
    kind: 'text',
    preview: 'Release checklist',
    searchText: 'Run tests and package the desktop build',
    sourceApp: 'Notes'
  },
  {
    ...base,
    id: '3bd89a1a-ceb2-4924-88a0-7ff9ba99bd36',
    kind: 'code',
    preview: 'npm run check',
    searchText: 'npm run check release',
    sourceApp: 'Terminal'
  },
  {
    ...base,
    id: '0fda81a4-2d06-4a27-b9fb-579030ac6d65',
    kind: 'link',
    preview: 'https://github.com/electron/electron',
    searchText: 'open source repository',
    sourceApp: 'Safari'
  }
]

describe('instant search', () => {
  it('matches preview, full search text, source app, and type', () => {
    expect(searchClipboardItems(items, 'github')).toEqual([items[2]])
    expect(searchClipboardItems(items, 'package desktop')).toEqual([items[0]])
    expect(searchClipboardItems(items, 'terminal')).toEqual([items[1]])
    expect(searchClipboardItems(items, 'link')).toEqual([items[2]])
  })

  it('requires every term and favors a preview prefix', () => {
    expect(searchClipboardItems(items, 'release check')).toEqual([items[0], items[1]])
  })

  it('returns the original order for an empty query', () => {
    expect(searchClipboardItems(items, '   ')).toEqual(items)
  })
})
