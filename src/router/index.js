import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    component: HomeView,
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
