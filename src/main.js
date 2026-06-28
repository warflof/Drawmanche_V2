import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/auth'
import router from './router'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Lance l'écouteur Supabase avant le mount pour que la garde de route
// ait accès à la session dès le premier rendu.
const auth = useAuthStore()
auth.init()

app.mount('#app')
