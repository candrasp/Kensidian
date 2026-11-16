<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import QuickSwitcher from '@/components/modal/QuickSwitcher.vue'
import SettingsModal from '@/components/modal/SettingsModal.vue'

const uiStore = useUiStore()

function closeModal() {
  uiStore.modal = null
}
</script>

<template>
  <Teleport to="body">
    <QuickSwitcher
      v-if="uiStore.modal === 'quick-switcher'"
      @close="closeModal"
    />
    <SettingsModal
      v-else-if="uiStore.modal === 'settings'"
      @close="closeModal"
    />
  </Teleport>
</template>
