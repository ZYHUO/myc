import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@/components/ui'

const meta: Meta<typeof UiButton> = {
  title: 'UI/UiButton',
  component: UiButton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
}
export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {
  render: (args) => ({
    components: { UiButton },
    setup() {
      return { args }
    },
    template: `<UiButton v-bind="args">Primary action</UiButton>`,
  }),
}

export const Secondary: Story = {
  args: { variant: 'secondary' },
  render: (args) => ({
    components: { UiButton },
    setup() { return { args } },
    template: `<UiButton v-bind="args">Secondary action</UiButton>`,
  }),
}

export const Ghost: Story = {
  args: { variant: 'ghost' },
  render: (args) => ({
    components: { UiButton },
    setup() { return { args } },
    template: `<UiButton v-bind="args">Ghost action</UiButton>`,
  }),
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => ({
    components: { UiButton },
    setup() { return { args } },
    template: `<UiButton v-bind="args">Disabled</UiButton>`,
  }),
}

export const SizeRow: Story = {
  parameters: { layout: 'centered' },
  render: () => ({
    components: { UiButton },
    template: `
      <div class="flex items-center gap-3">
        <UiButton size="sm">Small</UiButton>
        <UiButton size="md">Medium</UiButton>
        <UiButton size="lg">Large</UiButton>
      </div>
    `,
  }),
}
