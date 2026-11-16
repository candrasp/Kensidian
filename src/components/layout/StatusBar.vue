<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { t } from '@/lib/i18n/id'
import Tooltip from '@/components/ui/Tooltip.vue'

const props = defineProps<{
  wordCount?: number
  charCount?: number
  backlinksCount?: number
  visible?: boolean
}>()

const vaultStore = useVaultStore()

const wordsText = computed(() => t.words(props.wordCount ?? 0))
const charsText = computed(() => t.chars(props.charCount ?? 0))
const backlinksText = computed(() => t.backlinks(props.backlinksCount ?? 0))
const watchingTooltip = computed(() =>
  vaultStore.watching ? t.watchingActive : t.watchingInactive
)
</script>

<template>
  <div
    v-if="visible"
    class="absolute right-3 bottom-2 z-30 select-none pointer-events-none text-[11px] text-fg-muted font-mono"
  >
    {{ wordsText }}
  </div>
</template>
