import { createApp } from "vue"
import { createPinia } from "pinia"
import router from "./router"
import { i18n, bootstrapLocale } from "./i18n"
import { applyInitialTheme } from "./stores/theme"
import { installUpdateWatchdog } from "./utils/update-check"
import App from "./App.vue"
import "./style.css"

// Sync the .dark class on <html> before mount so dark-preferring users
// don't see a flash of light theme.
applyInitialTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)

Promise.all([router.isReady(), bootstrapLocale()]).then(() => {
  app.mount("#app")
  // Fade out and remove the boot splash that index.html paints before this
  // module parses. The fade-out duration matches the CSS transition.
  const splash = document.getElementById("app-boot")
  if (splash) {
    splash.classList.add("is-hidden")
    setTimeout(() => splash.remove(), 280)
  }
  // Now that the app is interactive, arm the update watchdog. It does an
  // initial /version.json fetch in 5 s, then re-checks every minute (and
  // whenever the tab becomes visible). Users never have to clear caches
  // manually — see src/utils/update-check.ts for the full mechanism.
  installUpdateWatchdog()
})
