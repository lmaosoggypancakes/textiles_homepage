<script setup lang="ts">
import {
  ArrowsPointingOutIcon,
  ArrowsUpDownIcon,
  PencilIcon,
  RectangleGroupIcon,
  SquaresPlusIcon,
} from "@heroicons/vue/24/outline";
import type { Position } from "types";

const emit = defineEmits<{
  editModule: [];
  move: [];
  moveLayer: [];
  mergeModules: [];
}>();
const props = defineProps<{
  pos: Position;
  module_ref: string;
}>();
console.log(props);
</script>

<template>
  <div
    class="absolute bg-[#1f1d2e] transition-all rounded-bl-md z-10 w-1/6 flex flex-col shadow-md"
    :style="{
      left: props.pos.x + 'px',
      top: props.pos.y + 'px',
    }"
  >
    <div class="text-white text-base p-2 pb-1 font-bold">
      {{ props.module_ref }}
    </div>
    <hr />
    <div class="divide-y divide-[#2f2d3e]">
      <div
        class="text-white text-base px-2 py-1 flex flex-row hover:cursor-pointer hover:bg-[#2f2d3e]"
        @click="() => emit('editModule')"
      >
        <PencilIcon class="w-4 h-4 my-auto mr-2" />Edit Module
      </div>
      <div
        class="text-white text-base px-2 py-1 flex flex-row hover:cursor-pointer hover:bg-[#2f2d3e]"
        @click="() => emit('move')"
      >
        <ArrowsPointingOutIcon class="w-4 h-4 my-auto mr-2 rotate-45" />Move
      </div>
      <div
        class="text-white text-base px-2 py-1 flex flex-row hover:cursor-pointer hover:bg-[#2f2d3e]"
        @click="() => emit('moveLayer')"
      >
        <ArrowsUpDownIcon class="w-4 h-4 my-auto mr-2" />Move Layer
      </div>
      <div
        class="text-white text-base px-2 py-1 flex flex-row hover:cursor-pointer hover:bg-[#2f2d3e]"
        @click="() => emit('mergeModules')"
      >
        <SquaresPlusIcon class="w-4 h-4 my-auto mr-2" />Merge Modules
      </div>
    </div>
  </div>
</template>
