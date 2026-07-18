import { describe, expect, it } from 'vitest'

import { isExcludedSource } from '../../src/main/clipboard/source-app'

describe('source exclusions', () => {
  it('matches names, bundle identifiers, and paths without case sensitivity', () => {
    const excluded = ['1Password', 'KeePassXC']
    expect(isExcludedSource({ name: '1Password 8' }, excluded)).toBe(true)
    expect(
      isExcludedSource(
        { name: 'Unknown', id: 'org.keepassxc.KeePassXC', path: '/Applications/KeePassXC.app' },
        excluded
      )
    ).toBe(true)
    expect(isExcludedSource({ name: 'Visual Studio Code' }, excluded)).toBe(false)
  })

  it('always ignores Keypt itself', () => {
    expect(isExcludedSource({ name: 'Keypt' }, [])).toBe(true)
  })
})
