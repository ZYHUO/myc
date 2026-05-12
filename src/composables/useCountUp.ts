import { ref, watch, onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Count up to `target` over `duration` ms. When `target` is reactive (ref
 * or getter), re-animates from the current value to the new target each
 * time it changes — useful for stats that arrive after a fetch.
 */
export function useCountUp(target: MaybeRefOrGetter<number>, duration = 1000) {
  const initial = toValue(target)
  const value = ref(REDUCED_MOTION ? initial : 0)
  let rafId: number | null = null

  function animateTo(to: number) {
    if (REDUCED_MOTION) {
      value.value = to
      return
    }
    if (rafId !== null) cancelAnimationFrame(rafId)
    const from = value.value
    let start: number | null = null

    function tick(ts: number) {
      if (start === null) start = ts
      const elapsed = ts - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      value.value = Math.round(from + (to - from) * eased)
      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        value.value = to
        rafId = null
      }
    }
    rafId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    animateTo(toValue(target))
    watch(
      () => toValue(target),
      (next) => animateTo(next),
    )
  })

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return value
}
