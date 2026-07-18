// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SettingsView } from '../../src/renderer/src/components/SettingsView'
import { DEFAULT_SETTINGS, type AppSnapshot } from '../../src/shared/contracts'

const snapshot: AppSnapshot = {
  items: [],
  settings: DEFAULT_SETTINGS,
  appVersion: '0.1.0',
  update: {
    phase: 'available',
    currentVersion: '0.1.0',
    availableVersion: '0.2.0'
  },
  platform: 'darwin',
  paused: false,
  shortcutRegistered: true,
  secureStorage: true,
  pastePermission: 'granted'
}

describe('SettingsView updates', () => {
  it('shows the in-app update action when an official release is available', () => {
    const onDownloadUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <SettingsView
        snapshot={snapshot}
        onBack={vi.fn()}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onSetPaused={vi.fn().mockResolvedValue(undefined)}
        onClear={vi.fn().mockResolvedValue(undefined)}
        onRequestPastePermission={vi.fn().mockResolvedValue(undefined)}
        onOpenDataFolder={vi.fn().mockResolvedValue(undefined)}
        onCheckForUpdates={vi.fn().mockResolvedValue(undefined)}
        onDownloadUpdate={onDownloadUpdate}
        onInstallUpdate={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByText('v0.2.0 is ready to download.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(onDownloadUpdate).toHaveBeenCalledOnce()
  })
})
