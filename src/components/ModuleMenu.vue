<script setup lang="ts">
import {
  ArrowPathIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ArrowsUpDownIcon,
  PencilIcon,
  SquaresPlusIcon,
} from "@heroicons/vue/24/outline";
import type { Position } from "types";
import { ref } from "vue";

const emit = defineEmits<{
  editModule: [];
  move: [];
  rotate: [];
  moveLayer: [];
  mergeModules: [];
  changeRadius: [number];
}>();
const props = defineProps<{
  pos: Position;
  moduleRef: string;
  moduleRadius: number;
}>();
const status = ref<"menu" | "changeRadius">("menu");
const radius = ref<number>(props.moduleRadius / 5);
const changeRadiusHandler = () => {
  status.value = "changeRadius";
};
const okHandler = () => {
  status.value = "menu";
  emit("changeRadius", radius.value * 5);
};
const cancelHandler = () => {
  status.value = "menu";
};
</script>

<template>
  <div
    class="absolute bg-[#1f1d2e] transition-all rounded-bl-md z-10 w-1/6 flex flex-col shadow-md"
    :style="{
      left: props.pos.x + 'px',
      top: props.pos.y + 'px',
      display: status == 'menu' ? 'block' : 'none',
    }"
  >
    <div class="text-white text-base p-2 pb-1 font-bold">
      {{ props.moduleRef }}
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
        @click="() => emit('rotate')"
      >
        <ArrowPathIcon class="w-4 h-4 my-auto mr-2 rotate-45" />Rotate
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
      <div
        class="text-white text-base px-2 py-1 flex flex-row hover:cursor-pointer hover:bg-[#2f2d3e]"
        @click="changeRadiusHandler"
      >
        <ArrowsPointingInIcon class="w-4 h-4 my-auto mr-2" />Change Radius
      </div>
    </div>
  </div>
  <div
    class="absolute bg-[#1f1d2e] transition-all rounded-bl-md z-10 w-1/6 flex flex-col shadow-md"
    :style="{
      left: props.pos.x + 'px',
      top: props.pos.y + 'px',
      display: status == 'changeRadius' ? 'block' : 'none',
    }"
  >
    <div class="text-white text-base p-2 pb-1 font-bold">Change Radius</div>
    <hr />
    <div class="flex flex-row items-center">
      <input
        class="text-white text-base bg-transparent border-white border-solid border-2 rounded-md outline-none mx-2 my-1 px-2 py-1 w-16"
        type="number"
        v-model="radius"
      />
      <div class="h-full text-white text-base">mm</div>
    </div>
    <div class="flex flex-row justify-center px-2 py-1">
      <div
        class="text-[#1f1d2e] text-base bg-white px-2 mx-2 rounded-md hover:cursor-pointer"
        @click="okHandler"
      >
        Change
      </div>
      <div
        class="text-white text-base border-white border-solid border-2 rounded-md px-2 hover:cursor-pointer"
        @click="cancelHandler"
      >
        Cancel
      </div>
    </div>
  </div>
</template>
