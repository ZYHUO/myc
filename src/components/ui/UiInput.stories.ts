import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { UiInput } from '@/components/ui'

const meta: Meta<typeof UiInput> = {
  title: 'UI/UiInput',
  component: UiInput,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number'] },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    type: 'text',
    placeholder: 'Enter a value',
    disabled: false,
  },
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { UiInput },
    setup() {
      const model = ref('')
      return { args, model }
    },
    template: `
      <div class="max-w-xs">
        <UiInput v-bind="args" v-model="model" />
        <p class="mt-2 text-xs text-muted-fg font-mono">value: {{ model || '(empty)' }}</p>
      </div>
    `,
  }),
}

export const PasswordStack: Story = {
  render: () => ({
    components: { UiInput },
    setup() {
      const pwd = ref('')
      const confirm = ref('')
      return { pwd, confirm }
    },
    template: `
      <div class="max-w-xs space-y-3">
        <UiInput v-model="pwd" type="password" placeholder="New password" />
        <UiInput v-model="confirm" type="password" placeholder="Confirm password" />
      </div>
    `,
  }),
}
