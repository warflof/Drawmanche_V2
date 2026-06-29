<template>
  <div class="home-page">

    <!-- Chargement principal -->
    <div v-if="store.loading" class="state-msg">Chargement…</div>

    <!-- Erreur bloquante (pas de manche chargée) -->
    <div v-else-if="store.error && !store.current" class="state-msg state-error">
      <p>{{ store.error }}</p>
      <button class="btn-retry" @click="reloadAll">Réessayer</button>
    </div>

    <template v-else>

      <!-- ═══ HERO : Hall of Fame ═══ -->
      <section v-if="!store.winnersLoading && store.winners.length > 0" class="hero">
        <div class="hero-img-wrap">
          <img
            :src="getDisplayUrl(hero.image_display_path)"
            :alt="hero.theme"
            class="hero-img"
          />
        </div>
        <div class="hero-body">
          <span class="hero-badge">🏆 Gagnant de la manche précédente</span>
          <p class="hero-manche">Manche #{{ hero.numero }}</p>
          <h2 class="hero-theme">{{ hero.theme }}</h2>
          <!-- Futur <RouterLink :to="`/profil/${hero.author_username}`"> quand les pages profil existent -->
          <p class="hero-author">par {{ hero.author_username ?? '?' }}</p>
        </div>
      </section>

      <!-- ═══ MANCHE EN COURS ═══ -->
      <section v-if="store.current" class="manche-section">
        <div class="manche-top">
          <span class="manche-num">Manche #{{ store.current.numero }}</span>
          <span class="pill" :class="store.current.status">
            {{ store.isActive ? 'En cours' : 'Terminée' }}
          </span>
        </div>
        <h1 class="manche-theme">{{ store.current.theme }}</h1>
        <p v-if="store.isActive" class="countdown">⏱ {{ countdown }}</p>

        <div class="cta-row">
          <template v-if="auth.isAuthenticated">
            <span v-if="store.mySubmission" class="cta-submitted">✓ Dessin soumis</span>
            <RouterLink v-else-if="store.isActive" to="/soumettre" class="btn btn-primary">
              Soumettre mon dessin
            </RouterLink>
          </template>
          <button v-else class="btn btn-primary" @click="auth.signInWithGoogle()">
            Connexion Google
          </button>
        </div>
      </section>
      <div v-else class="state-msg">Aucune manche en cours pour l'instant.</div>

      <!-- ═══ GALERIE DE VOTE ═══ -->
      <MancheGalerie />

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMancheStore } from '../stores/manche'
import { useAuthStore } from '../stores/auth'
import { getDisplayUrl } from '../lib/imageHelpers'
import MancheGalerie from './MancheGalerie.vue'

const store = useMancheStore()
const auth = useAuthStore()

const countdown = ref('')
let timer = null

const hero = computed(() => store.winners[0])

// ---------- compte à rebours ----------

function nextSunday() {
  const d = new Date()
  const daysUntil = (7 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + daysUntil)
  d.setHours(23, 59, 59, 0)
  return d
}

function updateCountdown() {
  const target = store.current?.ends_at
    ? new Date(store.current.ends_at)
    : nextSunday()
  const diff = target - Date.now()
  if (diff <= 0) { countdown.value = 'Terminé'; return }
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  countdown.value = d > 0 ? `${d}j ${h}h ${m}m` : `${h}h ${m}m ${s}s`
}

// ---------- lifecycle ----------

async function reloadAll() {
  await Promise.all([store.loadAll(), store.loadWinners()])
  updateCountdown()
  if (!timer) timer = setInterval(updateCountdown, 1000)
}

onMounted(async () => {
  await Promise.all([store.loadAll(), store.loadWinners()])
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.home-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

/* ----- messages globaux ----- */
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

/* ═══ Hero ═══ */
.hero {
  display: flex;
  gap: 0;
  align-items: stretch;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.hero-img-wrap {
  flex-shrink: 0;
  width: 260px;
  aspect-ratio: 1;
  background: #f3f4f6;
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-body {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
  justify-content: center;
}

.hero-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: #92400e;
  background: #fef3c7;
  padding: 2px 8px;
  border-radius: 99px;
  align-self: flex-start;
}

.hero-manche {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0.4rem 0 0;
}

.hero-theme {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.hero-author {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0.2rem 0 0;
}

@media (max-width: 600px) {
  .hero {
    flex-direction: column;
  }
  .hero-img-wrap {
    width: 100%;
    aspect-ratio: 2 / 1;
  }
}

/* ═══ Manche en cours ═══ */
.manche-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.manche-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.manche-num {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pill {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
}

.pill.active { background: #dcfce7; color: #16a34a; }
.pill.closed { background: #f3f4f6; color: #6b7280; }

.manche-theme {
  font-size: 1.9rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.15;
}

.countdown {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
}

.cta-row {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn {
  padding: 0.55rem 1.2rem;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}

.cta-submitted {
  font-size: 0.9rem;
  font-weight: 600;
  color: #16a34a;
}
</style>
