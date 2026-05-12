import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiThemeSwitcher from '@/components/ui/UiThemeSwitcher.vue'

const meta: Meta<typeof UiThemeSwitcher> = {
  title: 'UI/UiThemeSwitcher',
  component: UiThemeSwitcher,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { UiThemeSwitcher },
    template: `
      <div class="p-6 flex items-start">
        <UiThemeSwitcher />
      </div>
    `,
  }),
}
