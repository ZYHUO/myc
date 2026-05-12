import { createApp } from "vue"
import { createPinia } from "pinia"
import router from "./router"
import { i18n } from "./i18n"
import App from "./App.vue"
import "./style.css"

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)

// Wait for the first navigation to resolve before mounting. Without this,
// Vue mounts against a placeholder route whose `meta` is empty — which makes
// App.vue render the authed AppLayout for one frame on public pages
// (landing/login/register), flashing a sidebar that shouldn't be there.
router.isReady().then(() => {
  app.mount("#app")
})
