<template>
    <nav class="text-text flex flex-col justify-center h-16 items-center">
        <div class="w-2/3 flex items-center text-2xl font-bold gap-x-2">
            <BoltIcon class="h-12 w-12 font-normal text-rose" />
            <span>Circuit Stretchification Machine</span>
            <ul class="ml-auto list-none flex space-x-4">
                <li><a class="hover:bg-text hover:text-surface" href="https://soggypancakes.tech">Home</a></li>
                <li><a class="hover:bg-text hover:text-surface" href="https://github.com/lmaosoggypancakes/textiles_app">GitHub</a></li>
            </ul>
        </div>
    </nav>
    <div class="border-b-2 border-highlight my-4"></div>
</template>
<script setup lang="ts">
import { BoltIcon } from '@heroicons/vue/24/solid';
</script>