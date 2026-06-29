import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/auth'
import router from './router'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Attend que la session soit résolue (valide ou non) avant le premier rendu.
// Élimine la race condition entre le montage des composants et l'état auth.
;(async () => {
  const auth = useAuthStore()
  await auth.init()
  app.mount('#app')
})()
