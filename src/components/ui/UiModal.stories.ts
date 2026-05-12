import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { UiModal, UiButton, UiInput } from '@/components/ui'

const meta: Meta<typeof UiModal> = {
  title: 'UI/UiModal',
  component: UiModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof meta>

export const ConfirmAction: Story = {
  render: () => ({
    components: { UiModal, UiButton },
    setup() {
      const open = ref(false)
      return { open }
    },
    template: `
      <div class="p-6">
        <UiButton variant="primary" @click="open = true">Open dialog</UiButton>
        <UiModal v-model="open" title="Delete API key">
          <p class="text-sm text-muted-fg">This will revoke "production-backend". Apps using it will start receiving 401 immediately.</p>
          <template #footer>
            <UiButton variant="secondary" @click="open = false">Cancel</UiButton>
            <UiButton variant="primary" class="text-destructive" @click="open = false">Delete</UiButton>
          </template>
        </UiModal>
      </div>
    `,
  }),
}

export const WithFormFields: Story = {
  render: () => ({
    components: { UiModal, UiButton, UiInput },
    setup() {
      const open = ref(false)
      const name = ref('')
      return { open, name }
    },
    template: `
      <div class="p-6">
        <UiButton variant="primary" @click="open = true">Create key</UiButton>
        <UiModal v-model="open" title="Create a new API key">
          <div class="space-y-4">
            <div>
              <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">Name</label>
              <UiInput v-model="name" placeholder="e.g. production-backend" />
            </div>
          </div>
          <template #footer>
            <UiButton variant="secondary" @click="open = false">Cancel</UiButton>
            <UiButton variant="primary" @click="open = false">Create</UiButton>
          </template>
        </UiModal>
      </div>
    `,
  }),
}
