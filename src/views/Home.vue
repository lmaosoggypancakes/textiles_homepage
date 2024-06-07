<template>
  <main class="h-full flex flex-col items-center justify-center">
    <div class="border-2 rounded-lg p-8 border-foam flex flex-col justify-center items-center hover:bg-surface transition-all cursor-pointer" @click="startFileUpload" :class="loading && 'hover:cursor-not-allowed hover:border-surface hover:bg-base border-surface'">
      <FolderArrowDownIcon  class="w-24 h-24 text-text" v-if="!loading"/>
      <span v-if="!loading" class="text-text">Upload your netlist file</span>
      <ArrowPathIcon class="w-24 h-24 animate-spin text-text" v-else />
      <input type="file" class="hidden" ref="fileUpload" @change="filePicked"/>
      <pre class="bg-base">{{ fileName }}</pre>
    </div>
    <span>{{ statusMessage }}</span>
  </main>
</template>

<script setup lang="ts">
import { FolderArrowDownIcon, ArrowPathIcon } from "@heroicons/vue/24/outline"
import { ref } from "vue";
import { type Netlist } from "@/../types"
import axios, { AxiosError, type AxiosResponse } from "axios"
import { useRouter } from "vue-router";

const router = useRouter()

const loading = ref(false)
const fileName = ref("")
const statusMessage = ref("")
const fileUpload = ref<HTMLInputElement | null>(null)

const startFileUpload = () => {
  if (fileUpload.value && !loading.value) {
    fileUpload.value.click()
  }
}

const filePicked = (event: Event) => {
  loading.value = true
  const target = event.target as HTMLInputElement
  if (target == null || target.files == null) {
    alert("Error: bad event")
    return
  }
  const file = target.files[0]
  fileName.value = file.name
  console.log(file)
  const reader = new FileReader()
  statusMessage.value = "reading file..."
  reader.readAsText(file);

  reader.onload = async () => {
    statusMessage.value = ""
    const data = reader.result;
    loading.value = false
    if (data == null) {
      alert("data is null. tell josef pls")
      return;
    }
    await parseFile(data as string)
  };

  reader.onerror = () => {
    console.log(reader.error);
  };
}

const parseFile = async (data: string) => {
  statusMessage.value = "parsing and verifying netlist..."
  // https://api.stretchy.soggypancakes.tech/parse
  const response: void | AxiosResponse = await axios.post("https://stretch.up.railway.app/parse", {
    data
  }).catch((reason: AxiosError) => {
    console.log(reason)
    if(reason.response?.status == 400) {
      statusMessage.value = (reason.response?.data as any).detail || "unknown error. tell josef pls :("; // i hate this
    }
    if (reason.response?.status == 500) {
      statusMessage.value = "Internal server error </3"
    }
  })
  if(response) {
    const netlist = response.data
    router.push(`/session/?netlist=${encodeURIComponent(JSON.stringify(netlist))}`)
  }
}
</script>