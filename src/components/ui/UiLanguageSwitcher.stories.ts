import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiLanguageSwitcher from '@/components/ui/UiLanguageSwitcher.vue'

const meta: Meta<typeof UiLanguageSwitcher> = {
  title: 'UI/UiLanguageSwitcher',
  component: UiLanguageSwitcher,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { UiLanguageSwitcher },
    template: `
      <div class="p-6 flex items-start">
        <UiLanguageSwitcher />
      </div>
    `,
  }),
}
