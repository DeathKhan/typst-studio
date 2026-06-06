import { vim } from '@replit/codemirror-vim'
import type { Extension } from '@codemirror/state'

/**
 * Vim extension with built-in status panel disabled.
 * The app renders its own unified footer bar (mode + command/search + cursor).
 */
export const vimWithIntegratedStatus: Extension = vim({ status: false })
