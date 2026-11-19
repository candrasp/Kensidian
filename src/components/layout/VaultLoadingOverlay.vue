<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { t } from '@/lib/i18n/id'

defineProps<{
  visible: boolean
  vaultName?: string
}>()
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-200 flex flex-col items-center justify-center bg-app select-none cursor-wait"
    >
      <div class="flex flex-col items-center gap-3">
        <Loader2 class="h-6 w-6 animate-spin text-accent" />
        <div class="flex flex-col items-center gap-1">
          <p class="text-xs font-medium text-fg">
            {{ vaultName ?? t.loadingVault }}
          </p>
          <p class="text-[11px] text-fg-muted">
            {{ t.loadingVault }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
