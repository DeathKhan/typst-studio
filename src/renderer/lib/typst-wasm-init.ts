import wasmUrl from '../assets/typst_syntax_bg.wasm?url'
import * as wasmBindings from 'typst-syntax-glue'
import { __wbg_set_wasm } from 'typst-syntax-glue'

let initPromise: Promise<void> | null = null

/** Load typst-syntax WASM once (Vite/Electron breaks the package default import). */
export function initTypstWasm(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const response = await fetch(wasmUrl)
      if (!response.ok) {
        throw new Error(`Failed to load typst-syntax wasm: ${response.status}`)
      }
      const bytes = await response.arrayBuffer()
      const { instance } = await WebAssembly.instantiate(bytes, {
        './typst_syntax_bg.js': wasmBindings
      })
      const exports = instance.exports as WebAssembly.Export & {
        __wbindgen_start?: () => void
      }
      __wbg_set_wasm(exports)
      exports.__wbindgen_start?.()
    })()
  }
  return initPromise
}
