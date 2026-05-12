import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiBadge } from '@/components/ui'

const meta: Meta<typeof UiBadge> = {
  title: 'UI/UiBadge',
  component: UiBadge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['gray', 'green', 'amber', 'red', 'primary'],
    },
  },
  args: { variant: 'gray' },
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { UiBadge },
    setup() { return { args } },
    template: `<UiBadge v-bind="args">Active</UiBadge>`,
  }),
}

export const Palette: Story = {
  render: () => ({
    components: { UiBadge },
    template: `
      <div class="flex items-center gap-3 flex-wrap">
        <UiBadge variant="gray">Gray</UiBadge>
        <UiBadge variant="green">Green</UiBadge>
        <UiBadge variant="amber">Amber</UiBadge>
        <UiBadge variant="red">Red</UiBadge>
        <UiBadge variant="primary">Primary</UiBadge>
      </div>
    `,
  }),
}
