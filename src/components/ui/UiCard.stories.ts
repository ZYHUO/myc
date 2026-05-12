import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiCard, UiBadge, UiButton } from '@/components/ui'

const meta: Meta<typeof UiCard> = {
  title: 'UI/UiCard',
  component: UiCard,
  tags: ['autodocs'],
  argTypes: {
    flat: { control: 'boolean' },
  },
  args: { flat: false },
}
export default meta

type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: (args) => ({
    components: { UiCard },
    setup() { return { args } },
    template: `
      <UiCard v-bind="args" class="max-w-sm">
        <p class="text-4xl font-light tracking-tight tabular-nums font-mono">12,847</p>
        <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">Total Requests</p>
      </UiCard>
    `,
  }),
}

export const WithActions: Story = {
  render: () => ({
    components: { UiCard, UiBadge, UiButton },
    template: `
      <UiCard class="max-w-md space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xl font-medium">Pro plan</p>
            <p class="text-sm text-muted-fg mt-1">50k requests / day</p>
          </div>
          <UiBadge variant="primary">Most popular</UiBadge>
        </div>
        <div class="flex gap-2">
          <UiButton variant="primary" size="sm">Choose</UiButton>
          <UiButton variant="ghost" size="sm">Compare</UiButton>
        </div>
      </UiCard>
    `,
  }),
}

export const FlatBorderless: Story = {
  args: { flat: true },
  render: (args) => ({
    components: { UiCard },
    setup() { return { args } },
    template: `<UiCard v-bind="args" class="max-w-md p-6">Flat card without shadow — used for table containers and similar low-contrast surfaces.</UiCard>`,
  }),
}
