<script setup lang="ts">
import { ref } from 'vue'
import {
  X,
  HelpCircle,
  Keyboard,
  FileText,
  ExternalLink,
  RefreshCw,
  Download,
} from 'lucide-vue-next'
import { openUrl } from '@tauri-apps/plugin-opener'
import { t } from '@/lib/i18n/id'
import { APP_NAME, APP_VERSION, APP_GITHUB_URL } from '@/lib/constants'
import { useUpdater } from '@/composables/useUpdater'
import { useToastStore } from '@/stores/toast'

defineEmits<{
  (e: 'close'): void
}>()

const activeTab = ref<'about' | 'shortcuts' | 'markdown'>('about')
const updater = useUpdater()
const toastStore = useToastStore()

const shortcuts = [
  { key: 'Ctrl + N', desc: 'Catatan baru di folder aktif' },
  { key: 'Ctrl + T', desc: 'Buka tab baru' },
  { key: 'Ctrl + W', desc: 'Tutup tab aktif' },
  { key: 'Ctrl + B', desc: 'Tampilkan / sembunyikan sidebar kiri' },
  { key: 'Ctrl + Alt + \\', desc: 'Tampilkan / sembunyikan outline kanan' },
  { key: 'Ctrl + E', desc: 'Beralih antara mode Tulis (Edit) & Baca (View)' },
  { key: 'Ctrl + Shift + C', desc: 'Salin seluruh isi catatan aktif (AI Agent ready)' },
  { key: 'Ctrl + Shift + F', desc: 'Pencarian global di semua catatan (Find in Files)' },
  { key: 'Ctrl + Shift + T', desc: 'Tampilkan / sembunyikan format toolbar' },
  { key: 'Ctrl + O', desc: 'Quick Switcher (cari & lompat antar catatan)' },
  { key: 'Ctrl + ,', desc: 'Buka pengaturan aplikasi' },
  { key: 'F2', desc: 'Ganti nama file / folder di sidebar' },
  { key: 'Delete', desc: 'Hapus file / folder terpilih ke Trash' },
]

const mdTips = [
  { syntax: '# Heading 1 ... ###### Heading 6', desc: 'Judul dokumen & sub-bagian' },
  { syntax: '**teks tebal** dan *teks miring*', desc: 'Penekanan teks inline' },
  { syntax: '- [ ] Tugas baru / - [x] Selesai', desc: 'Daftar tugas interaktif (bisa diklik di mode View)' },
  { syntax: '[[Nama Catatan]]', desc: 'Tautan internal (WikiLinks) ke catatan lain' },
  { syntax: '#ff4400 atau rgb(255, 68, 0)', desc: 'Auto-deteksi swatch warna (hover pratinjau, klik salin)' },
  { syntax: '```rust / ```js', desc: 'Blok kode dengan tombol salin instan' },
]

async function handleCheckUpdate() {
  if (updater.isChecking.value || updater.isDownloading.value) return

  const update = await updater.checkForUpdate()
  if (!update) {
    toastStore.success(t.upToDate)
  }
}

async function handleDownloadUpdate() {
  try {
    await updater.downloadAndInstall()
  } catch (error) {
    toastStore.error(t.updateError)
  }
}

async function openGithub() {
  await openUrl(APP_GITHUB_URL)
}
</script>

