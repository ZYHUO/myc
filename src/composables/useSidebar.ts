import { ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'

const isOpen = ref(true)

export function useSidebar() {
  const isLargeScreen = useMediaQuery('(min-width: 1024px)')

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function close() {
    isOpen.value = false
  }

  // On small screens, default to closed
  if (!isLargeScreen.value) {
    isOpen.value = false
  }

  return { isOpen, toggle, close, isLargeScreen }
}
