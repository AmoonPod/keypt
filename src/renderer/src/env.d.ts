import type { KeyptApi } from '../../shared/contracts'

declare global {
  interface Window {
    keypt?: KeyptApi
  }
}

export {}
