/// <reference types="vite/client" />

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
