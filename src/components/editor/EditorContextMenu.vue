<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EditorView } from '@codemirror/view'
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from 'reka-ui'
import { t } from '@/lib/i18n/id'
import { useTabsStore } from '@/stores/tabs'
import {
  toggleInlineMark,
  insertLink,
} from '@/lib/editor/commands'

const props = defineProps<{
  mode: 'view' | 'edit'
  view?: EditorView | null
}>()

const tabsStore = useTabsStore()
const hasSelection = ref(false)
const itemClass = 'rounded-sm px-2.5 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center justify-between text-xs text-fg'

function checkSelection() {
  if (props.mode === 'edit' && props.view) {
    hasSelection.value = !props.view.state.selection.main.empty
  } else {
    const sel = window.getSelection()
    hasSelection.value = Boolean(sel && sel.toString().length > 0)
  }
}

async function handleCopy() {
  if (props.mode === 'edit' && props.view) {
    const main = props.view.state.selection.main
    if (!main.empty) {
      const text = props.view.state.sliceDoc(main.from, main.to)
      await navigator.clipboard.writeText(text)
    }
  } else {
    const text = window.getSelection()?.toString()
    if (text) await navigator.clipboard.writeText(text)
  }
}

async function handleCut() {
  if (props.mode !== 'edit' || !props.view) return
  const main = props.view.state.selection.main
  if (!main.empty) {
    const text = props.view.state.sliceDoc(main.from, main.to)
    await navigator.clipboard.writeText(text)
    props.view.dispatch({
      changes: { from: main.from, to: main.to, insert: '' },
    })
  }
}

async function handlePaste() {
  if (props.mode !== 'edit' || !props.view) return
  try {
    const text = await navigator.clipboard.readText()
    const main = props.view.state.selection.main
    props.view.dispatch({
      changes: { from: main.from, to: main.to, insert: text },
      selection: { anchor: main.from + text.length },
    })
  } catch {
    // clipboard permission denied
  }
}

function handleSelectAll() {
  if (props.mode === 'edit' && props.view) {
    props.view.dispatch({
      selection: { anchor: 0, head: props.view.state.doc.length },
    })
  } else {
    const sel = window.getSelection()
    const target = document.querySelector('.view-content') || document.querySelector('.markdown-body')
    if (sel && target) {
      const range = document.createRange()
      range.selectNodeContents(target)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }
}
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child @contextmenu="checkSelection">
      <div class="h-full w-full">
        <slot />
      </div>
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent
        class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 text-xs text-fg shadow-menu"
      >
        <!-- Cut / Copy -->
        <template v-if="hasSelection">
          <ContextMenuItem v-if="mode === 'edit'" :class="itemClass" @select="handleCut">
            <span>{{ t.cut }}</span>
            <span class="text-fg-faint text-[10px]">Ctrl+X</span>
          </ContextMenuItem>
          <ContextMenuItem :class="itemClass" @select="handleCopy">
            <span>{{ t.copy }}</span>
            <span class="text-fg-faint text-[10px]">Ctrl+C</span>
          </ContextMenuItem>

          <!-- Formatting shortcuts in Edit mode -->
          <template v-if="mode === 'edit' && view">
            <ContextMenuSeparator class="my-1 h-px bg-line" />
            <ContextMenuItem :class="itemClass" @select="toggleInlineMark(view, '**')">
              <span>{{ t.bold }}</span>
              <span class="text-fg-faint text-[10px]">Ctrl+B</span>
            </ContextMenuItem>
            <ContextMenuItem :class="itemClass" @select="toggleInlineMark(view, '*')">
              <span>{{ t.italic }}</span>
              <span class="text-fg-faint text-[10px]">Ctrl+I</span>
            </ContextMenuItem>
            <ContextMenuItem :class="itemClass" @select="toggleInlineMark(view, '')">
              <span>{{ t.inlineCode }}</span>
              <span class="text-fg-faint text-[10px]">Ctrl+`</span>
            </ContextMenuItem>
            <ContextMenuItem :class="itemClass" @select="insertLink(view)">
              <span>{{ t.link }}</span>
              <span class="text-fg-faint text-[10px]">Ctrl+K</span>
            </ContextMenuItem>
          </template>
        </template>

        <!-- No Selection: Paste / Select All -->
        <template v-else>
          <ContextMenuItem v-if="mode === 'edit'" :class="itemClass" @select="handlePaste">
            <span>{{ t.paste }}</span>
            <span class="text-fg-faint text-[10px]">Ctrl+V</span>
          </ContextMenuItem>
          <ContextMenuItem :class="itemClass" @select="handleSelectAll">
            <span>{{ t.selectAll }}</span>
            <span class="text-fg-faint text-[10px]">Ctrl+A</span>
          </ContextMenuItem>
        </template>

        <ContextMenuSeparator class="my-1 h-px bg-line" />

        <!-- Toggle View/Edit Mode -->
        <ContextMenuItem :class="itemClass" @select="tabsStore.toggleMode()">
          <span>{{ mode === 'edit' ? t.toView : t.toEdit }}</span>
          <span class="text-fg-faint text-[10px]">Ctrl+E</span>
        </ContextMenuItem>

        <!-- Reload Note -->
        <ContextMenuItem :class="itemClass" @select="tabsStore.reloadCurrentNote()">
          <span>{{ t.refreshNote }}</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
