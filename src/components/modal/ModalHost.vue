<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import QuickSwitcher from '@/components/modal/QuickSwitcher.vue'
import SettingsModal from '@/components/modal/SettingsModal.vue'
import HelpModal from '@/components/modal/HelpModal.vue'
import SearchModal from '@/components/modal/SearchModal.vue'

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
    <HelpModal
      v-else-if="uiStore.modal === 'help'"
      @close="closeModal"
    />
    <SearchModal
      v-else-if="uiStore.modal === 'search'"
      @close="closeModal"
    />
  </Teleport>
</template>
