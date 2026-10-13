/// <reference types="vite/client" />
import type { NoterApi } from '@shared/types'

declare global {
  interface Window {
    api: NoterApi
  }
}
