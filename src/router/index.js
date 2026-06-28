import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import MancheGalerie from '../views/MancheGalerie.vue'
import SoumettreView from '../views/SoumettreView.vue'

const routes = [
  {
    path: '/',
    component: MancheGalerie,
  },
  {
    path: '/soumettre',
    component: SoumettreView,
    meta: { requiresAuth: true },
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