<template>
  <div class="fixed inset-0 z-150 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4 animate-in fade-in duration-100">
    <div
      class="relative flex flex-col w-full max-w-xl h-[520px] rounded-lg border border-line bg-panel shadow-modal overflow-hidden text-fg"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-line bg-panel-alt/50 shrink-0">
        <div class="flex items-center gap-2">
          <HelpCircle class="h-4 w-4 text-accent" />
          <h2 class="text-sm font-semibold tracking-wide">{{ t.helpAndAbout }}</h2>
        </div>
        <button
          type="button"
          class="h-7 w-7 rounded-sm flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none"
          @click="$emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-line bg-panel px-4 gap-4 text-xs font-medium shrink-0">
        <button
          type="button"
          :class="[
            'py-2.5 border-b-2 transition-colors cursor-pointer outline-none flex items-center gap-1.5',
            activeTab === 'about' ? 'border-accent text-accent' : 'border-transparent text-fg-muted hover:text-fg',
          ]"
          @click="activeTab = 'about'"
        >
          <HelpCircle class="h-3.5 w-3.5" />
          {{ t.aboutApp }}
        </button>
        <button
          type="button"
          :class="[
            'py-2.5 border-b-2 transition-colors cursor-pointer outline-none flex items-center gap-1.5',
            activeTab === 'shortcuts' ? 'border-accent text-accent' : 'border-transparent text-fg-muted hover:text-fg',
          ]"
          @click="activeTab = 'shortcuts'"
        >
          <Keyboard class="h-3.5 w-3.5" />
          {{ t.keyboardShortcuts }}
        </button>
        <button
          type="button"
          :class="[
            'py-2.5 border-b-2 transition-colors cursor-pointer outline-none flex items-center gap-1.5',
            activeTab === 'markdown' ? 'border-accent text-accent' : 'border-transparent text-fg-muted hover:text-fg',
          ]"
          @click="activeTab = 'markdown'"
        >
          <FileText class="h-3.5 w-3.5" />
          {{ t.markdownGuide }}
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-4 text-xs">
        <!-- Tab 1: About -->
        <div v-if="activeTab === 'about'" class="flex flex-col items-center justify-between h-full py-4 text-center">
          <div class="flex flex-col items-center space-y-3">
            <img src="/logo.png" alt="Logo" class="h-14 w-14 rounded-lg drop-shadow-sm" />
            <div>
              <h3 class="text-sm font-bold text-fg">{{ APP_NAME }}</h3>
              <p class="text-fg-muted text-[11px] mt-0.5">Version {{ APP_VERSION }}</p>
            </div>

            <p class="text-xs text-fg-muted text-center max-w-sm mt-4 leading-relaxed">
              Aplikasi catatan Markdown ringan bergaya Obsidian. Tulis, kelola, dan atur catatan Anda dengan mudah.
            </p>

            <div class="text-[11px] text-fg-faint mt-3 space-y-0.5">
              <p>Dibuat dengan Vue 3 · Tauri 2 · TypeScript</p>
            </div>

            <!-- Minimalist Update & Github Actions -->
            <div class="flex items-center gap-2 pt-1 text-xs">
              <button
                v-if="!updater.availableVersion"
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-line bg-panel-alt hover:bg-hover text-fg transition-colors cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="updater.isChecking"
                @click="handleCheckUpdate"
              >
                <RefreshCw :class="['h-3 w-3', updater.isChecking ? 'animate-spin text-accent' : 'text-fg-muted']" />
                <span>{{ updater.isChecking ? t.checkingUpdate : t.checkUpdate }}</span>
              </button>

              <button
                v-else
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-accent bg-accent/10 hover:bg-accent/20 text-accent transition-colors cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="updater.isDownloading"
                @click="handleDownloadUpdate"
              >
                <Download v-if="!updater.isDownloading" class="h-3 w-3" />
                <RefreshCw v-else class="h-3 w-3 animate-spin" />
                <span v-if="!updater.isDownloading">{{ t.updateVersion(updater.availableVersion!) }}</span>
                <span v-else>{{ t.downloading }} {{ updater.downloadProgress }}%</span>
              </button>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-line bg-panel-alt hover:bg-hover text-fg-muted hover:text-fg transition-colors cursor-pointer outline-none"
                @click="openGithub"
              >
                <ExternalLink class="h-3 w-3" />
                <span>GitHub</span>
              </button>
            </div>
          </div>

          <div class="text-[11px] text-fg-faint border-t border-line/60 pt-3 w-full">
            <p>{{ t.copyrightText }}</p>
          </div>
        </div>

        <!-- Tab 2: Shortcuts -->
        <div v-else-if="activeTab === 'shortcuts'" class="space-y-2">
          <div
            v-for="item in shortcuts"
            :key="item.key"
            class="flex items-center justify-between py-1.5 px-2.5 rounded-sm bg-panel-alt/60 hover:bg-panel-alt border border-line/50"
          >
            <span class="text-fg-muted text-xs">{{ item.desc }}</span>
            <kbd class="px-2 py-0.5 rounded bg-app border border-line text-[11px] font-mono text-accent font-semibold shadow-xs">
              {{ item.key }}
            </kbd>
          </div>
        </div>

        <!-- Tab 3: Markdown Guide -->
        <div v-else class="space-y-2.5">
          <div
            v-for="item in mdTips"
            :key="item.desc"
            class="p-2.5 rounded-sm bg-panel-alt/60 border border-line/50 space-y-1"
          >
            <div class="font-medium text-fg">{{ item.desc }}</div>
            <code class="block font-mono text-xs text-accent bg-app px-2 py-1 rounded border border-line select-text">
              {{ item.syntax }}
            </code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
