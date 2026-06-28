<template>
  <div>
    <h1>Bienvenue sur Le Drawmanche</h1>
    <p v-if="!auth.isAuthenticated">Connecte-toi pour participer.</p>
    <p v-else>Bonjour {{ auth.profile?.username }} !</p>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
</script>
