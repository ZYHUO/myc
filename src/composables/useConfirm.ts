import { ref } from 'vue'

interface ConfirmOptions {
  title?: string
  message: string
  variant?: 'default' | 'danger'
}

const visible = ref(false)
const options = ref<ConfirmOptions>({ message: '' })
let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirm() {
  function confirm(opts: ConfirmOptions | string): Promise<boolean> {
    if (typeof opts === 'string') {
      opts = { message: opts }
    }
    options.value = { title: opts.title, message: opts.message, variant: opts.variant ?? 'default' }
    visible.value = true

    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    visible.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  function handleCancel() {
    visible.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  return {
    visible,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
