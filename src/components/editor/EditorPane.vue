<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, keymap, drawSelection, highlightActiveLine, scrollPastEnd } from '@codemirror/view'
import { EditorState, Compartment, Annotation, Transaction, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { ensureSyntaxTree, forceParsing } from '@codemirror/language'
import { resolveCodeLanguage } from '@/lib/editor/codeLanguages'
import { GFM } from '@lezer/markdown'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { openSearchPanel, search, searchKeymap } from '@codemirror/search'
import { baseTheme, markdownHighlightStyle } from '@/lib/editor/theme'
import {
  toggleInlineMark,
  insertLink,
} from '@/lib/editor/commands'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { ipc } from '@/lib/ipc'
import { imagePreviewExtension } from '@/lib/editor/imageWidget'
import { clipboardPasteExtension } from '@/lib/editor/clipboard'
import { checkboxExtension } from '@/lib/editor/checkboxWidget'
import { livePreview } from '@/lib/editor/livePreview'
import type { NoteMode } from '@/lib/ipc/types'

const props = withDefaults(defineProps<{
  content: string
  path: string
  mode?: NoteMode
}>(), {
  mode: 'edit'
})

const emit = defineEmits<{
  (e: 'update:content', val: string): void
  (e: 'view', v: EditorView | null): void
}>()

const editorEl = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let isSaving = false
let restoring = false
let restoringTimer: ReturnType<typeof setTimeout> | null = null
const modeCompartment = new Compartment()
const tabsStore = useTabsStore()
const vaultStore = useVaultStore()

const externalChange = Annotation.define<boolean>()
const PARSE_LIMIT = 500_000
let fullParseTimer: ReturnType<typeof setTimeout> | null = null
let scrollTimer: ReturnType<typeof setTimeout> | null = null

function modeExtensions(mode: NoteMode) {
  return mode === 'view'
    ? [EditorState.readOnly.of(true), EditorView.editable.of(false), livePreview({ revealOnCursor: false })]
    : [livePreview({ revealOnCursor: true })]
}

async function saveNote(savePath: string, text: string) {
  if (isSaving) return
  const tab = tabsStore.tabs.find((t) => t.path === savePath)
  if (!tab || !tab.dirty) return

  isSaving = true
  try {
    let expectedMtime = tab.mtime
    if (expectedMtime === null) {
      const readRes = await ipc.noteRead(savePath)
      expectedMtime = readRes.mtime
      tab.mtime = readRes.mtime
    }
    const res = await ipc.noteWrite(savePath, text, expectedMtime)
    tab.mtime = res.mtime
    tab.dirty = false
  } catch {
    // Jika conflict (mtime berbeda pada disk), baca ulang mtime dan simpan kembali
    try {
      const fresh = await ipc.noteRead(savePath)
      const res = await ipc.noteWrite(savePath, text, fresh.mtime)
      tab.mtime = res.mtime
      tab.dirty = false
    } catch (retryErr) {
      console.error('Gagal menyimpan catatan:', retryErr)
    }
  } finally {
    isSaving = false
  }
}

async function saveNow() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
  if (!view) return
  const text = view.state.doc.toString()
  emit('update:content', text)
  await saveNote(props.path, text)
}

function scheduleAutosave() {
  if (!view || props.mode === 'view') return
  const currentText = view.state.doc.toString()
  const tab = tabsStore.activeTab
  if (tab) tab.dirty = true

  emit('update:content', currentText)

  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    saveNote(props.path, currentText)
  }, 100)
}

function currentTopLine(): number {
  if (!view) return 1
  const block = view.lineBlockAtHeight(view.scrollDOM.scrollTop)
  return view.state.doc.lineAt(block.from).number
}

function restoreLine(line: number) {
  if (!view) return
  const n = Math.min(Math.max(1, line), view.state.doc.lines)
  view.dispatch({
    effects: EditorView.scrollIntoView(view.state.doc.line(n).from, { y: 'start', yMargin: 0 }),
  })
  view.requestMeasure()
}

function stopRestoring() {
  restoring = false
  if (restoringTimer) {
    clearTimeout(restoringTimer)
    restoringTimer = null
  }
  if (view) {
    view.scrollDOM.removeEventListener('wheel', stopRestoring)
    view.scrollDOM.removeEventListener('touchstart', stopRestoring)
    view.scrollDOM.removeEventListener('pointerdown', stopRestoring)
    view.scrollDOM.removeEventListener('keydown', stopRestoring)
  }
}

function scheduleFullParse() {
  if (fullParseTimer) clearTimeout(fullParseTimer)
  fullParseTimer = setTimeout(() => {
    if (view && view.state.doc.length <= PARSE_LIMIT) {
      forceParsing(view, view.state.doc.length, 1000)
    }
  }, 300)
}

