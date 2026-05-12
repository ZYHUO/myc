import { ref, onMounted, onUnmounted } from 'vue'

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCountUp(target: number, duration = 1000) {
  const value = ref(REDUCED_MOTION ? target : 0)
  let start: number | null = null
  let rafId: number | null = null

  function animate(timestamp: number) {
    if (start === null) start = timestamp
    const elapsed = timestamp - start
    const progress = Math.min(elapsed / duration, 1)
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    value.value = Math.round(eased * target)

    if (progress < 1) {
      rafId = requestAnimationFrame(animate)
    } else {
      value.value = target
      rafId = null
    }
  }

  onMounted(() => {
    if (REDUCED_MOTION) return
    rafId = requestAnimationFrame(animate)
  })

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return value
}
