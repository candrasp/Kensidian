<script setup lang="ts">
import { computed } from 'vue'
import { Folder, FileText } from 'lucide-vue-next'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { ItemStyle } from '@/lib/ipc/types'
import { LUCIDE_ICONS, FA_BRAND_ICONS, COLOR_MAP } from '@/lib/icons'

const props = defineProps<{
  kind: 'file' | 'folder'
  styleConfig?: ItemStyle
}>()

const isFaBrand = computed(() => {
  return props.styleConfig?.icon?.set === 'fa-brands'
})

const faIconDef = computed(() => {
  const name = props.styleConfig?.icon?.name
  return name ? FA_BRAND_ICONS[name] : null
})

const lucideComp = computed(() => {
  const iconRef = props.styleConfig?.icon
  if (iconRef?.set === 'lucide' && iconRef.name && LUCIDE_ICONS[iconRef.name]) {
    return LUCIDE_ICONS[iconRef.name]
  }
  return props.kind === 'folder' ? Folder : FileText
})

const iconStyle = computed(() => {
  const c = props.styleConfig?.color
  if (!c || !COLOR_MAP[c]) return {}
  return { color: COLOR_MAP[c] }
})
</script>

<template>
  <FontAwesomeIcon
    v-if="isFaBrand && faIconDef"
    :icon="faIconDef"
    :style="iconStyle"
    :class="['h-3.5 w-3.5 shrink-0 transition-colors duration-100', !styleConfig?.color ? 'text-fg-muted' : '']"
  />
  <component
    :is="lucideComp"
    v-else
    :style="iconStyle"
    :class="['h-3.5 w-3.5 shrink-0 transition-colors duration-100', !styleConfig?.color ? 'text-fg-muted' : '']"
    :stroke-width="1.75"
  />
</template>
