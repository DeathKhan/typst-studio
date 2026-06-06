/// <reference types="vite/client" />

declare module '*.wasm?url' {
  const url: string
  export default url
}

interface HTMLWebViewElement extends HTMLElement {
  src: string
  getURL(): string
}

namespace Electron {
  interface WebviewTag extends HTMLElement {
    src: string
    partition: string
    addEventListener(
      type: 'did-fail-load',
      listener: (event: Event) => void
    ): void
    removeEventListener(type: 'did-fail-load', listener: (event: Event) => void): void
  }
}

interface Window {
  typstStudio: import('../preload/index').TypstStudioApi
}
