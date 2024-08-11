import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useNetlistStore = defineStore('netlist', () => {
  const netlist = ref("")
  const setNetlist = (n: string) => netlist.value = n
  return { netlist, setNetlist }
})
