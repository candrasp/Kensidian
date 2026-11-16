<script setup lang="ts">
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
} from 'reka-ui'

defineProps<{
  content?: string
}>()
</script>

<template>
  <TooltipProvider :delay-duration="500">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          v-if="content"
          side="bottom"
          :side-offset="4"
          class="z-120 rounded-sm border border-line bg-panel-alt px-2 py-1 text-xs text-fg shadow-menu"
        >
          {{ content }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
