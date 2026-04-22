/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'autofit.js' {
  interface AutofitInitOptions {
    dw?: number
    dh?: number
    el: string
    resize?: boolean
    ignore?: (string | HTMLElement)[]
    transition?: number
    delay?: number
    limit?: number
  }

  const autofit: {
    init: (options: AutofitInitOptions, isShowInitTip?: boolean) => void
    off: () => void
  }

  export default autofit
}
