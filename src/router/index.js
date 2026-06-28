import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import MancheGalerie from '../views/MancheGalerie.vue'

const routes = [
  {
    path: '/',
    component: MancheGalerie,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/'
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return '/'
  }
})

export default router
