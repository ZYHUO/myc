import { ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'

// Module-level state: the sidebar is a single global instance shared across views.
const isOpen = ref(true)
let mediaWatchAttached = false

export function useSidebar() {
  const isLargeScreen = useMediaQuery('(min-width: 1024px)')

  // Attach the responsive sync exactly once; subsequent calls just return refs.
  if (!mediaWatchAttached) {
    mediaWatchAttached = true
    isOpen.value = isLargeScreen.value
    watch(isLargeScreen, (large) => {
      isOpen.value = large
    })
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, toggle, close, isLargeScreen }
}
