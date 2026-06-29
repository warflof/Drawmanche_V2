import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import HomeView from '../views/HomeView.vue'
import SoumettreView from '../views/SoumettreView.vue'
const GagnantsView = () => import('../views/GagnantsView.vue')
const AdminView = () => import('../views/AdminView.vue')

const routes = [
  {
    path: '/',
    component: HomeView,
  },
  {
    path: '/gagnants',
    component: GagnantsView,
  },
  {
    path: '/soumettre',
    component: SoumettreView,
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    component: AdminView,
    meta: { requiresAdmin: true },
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
