// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { App } from '../../src/renderer/src/App'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  })
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

describe('clipboard panel renderer', () => {
  it('searches instantly and exposes the minimal settings surface', async () => {
    const user = userEvent.setup()
    render(<App />)

    const search = await screen.findByRole('textbox', { name: 'Search clipboard history' })
    expect(screen.getAllByRole('option')).toHaveLength(6)

    await user.click(screen.getAllByRole('option')[0])
    expect(await screen.findByRole('status')).toHaveTextContent('Preview mode: item copied.')

    await user.type(search, 'figma')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option')).toHaveTextContent('#5B72D6')

    await user.clear(search)
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Launch at login' })).not.toBeChecked()
    expect(screen.getByText('No account, network sync, analytics, or telemetry.')).toBeVisible()
  })

  it('keeps pin actions isolated from single-click copy', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('textbox', { name: 'Search clipboard history' })
    await user.click(screen.getByRole('button', { name: 'Unpin item' }))

    expect(screen.queryByText('Preview mode: item copied.')).not.toBeInTheDocument()
  })
})
