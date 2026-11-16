<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
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

const props = defineProps<{
  content: string
  path: string
}>()

const emit = defineEmits<{
  (e: 'update:content', val: string): void
  (e: 'view', v: EditorView | null): void
}>()

const editorEl = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let isSaving = false
const tabsStore = useTabsStore()
const vaultStore = useVaultStore()

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
  if (!view) return
  const currentText = view.state.doc.toString()
  const tab = tabsStore.activeTab
  if (tab) tab.dirty = true

  emit('update:content', currentText)

  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    saveNote(props.path, currentText)
  }, 100)
}

function initEditor() {
  if (!editorEl.value) return
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

  const state = EditorState.create({
    doc: props.content,
    extensions: [
      baseTheme,
      markdown(),
      markdownHighlightStyle,
      checkboxExtension(),
      imagePreviewExtension(() => vaultStore.current?.path),
      clipboardPasteExtension(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      EditorView.lineWrapping,
      closeBrackets(),
      search({ top: true }),
      customKeymap,
      keymap.of([...searchKeymap, ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) scheduleAutosave()
      }),
    ],
  })

  view = new EditorView({
    state,
    parent: editorEl.value,
  })
  emit('view', view)
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
  if (view) {
    const text = view.state.doc.toString()
    emit('update:content', text)
    if (tabsStore.activeTab?.dirty) {
      await saveNote(props.path, text)
    }
    emit('view', null)
    view.destroy()
    view = null
  }
})

watch(() => props.path, async (_newPath, oldPath) => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  if (view && oldPath) {
    const text = view.state.doc.toString()
    emit('update:content', text)
    if (tabsStore.tabs.find((t) => t.path === oldPath)?.dirty) {
      await saveNote(oldPath, text)
    }
    view.destroy()
    view = null
  }
  initEditor()
})

watch(() => props.content, (newContent) => {
  if (view && !tabsStore.activeTab?.dirty && view.state.doc.toString() !== newContent) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newContent },
    })
  }
})
</script>

<template>
  <div ref="editorEl" class="h-full w-full overflow-hidden" />
</template>
