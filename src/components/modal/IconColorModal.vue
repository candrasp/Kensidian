<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, RotateCcw, Search } from 'lucide-vue-next'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { ItemStyle, IconColor, IconRef } from '@/lib/ipc/types'
import { LUCIDE_ICONS, FA_BRAND_ICONS, COLOR_OPTIONS, COLOR_MAP } from '@/lib/icons'
import { t } from '@/lib/i18n/id'

const props = defineProps<{
  open: boolean
  path: string
  kind: 'file' | 'folder'
  currentStyle?: ItemStyle
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', style: ItemStyle | null): void
}>()

const searchQuery = ref('')
const activeTab = ref<'all' | 'lucide' | 'brands'>('all')
const selectedColor = ref<IconColor | undefined>(props.currentStyle?.color)
const selectedIcon = ref<IconRef | undefined>(props.currentStyle?.icon)

const filteredLucide = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const keys = Object.keys(LUCIDE_ICONS)
  const matched = !q ? keys : keys.filter((k) => k.toLowerCase().includes(q))
  return matched.slice(0, 160) // Batasi agar render tetap secepat kilat
})

const filteredBrands = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const keys = Object.keys(FA_BRAND_ICONS)
  const matched = !q ? keys : keys.filter((k) => k.toLowerCase().includes(q))
  return matched.slice(0, 160)
})

function toggleColor(c: IconColor) {
  selectedColor.value = selectedColor.value === c ? undefined : c
}

function selectIcon(set: 'lucide' | 'fa-brands', name: string) {
  if (selectedIcon.value?.set === set && selectedIcon.value.name === name) {
    selectedIcon.value = undefined
  } else {
    selectedIcon.value = { set, name }
  }
}

function handleReset() {
  selectedColor.value = undefined
  selectedIcon.value = undefined
  emit('save', null)
  emit('close')
}

function handleApply() {
  if (!selectedColor.value && !selectedIcon.value) emit('save', null)
  else emit('save', { color: selectedColor.value, icon: selectedIcon.value })
  emit('close')
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-120 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
    <div class="flex flex-col w-full max-w-xl h-[540px] rounded-lg border border-line bg-panel-alt shadow-2xl overflow-hidden text-xs text-fg">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-line bg-panel">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-fg">{{ t.iconColorTitle }}</span>
          <span class="text-fg-faint">•</span>
          <span class="text-fg-muted truncate max-w-xs font-mono text-[11px]">{{ path }}</span>
        </div>
        <button type="button" class="h-6 w-6 rounded flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg cursor-pointer transition-colors" @click="emit('close')">
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Controls: Color & Search -->
      <div class="p-4 border-b border-line bg-panel/40 flex flex-col gap-3">
        <!-- Palette Bar -->
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">{{ t.accentColor }}</span>
          <div class="flex items-center gap-1.5">
            <button
              v-for="c in COLOR_OPTIONS"
              :key="c.name"
              type="button"
              :style="{ backgroundColor: c.cssVar }"
              :class="[
                'h-5 w-5 rounded-full cursor-pointer transition-transform duration-100 border',
                selectedColor === c.name ? 'ring-2 ring-accent scale-110 border-white' : 'border-black/20 hover:scale-105',
              ]"
              @click="toggleColor(c.name)"
            />
          </div>
        </div>

        <!-- Search & Tab Filter -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-faint" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t.searchIconPlaceholder"
              class="w-full bg-panel border border-line rounded px-8 py-1.5 text-xs text-fg outline-none focus:border-accent transition-colors"
            />
          </div>
          <div class="flex rounded border border-line bg-panel p-0.5">
            <button
              type="button"
              :class="['px-2.5 py-1 rounded text-xs transition-colors cursor-pointer', activeTab === 'all' ? 'bg-hover text-fg font-medium' : 'text-fg-muted hover:text-fg']"
              @click="activeTab = 'all'"
            >
              {{ t.iconTabAll }}
            </button>
            <button
              type="button"
              :class="['px-2.5 py-1 rounded text-xs transition-colors cursor-pointer', activeTab === 'lucide' ? 'bg-hover text-fg font-medium' : 'text-fg-muted hover:text-fg']"
              @click="activeTab = 'lucide'"
            >
              {{ t.iconTabLucide }}
            </button>
            <button
              type="button"
              :class="['px-2.5 py-1 rounded text-xs transition-colors cursor-pointer', activeTab === 'brands' ? 'bg-hover text-fg font-medium' : 'text-fg-muted hover:text-fg']"
              @click="activeTab = 'brands'"
            >
              {{ t.iconTabBrands }}
            </button>
          </div>
        </div>
      </div>

      <!-- Icon Grid Area -->
      <div class="flex-1 overflow-y-auto p-4 grid grid-cols-8 gap-2 content-start">
        <!-- Lucide Icons -->
        <template v-if="activeTab !== 'brands'">
          <button
            v-for="name in filteredLucide"
            :key="'lucide-' + name"
            type="button"
            :class="[
              'h-11 w-11 rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors border',
              selectedIcon?.set === 'lucide' && selectedIcon.name === name
                ? 'bg-accent/20 border-accent ring-1 ring-accent'
                : 'border-transparent text-fg-muted hover:bg-hover hover:text-fg',
            ]"
            :style="selectedIcon?.set === 'lucide' && selectedIcon.name === name && selectedColor ? { color: COLOR_MAP[selectedColor] } : {}"
            :title="name"
            @click="selectIcon('lucide', name)"
          >
            <component :is="LUCIDE_ICONS[name]" class="h-4 w-4" :stroke-width="1.75" />
          </button>
        </template>

        <!-- Brand Icons -->
        <template v-if="activeTab !== 'lucide'">
          <button
            v-for="name in filteredBrands"
            :key="'fa-' + name"
            type="button"
            :class="[
              'h-11 w-11 rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors border',
              selectedIcon?.set === 'fa-brands' && selectedIcon.name === name
                ? 'bg-accent/20 border-accent ring-1 ring-accent'
                : 'border-transparent text-fg-muted hover:bg-hover hover:text-fg',
            ]"
            :style="selectedIcon?.set === 'fa-brands' && selectedIcon.name === name && selectedColor ? { color: COLOR_MAP[selectedColor] } : {}"
            :title="name"
            @click="selectIcon('fa-brands', name)"
          >
            <FontAwesomeIcon :icon="FA_BRAND_ICONS[name]" class="text-lg" />
          </button>
        </template>
      </div>

      <!-- Footer Bar -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-line bg-panel">
        <button
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-danger hover:bg-danger/10 transition-colors cursor-pointer"
          @click="handleReset"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          {{ t.resetDefault }}
        </button>
        <div class="flex items-center gap-2">
          <button type="button" class="px-3.5 py-1.5 rounded text-xs text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer" @click="emit('close')">
            {{ t.cancel }}
          </button>
          <button type="button" class="px-4 py-1.5 rounded bg-accent text-xs font-medium text-white hover:bg-accent/90 transition-colors cursor-pointer" @click="handleApply">
            {{ t.apply }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
