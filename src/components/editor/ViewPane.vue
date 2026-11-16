<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { renderMarkdown } from '@/lib/markdown/render'
import { toggleTaskInContent } from '@/lib/markdown/taskList'
import { ipc } from '@/lib/ipc'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { useToastStore } from '@/stores/toast'
import { t } from '@/lib/i18n/id'

const props = defineProps<{
  content: string
  path: string
}>()

const tabsStore = useTabsStore()
const vaultStore = useVaultStore()
const toastStore = useToastStore()
const containerEl = ref<HTMLDivElement | null>(null)

// State Floating Popover Swatch Global
const hoverColor = ref<string | null>(null)
const popoverPos = ref<{ x: number; y: number; placeAbove: boolean }>({ x: 0, y: 0, placeAbove: true })

const rendered = computed(() => renderMarkdown(props.content, vaultStore.current?.path))

function restoreScroll() {
  nextTick(() => {
    if (containerEl.value && tabsStore.activeTab) {
      containerEl.value.scrollTop = tabsStore.activeTab.scrollTop
    }
  })
}

function handleScroll() {
  if (containerEl.value) tabsStore.setScrollTop(containerEl.value.scrollTop)
  hoverColor.value = null
}

watch(() => props.path, restoreScroll)
onMounted(restoreScroll)

async function copyCode(button: HTMLElement) {
  const block = button.closest('.code-block')
  const codeEl = block?.querySelector('pre code')
  if (!codeEl) return
  const text = codeEl.textContent ?? ''
  try {
    await navigator.clipboard.writeText(text)
    button.classList.add('copied')
    toastStore.success(t.codeCopied)
    setTimeout(() => button.classList.remove('copied'), 1500)
  } catch {
    toastStore.error('Gagal menyalin kode')
  }
}

function togglePreview(btn: HTMLElement) {
  const block = btn.closest<HTMLElement>('.code-block--previewable')
  if (!block) return
  const target = btn.dataset.target as 'code' | 'preview'
  const codePanEl = block.querySelector<HTMLElement>('.code-pane')
  const previewPanEl = block.querySelector<HTMLElement>('.preview-pane')
  const allBtns = block.querySelectorAll<HTMLElement>('.code-preview-btn')
  allBtns.forEach((b) => b.classList.toggle('active', b === btn))
  if (target === 'preview') {
    codePanEl?.setAttribute('hidden', '')
    previewPanEl?.removeAttribute('hidden')
  } else {
    previewPanEl?.setAttribute('hidden', '')
    codePanEl?.removeAttribute('hidden')
  }
}

function toggleCheckerboard(btn: HTMLElement) {
  const block = btn.closest<HTMLElement>('.code-block--previewable')
  if (!block) return
  const inner = block.querySelector<HTMLElement>('.preview-inner')
  if (!inner) return
  const on = inner.classList.toggle('preview-inner--checker')
  btn.classList.toggle('active', on)
}

function handleMouseOver(event: MouseEvent) {
  const swatchEl = (event.target as HTMLElement | null)?.closest('.color-swatch') as HTMLElement | null
  if (swatchEl) {
    const color = swatchEl.dataset.color
    if (!color) return
    const rect = swatchEl.getBoundingClientRect()
    const placeAbove = rect.top >= 110
    popoverPos.value = {
      x: rect.left + rect.width / 2,
      y: placeAbove ? rect.top - 8 : rect.bottom + 8,
      placeAbove,
    }
    hoverColor.value = color
  } else {
    hoverColor.value = null
  }
}

function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return

  const checkbox = target.closest('.task-checkbox') as HTMLElement | null
  if (checkbox) {
    event.preventDefault()
    event.stopPropagation()
    const lineAttr = checkbox.dataset.line
    if (lineAttr) {
      const lineIdx = parseInt(lineAttr, 10)
      const newContent = toggleTaskInContent(props.content, lineIdx)
      if (newContent !== props.content) {
        tabsStore.activeContent = newContent
        const expectedMtime = tabsStore.activeTab?.mtime ?? 0
        ipc.noteWrite(props.path, newContent, expectedMtime).then((res) => {
          if (tabsStore.activeTab?.path === props.path) tabsStore.activeTab.mtime = res.mtime
        }).catch(() => {})
      }
    }
    return
  }

  const copyBtn = target.closest('.code-copy-btn') as HTMLElement | null
  if (copyBtn) {
    event.preventDefault()
    copyCode(copyBtn)
    return
  }

  const previewToggleBtn = target.closest('.code-preview-btn') as HTMLElement | null
  if (previewToggleBtn) {
    event.preventDefault()
    togglePreview(previewToggleBtn)
    return
  }

  const checkerBtn = target.closest('.code-checker-btn') as HTMLElement | null
  if (checkerBtn) {
    event.preventDefault()
    toggleCheckerboard(checkerBtn)
    return
  }

  const swatchEl = target.closest('.color-swatch') as HTMLElement | null
  if (swatchEl?.dataset.color) {
    event.preventDefault()
    event.stopPropagation()
    const color = swatchEl.dataset.color
    navigator.clipboard.writeText(color).then(() => {
      toastStore.success(`Warna ${color} disalin!`)
    }).catch(() => {})
    return
  }

  const link = target.closest('a')
  if (!link) return

  if (link.classList.contains('internal-link')) {
    event.preventDefault()
    const href = link.dataset.href
    if (href) tabsStore.openPath(href.endsWith('.md') ? href : `${href}.md`)
  } else if (link.href && (link.href.startsWith('http://') || link.href.startsWith('https://'))) {
    event.preventDefault()
    import('@tauri-apps/plugin-opener').then(({ openUrl }) => {
      openUrl(link.href)
    }).catch(() => window.open(link.href, '_blank'))
  }
}
</script>

<template>
  <div
    ref="containerEl"
    class="h-full w-full overflow-y-auto px-8 pt-4 pb-12"
    @scroll.passive="handleScroll"
    @mouseover="handleMouseOver"
    @mouseleave="hoverColor = null"
  >
    <div
      class="view-content mx-auto w-full max-w-(--file-line-width)"
      v-html="rendered.html"
      @click="handleClick"
    />

    <!-- Global Floating Swatch Card Popover (Teleport-like fixed popup) -->
    <div
      v-if="hoverColor"
      class="fixed pointer-events-none z-1000 flex flex-col items-center gap-1.5 rounded-lg border border-line bg-panel p-2 shadow-2xl transition-all duration-150"
      :style="{
        left: `${popoverPos.x}px`,
        top: `${popoverPos.y}px`,
        transform: popoverPos.placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }"
    >
      <div
        class="h-14 w-14 rounded-md border border-white/20 shadow-inner"
        :style="{ backgroundColor: hoverColor }"
      />
      <span class="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-fg select-none">
        {{ hoverColor }}
      </span>
    </div>
  </div>
</template>
