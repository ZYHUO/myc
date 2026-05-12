import { createApp } from "vue"
import { createPinia } from "pinia"
import router from "./router"
import { i18n, bootstrapLocale } from "./i18n"
import { applyInitialTheme } from "./stores/theme"
import App from "./App.vue"
import "./style.css"

// Sync the .dark class on <html> before mount so dark-preferring users
// don't see a flash of light theme.
applyInitialTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)

// Wait for two things before mounting:
//   1. router.isReady — without this, the first render uses a placeholder
//      route with empty meta, so App.vue flashes the AppLayout (sidebar) for
//      one frame on public pages.
//   2. bootstrapLocale — if the user prefers a non-English locale, we lazily
//      import that chunk before first paint to avoid flashing English text.
Promise.all([router.isReady(), bootstrapLocale()]).then(() => {
  app.mount("#app")
})
