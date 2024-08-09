<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  setStretchification: [stretchification: number];
  setStretchDepth: [depth: number];
  setTime: [time: number];
  resetConstraints: [];
}>();
</script>

<template>
  <div
    class="absolute left-0 w-1/4 h-full bg-surface transition-all rounded-bl-md z-10 flex flex-col"
  >
    <div class="px-12 py-8 text-text grow">
      <p class="text-2xl font-bold">Configuration</p>
      <span>Stretchification</span>
      <input
        type="range"
        min="1"
        max="100"
        value="2"
        class="w-full"
        @input="(event: Event) => emit('setStretchification', Number((event.target as HTMLInputElement).value))"
      />

      <span>y/w Ratio</span>
      <input
        type="range"
        min="1"
        max="30"
        value="11"
        class="w-full"
        @input="(event: Event) => emit('setStretchDepth', Number((event.target as HTMLInputElement).value))"
      />

      <span>Time</span>
      <input
        type="range"
        min="0"
        max="100"
        value="0"
        class="w-full"
        @input="(event: Event) => emit('setTime', Number((event.target as HTMLInputElement).value))"
      />

      <div class="absolute bottom-2 space-y-2">
        <Button @click="emit('resetConstraints')">Clear Constraints</Button>
      </div>
    </div>
  </div>
</template>
