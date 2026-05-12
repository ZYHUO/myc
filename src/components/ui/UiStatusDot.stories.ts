import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiStatusDot } from '@/components/ui'

const meta: Meta<typeof UiStatusDot> = {
  title: 'UI/UiStatusDot',
  component: UiStatusDot,
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'select', options: ['online', 'offline', 'degraded', 'disabled'] },
  },
  args: { status: 'online' },
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { UiStatusDot },
    setup() { return { args } },
    template: `<UiStatusDot v-bind="args" />`,
  }),
}

export const AllStates: Story = {
  render: () => ({
    components: { UiStatusDot },
    template: `
      <div class="flex flex-col gap-3 text-sm">
        <div class="flex items-center gap-2"><UiStatusDot status="online" /> Online</div>
        <div class="flex items-center gap-2"><UiStatusDot status="degraded" /> Degraded</div>
        <div class="flex items-center gap-2"><UiStatusDot status="offline" /> Offline</div>
        <div class="flex items-center gap-2"><UiStatusDot status="disabled" /> Disabled</div>
      </div>
    `,
  }),
}
