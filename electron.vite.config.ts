import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import type { Plugin } from 'vite'

const root = __dirname
const typstSyntaxShim = resolve(root, 'src/renderer/lib/typst-syntax-shim.ts')
const typstSyntaxGlue = resolve(
  root,
  'node_modules/codemirror-lang-typst/wasm/typst_syntax_bg.js'
)
const typstSyntaxJs = resolve(
  root,
  'node_modules/codemirror-lang-typst/wasm/typst_syntax.js'
)

const VIRTUAL_WASM_STUB = '\0typst-wasm-stub'

/** Prevent codemirror-lang-typst from importing .wasm via broken ESM integration. */
function typstWasmShimPlugin(): Plugin {
  return {
    name: 'typst-wasm-shim',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.includes('typst_syntax_bg.wasm') && !source.includes('?')) {
        return VIRTUAL_WASM_STUB
      }
      if (
        source === typstSyntaxJs ||
        source.endsWith('/wasm/typst_syntax.js') ||
        source.endsWith('\\wasm\\typst_syntax.js') ||
        (source.includes('typst_syntax.js') &&
          !source.includes('typst-syntax-shim') &&
          importer?.includes('codemirror-lang-typst'))
      ) {
        return typstSyntaxShim
      }
      return null
    },
    load(id) {
      if (id === VIRTUAL_WASM_STUB) {
        return 'export default ""'
      }
      return null
    }
  }
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['vscode-jsonrpc', 'vscode-languageserver-protocol']
      })
    ],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    optimizeDeps: {
      exclude: ['codemirror-lang-typst']
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        [typstSyntaxJs]: typstSyntaxShim,
        'typst-syntax-glue': typstSyntaxGlue
      },
      dedupe: [
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@codemirror/commands'
      ]
    },
    plugins: [react(), wasm(), topLevelAwait(), typstWasmShimPlugin()],
    assetsInclude: ['**/*.wasm']
  }
})