function makeExtensions(): Extension[] {
  const customKeymap = keymap.of([
    {
      key: 'Mod-s',
      run: () => {
        saveNow()
        return true
      },
    },
    {
      key: 'Mod-f',
      run: (v) => {
        openSearchPanel(v)
        return true
      },
    },
    {
      key: 'Mod-i',
      run: (v) => {
        toggleInlineMark(v, '*')
        return true
      },
    },
    {
      key: 'Mod-k',
      run: (v) => {
        insertLink(v)
        return true
      },
    },
    {
      key: 'Enter',
      run: (v) => {
        const line = v.state.doc.lineAt(v.state.selection.main.head)
        const match = line.text.match(/^(\s*)([-*]|\d+\.)\s+(\[[ xX]\]\s+)?/)
        if (match && v.state.selection.main.empty) {
          const prefix = match[0]
          if (line.text.trim() === match[0].trim()) {
            v.dispatch({
              changes: { from: line.from, to: line.to, insert: '' },
              scrollIntoView: true,
            })
            return true
          }
          let nextPrefix = match[2].match(/\d+\./)
            ? `${match[1]}${parseInt(match[2], 10) + 1}. `
            : prefix
          if (match[3]) {
            nextPrefix = nextPrefix.replace(/\[.*?\]\s+/, '[ ] ')
          }
          v.dispatch({
            changes: { from: v.state.selection.main.head, insert: `\n${nextPrefix}` },
            selection: { anchor: v.state.selection.main.head + nextPrefix.length + 1 },
            scrollIntoView: true,
          })
          return true
        }
        return false
      },
    },
  ])

  return [
    baseTheme,
    markdown({
      extensions: [GFM],
      codeLanguages: resolveCodeLanguage,
    }),
    markdownHighlightStyle,
    checkboxExtension(),
    imagePreviewExtension(() => vaultStore.current?.path),
    clipboardPasteExtension(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    EditorView.lineWrapping,
    scrollPastEnd(),
    closeBrackets(),
    search({ top: true }),
    customKeymap,
    keymap.of([...searchKeymap, ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
    modeCompartment.of(modeExtensions(props.mode)),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      if (update.transactions.some((tr) => tr.annotation(externalChange))) return
      scheduleAutosave()
      scheduleFullParse()
    }),
  ]
}

function createState(doc: string) {
  const state = EditorState.create({ doc, extensions: makeExtensions() })
  if (doc.length <= PARSE_LIMIT) ensureSyntaxTree(state, state.doc.length, 500)
  return state
}

function initEditor() {
  if (!editorEl.value) return

  view = new EditorView({
    state: createState(props.content),
    parent: editorEl.value,
  })
  if (props.content.length <= PARSE_LIMIT) {
    forceParsing(view, view.state.doc.length, 1000)
  }
  emit('view', view)

  restoring = true
  restoreLine(tabsStore.activeTab?.scrollLine ?? 1)

  view.scrollDOM.addEventListener('wheel', stopRestoring, { once: true })
  view.scrollDOM.addEventListener('touchstart', stopRestoring, { once: true })
  view.scrollDOM.addEventListener('pointerdown', stopRestoring, { once: true })
  view.scrollDOM.addEventListener('keydown', stopRestoring, { once: true })

  restoringTimer = setTimeout(() => {
    stopRestoring()
  }, 300)

  view.scrollDOM.addEventListener('scroll', handleEditorScroll)
}

function handleEditorScroll() {
  if (restoring) return
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    if (view) tabsStore.setScrollLine(currentTopLine())
  }, 150)
}

function handleBeforeUnload() {
  if (view && tabsStore.activeTab?.dirty) {
    saveNow()
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden' && view && tabsStore.activeTab?.dirty) {
    saveNow()
  }
}

onMounted(() => {
  initEditor()
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(async () => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (autosaveTimer) clearTimeout(autosaveTimer)
  if (fullParseTimer) clearTimeout(fullParseTimer)
  if (scrollTimer) clearTimeout(scrollTimer)
  stopRestoring()
  if (view) {
    if (!restoring) {
      tabsStore.setScrollLine(currentTopLine())
    }
    view.scrollDOM.removeEventListener('scroll', handleEditorScroll)
    const text = view.state.doc.toString()
    emit('update:content', text)
    if (tabsStore.activeTab?.dirty) {
      await saveNote(props.path, text)
    }
    view.destroy()
    view = null
  }
})

watch(() => props.path, async (_newPath, oldPath) => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  if (scrollTimer) clearTimeout(scrollTimer)
  stopRestoring()
  if (view && oldPath) {
    if (!restoring) {
      tabsStore.setScrollLine(currentTopLine())
    }
    const text = view.state.doc.toString()
    emit('update:content', text)
    if (tabsStore.tabs.find((t) => t.path === oldPath)?.dirty) {
      await saveNote(oldPath, text)
    }
  }

  if (view) {
    view.setState(createState(props.content))
    if (props.content.length <= PARSE_LIMIT) {
      forceParsing(view, view.state.doc.length, 1000)
    }
    restoring = true
    restoreLine(tabsStore.activeTab?.scrollLine ?? 1)

    view.scrollDOM.addEventListener('wheel', stopRestoring, { once: true })
    view.scrollDOM.addEventListener('touchstart', stopRestoring, { once: true })
    view.scrollDOM.addEventListener('pointerdown', stopRestoring, { once: true })
    view.scrollDOM.addEventListener('keydown', stopRestoring, { once: true })

    restoringTimer = setTimeout(() => {
      stopRestoring()
    }, 300)
  }
})

watch(() => props.mode, (m) => {
  if (view) {
    view.dispatch({ effects: modeCompartment.reconfigure(modeExtensions(m)) })
  }
})

watch(() => props.content, (newContent) => {
  if (!view || view.state.doc.toString() === newContent) return
  if (view.state.doc.length === 0) {
    // muat pertama: pasang state yang sudah ter-parse penuh
    view.setState(createState(newContent))
    restoreLine(tabsStore.activeTab?.scrollLine ?? 1)
    return
  }
  if (!tabsStore.activeTab?.dirty) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newContent },
      annotations: [externalChange.of(true), Transaction.addToHistory.of(false)],
    })
    forceParsing(view, view.state.doc.length, 200)
  }
})
</script>

<template>
  <div ref="editorEl" class="h-full w-full overflow-hidden" />
</template>
