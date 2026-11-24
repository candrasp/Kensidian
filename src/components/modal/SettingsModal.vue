<script setup lang="ts">
import { computed } from 'vue'
import { X, Moon, Sun, Monitor, Type, Layout, Palette } from 'lucide-vue-next'
import { useSettingsStore, type ColorScheme } from '@/stores/settings'
import { t } from '@/lib/i18n/id'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const settingsStore = useSettingsStore()
const current = computed(() => settingsStore.current)

const themeOptions = [
  { value: 'dark', label: t.themeDark, icon: Moon },
  { value: 'light', label: t.themeLight, icon: Sun },
  { value: 'system', label: t.themeSystem, icon: Monitor },
] as const

const schemeOptions: { value: ColorScheme; label: string }[] = [
  { value: 'nord', label: 'Nord Dark' },
  { value: 'onedark', label: 'One Dark' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'tokyonight', label: 'Tokyo Night' },
  { value: 'catppuccin', label: 'Catppuccin' },
  { value: 'sepia', label: 'Warm Sepia' },
]

const fontOptions = [
  { value: '', label: t.fontDefault },
  { value: '"Inter Variable", Inter, sans-serif', label: t.fontInter },
  { value: '"Plus Jakarta Sans", sans-serif', label: t.fontJakarta },
  { value: '"Source Sans 3", sans-serif', label: t.fontSourceSans },
  { value: 'Merriweather, Georgia, serif', label: t.fontSerif },
  { value: '"JetBrains Mono", monospace', label: t.fontMono },
]

const fontMonoOptions = [
  { value: '', label: t.fontDefault },
  { value: '"JetBrains Mono", monospace', label: t.fontMono },
  { value: '"Fira Code", Consolas, monospace', label: t.fontFira },
  { value: 'Consolas, "SF Mono", monospace', label: t.fontConsolas },
]

const modeOptions = [
  { value: 'view', label: t.defaultModeView },
  { value: 'edit', label: t.defaultModeEdit },
] as const
</script>

<template>
  <div
    class="fixed inset-0 z-100 flex items-center justify-center bg-scrim backdrop-blur-xs select-none p-4"
    @click.self="emit('close')"
  >
    <div class="flex flex-col w-full max-w-md rounded-lg border border-line bg-panel-alt shadow-modal overflow-hidden animate-in fade-in zoom-in-95 duration-100">
      <div class="flex items-center justify-between px-4 py-3 border-b border-line bg-panel">
        <h2 class="text-sm font-semibold text-fg">{{ t.settings }}</h2>
        <button
          type="button"
          class="h-6 w-6 rounded-sm flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg cursor-pointer transition-colors"
          @click="emit('close')"
        >
          <X class="h-4 w-4" :stroke-width="1.75" />
        </button>
      </div>

      <div class="p-4 flex flex-col gap-4 text-xs max-h-[75vh] overflow-y-auto">
        <!-- Tema Tampilan -->
        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg flex items-center gap-1.5">
            <Moon class="h-3.5 w-3.5 text-accent" :stroke-width="1.75" />
            {{ t.themeLabel }}
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              type="button"
              :class="[
                'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-sm border text-xs cursor-pointer transition-colors',
                current.theme === opt.value
                  ? 'border-accent bg-accent-soft text-fg font-medium'
                  : 'border-line bg-panel text-fg-muted hover:bg-hover hover:text-fg',
              ]"
              @click="settingsStore.update({ theme: opt.value })"
            >
              <component :is="opt.icon" class="h-3.5 w-3.5" :stroke-width="1.75" />
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Pilihan Skema Warna -->
        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg flex items-center gap-1.5">
            <Palette class="h-3.5 w-3.5 text-accent" :stroke-width="1.75" />
            {{ t.colorSchemeLabel }}
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in schemeOptions"
              :key="opt.value"
              type="button"
              :class="[
                'flex items-center justify-center py-1.5 px-2 rounded-sm border text-xs cursor-pointer transition-colors text-center',
                (current.colorScheme || 'nord') === opt.value
                  ? 'border-accent bg-accent-soft text-fg font-medium'
                  : 'border-line bg-panel text-fg-muted hover:bg-hover hover:text-fg',
              ]"
              @click="settingsStore.update({ colorScheme: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Pilihan Jenis Font Teks -->
        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg flex items-center gap-1.5">
            <Type class="h-3.5 w-3.5 text-accent" :stroke-width="1.75" />
            {{ t.fontFamilyLabel }}
          </label>
          <select
            class="bg-panel border border-line rounded-sm px-2.5 py-1.5 text-xs text-fg outline-none cursor-pointer hover:border-accent transition-colors"
            :value="current.fontText || ''"
            @change="settingsStore.update({ fontText: ($event.target as HTMLSelectElement).value || null })"
          >
            <option v-for="font in fontOptions" :key="font.value" :value="font.value" class="bg-panel-alt text-fg">
              {{ font.label }}
            </option>
          </select>
        </div>

        <!-- Pilihan Jenis Font Kode -->
        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg flex items-center gap-1.5">
            <Type class="h-3.5 w-3.5 text-accent" :stroke-width="1.75" />
            {{ t.fontMonoFamilyLabel }}
          </label>
          <select
            class="bg-panel border border-line rounded-sm px-2.5 py-1.5 text-xs text-fg outline-none cursor-pointer hover:border-accent transition-colors font-mono"
            :value="current.fontMono || ''"
            @change="settingsStore.update({ fontMono: ($event.target as HTMLSelectElement).value || null })"
          >
            <option v-for="font in fontMonoOptions" :key="font.value" :value="font.value" class="bg-panel-alt text-fg">
              {{ font.label }}
            </option>
          </select>
        </div>

        <!-- Mode Awal Catatan -->
        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg flex items-center gap-1.5">
            <Layout class="h-3.5 w-3.5 text-accent" :stroke-width="1.75" />
            {{ t.defaultNoteModeLabel }}
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in modeOptions"
              :key="opt.value"
              type="button"
              :class="[
                'flex items-center justify-center py-1.5 px-2 rounded-sm border text-xs cursor-pointer transition-colors',
                current.defaultNoteMode === opt.value
                  ? 'border-accent bg-accent-soft text-fg font-medium'
                  : 'border-line bg-panel text-fg-muted hover:bg-hover hover:text-fg',
              ]"
              @click="settingsStore.update({ defaultNoteMode: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Ukuran Font Teks -->
        <div class="flex items-center justify-between py-1">
          <span class="text-fg flex items-center gap-1.5">
            <Type class="h-3.5 w-3.5 text-accent" :stroke-width="1.75" />
            {{ t.fontSizeLabel }}
          </span>
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="13"
              max="20"
              :value="current.fontSize"
              class="w-24 accent-accent cursor-pointer"
              @input="settingsStore.update({ fontSize: Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="font-mono text-fg-muted w-8 text-right">{{ current.fontSize }}px</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
