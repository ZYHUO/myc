import { ref } from 'vue'
import { useClipboard as useVueClipboard } from '@vueuse/core'

export function useClipboard() {
  const { copy: rawCopy, copied: rawCopied } = useVueClipboard()
  const copied = ref(false)

  async function copy(text: string) {
    await rawCopy(text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }

  return { copy, copied }
}
