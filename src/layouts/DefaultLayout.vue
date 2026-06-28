<template>
  <div class="app">
    <header class="header">
      <span class="logo">Le Drawmanche</span>

      <nav class="nav">
        <template v-if="auth.isAuthenticated">
          <span class="user-info">
            <img
              v-if="auth.profile?.avatar_url"
              :src="auth.profile.avatar_url"
              alt="avatar"
              class="avatar"
            />
            {{ auth.profile?.username ?? auth.user?.email }}
            <span v-if="auth.isAdmin" class="badge-admin">admin</span>
          </span>
          <button class="btn" @click="handleSignOut">Déconnexion</button>
        </template>

        <template v-else>
          <button class="btn btn-primary" @click="auth.signInWithGoogle()">
            Connexion avec Google
          </button>
        </template>
      </nav>
    </header>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

async function handleSignOut() {
  await auth.signOut()
  router.push('/')
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 56px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.logo {
  font-weight: 700;
  font-size: 1.1rem;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.badge-admin {
  background: #7c3aed;
  color: #fff;
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 4px;
}

.btn {
  padding: 0.4rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-primary {
  background: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}

.main {
  flex: 1;
  padding: 2rem 1.5rem;
}
</style>
