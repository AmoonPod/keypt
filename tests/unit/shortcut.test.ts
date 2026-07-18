import { describe, expect, it } from 'vitest'

import { isSafeAccelerator } from '../../src/main/shortcut'

describe('global shortcut validation', () => {
  it.each(['CommandOrControl+Shift+V', 'Command+Option+C', 'Control+Alt+F12', 'Super+Space'])(
    'accepts a bounded Electron accelerator',
    (accelerator) => {
      expect(isSafeAccelerator(accelerator)).toBe(true)
    }
  )

  it.each(['V', 'Shift+', 'Control+VolumeUp', 'Control+Shift+V;open', 'Control++V'])(
    'rejects malformed or unmodified accelerators',
    (accelerator) => {
      expect(isSafeAccelerator(accelerator)).toBe(false)
    }
  )
})
