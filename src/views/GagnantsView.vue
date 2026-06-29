<template>
  <div class="gagnants-page">
    <h1 class="page-title">Hall of Fame</h1>

    <div v-if="store.winnersLoading" class="state-msg">Chargement…</div>

    <div v-else-if="store.winnersError" class="state-msg state-error">
      <p>{{ store.winnersError }}</p>
      <button class="btn-retry" @click="store.loadWinners()">Réessayer</button>
    </div>

    <div v-else-if="store.winners.length === 0" class="state-msg">
      La fresque se remplira au fil des manches.
    </div>

    <div v-else class="grid">
      <div
        v-for="w in store.winners"
        :key="w.submission_id"
        class="card"
      >
        <div class="card-img-wrap">
          <img
            :src="getDisplayUrl(w.image_display_path)"
            :alt="w.theme"
            class="card-img"
          />
          <span class="badge-trophy">🏆</span>
        </div>
        <div class="card-footer">
          <span class="card-manche">Manche #{{ w.numero }}</span>
          <span class="card-theme">{{ w.theme }}</span>
          <!-- Futur <RouterLink :to="`/profil/${w.author_username}`"> -->
          <span class="card-author">par {{ w.author_username ?? '?' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useMancheStore } from '../stores/manche'
import { getDisplayUrl } from '../lib/imageHelpers'

const store = useMancheStore()

onMounted(async () => {
  await store.loadWinners()
})
</script>

<style scoped>
.gagnants-page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 2rem;
}

/* ----- messages ----- */
.state-msg {
  padding: 3rem 0;
  text-align: center;
  color: #9ca3af;
}

.state-error { color: #dc2626; }

.btn-retry {
  margin-top: 0.75rem;
  padding: 0.35rem 0.9rem;
  border: 1px solid #dc2626;
  border-radius: 6px;
  background: #fff;
  color: #dc2626;
  cursor: pointer;
  font-size: 0.875rem;
}

/* ----- grille ----- */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}

/* ----- carte ----- */
.card {
  border-radius: 10px;
  border: 2px solid #fde68a;
  overflow: hidden;
  background: #fff;
  position: relative;
}

.card-img-wrap {
  position: relative;
  aspect-ratio: 1;
  background: #f9fafb;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.badge-trophy {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 1.1rem;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}

.card-footer {
  padding: 0.6rem 0.75rem;
  border-top: 1px solid #fde68a;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.card-manche {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.card-theme {
  font-size: 0.9rem;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-author {
  font-size: 0.8rem;
  color: #6b7280;
}
</style>
