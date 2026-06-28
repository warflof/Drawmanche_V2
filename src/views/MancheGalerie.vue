<template>
  <div class="galerie-page">
    <div v-if="store.loading" class="state-msg">Chargement…</div>
    <div v-else-if="store.error" class="state-msg state-error">{{ store.error }}</div>
    <div v-else-if="!store.current" class="state-msg">Aucune manche en cours.</div>

    <template v-else>
      <!-- En-tête -->
      <header class="manche-header">
        <div class="manche-top">
          <span class="manche-num">Manche #{{ store.current.numero }}</span>
          <span class="pill" :class="store.current.status">
            {{ store.isActive ? 'En cours' : 'Terminée' }}
          </span>
        </div>
        <h2 class="manche-theme">{{ store.current.theme }}</h2>
        <p v-if="store.isActive" class="countdown">⏱ {{ countdown }}</p>
      </header>

      <!-- Message vote -->
      <div v-if="voteError" class="vote-error">{{ voteError }}</div>
      <div v-if="store.myVote && store.isActive" class="vote-confirm-msg">
        Tu as voté pour cette manche.
      </div>

      <!-- Grille vide -->
      <div v-if="store.galerie.length === 0" class="state-msg">
        Aucun dessin soumis pour le moment.
      </div>

      <!-- Grille -->
      <div v-else class="grid">
        <div
          v-for="item in store.galerie"
          :key="item.id"
          class="card"
          :class="cardClasses(item)"
          @click="handleClick(item)"
        >
          <div class="card-img-wrap">
            <img
              :src="imgSrc(item)"
              :alt="store.isClosed ? (item.author_username ?? 'Dessin') : 'Dessin'"
              class="card-img"
            />

            <span v-if="isMySubmission(item)" class="badge badge-mine">Ton dessin</span>
            <span v-else-if="isMyVote(item)" class="badge badge-voted">✓ Ton vote</span>
            <span v-if="isWinner(item)" class="badge badge-winner">🏆 Gagnant</span>
          </div>

          <div v-if="store.isClosed" class="card-footer">
            <span class="author">{{ item.author_username ?? '—' }}</span>
            <span class="vote-count">{{ item.vote_count ?? 0 }} vote{{ (item.vote_count ?? 0) !== 1 ? 's' : '' }}</span>
          </div>

          <!-- Confirmation inline -->
          <div v-if="confirmId === item.id" class="confirm-overlay" @click.stop>
            <p>Voter pour ce dessin ?</p>
            <div class="confirm-btns">
              <button class="btn btn-primary" @click="confirmVote(item.id)">Confirmer</button>
              <button class="btn" @click="confirmId = null">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useMancheStore } from '../stores/manche'
import { supabase } from '../lib/supabase'

const store = useMancheStore()
const confirmId = ref(null)
const voteError = ref(null)
const countdown = ref('')
let timer = null

// ---------- helpers image ----------

function imgSrc(item) {
  const path = item.image_display_path
  if (!path) return ''
  return supabase.storage.from('dessins-display').getPublicUrl(path).data.publicUrl
}

// ---------- helpers état carte ----------

function isMySubmission(item) {
  return store.mySubmission?.id === item.id
}

function isMyVote(item) {
  return store.myVote?.submission_id === item.id
}

function isWinner(item) {
  return store.isClosed && store.current.winner_submission_id === item.id
}

function isVotable(item) {
  return store.isActive && !store.myVote && !isMySubmission(item)
}

function cardClasses(item) {
  return {
    'card--mine': isMySubmission(item),
    'card--voted': isMyVote(item),
    'card--winner': isWinner(item),
    'card--votable': isVotable(item),
    'card--disabled': store.isActive && !isVotable(item),
  }
}

// ---------- vote ----------

function handleClick(item) {
  if (!isVotable(item)) return
  voteError.value = null
  confirmId.value = item.id
}

async function confirmVote(submissionId) {
  confirmId.value = null
  try {
    await store.vote(submissionId)
  } catch (e) {
    voteError.value = e.message
  }
}

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

onMounted(async () => {
  await store.loadAll()
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.galerie-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* ----- header ----- */
.manche-header {
  margin-bottom: 2rem;
}

.manche-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
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

.pill.active  { background: #dcfce7; color: #16a34a; }
.pill.closed  { background: #f3f4f6; color: #6b7280; }

.manche-theme {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

.countdown {
  font-size: 0.9rem;
  color: #6b7280;
}

/* ----- messages ----- */
.state-msg {
  padding: 3rem 0;
  text-align: center;
  color: #9ca3af;
}

.state-error { color: #dc2626; }

.vote-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.vote-confirm-msg {
  background: #f0fdf4;
  color: #16a34a;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
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
  border: 2px solid #e5e7eb;
  overflow: hidden;
  background: #fff;
  position: relative;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.card--votable {
  cursor: pointer;
}

.card--votable:hover {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px #ede9fe;
}

.card--disabled {
  opacity: 0.6;
  cursor: default;
}

.card--voted {
  border-color: #7c3aed;
  opacity: 1;
}

.card--winner {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px #fef3c7;
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

/* ----- badges ----- */
.badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-mine   { background: #dbeafe; color: #1d4ed8; }
.badge-voted  { background: #ede9fe; color: #7c3aed; }
.badge-winner {
  background: #f59e0b;
  color: #fff;
  top: 0.5rem;
  left: auto;
  right: 0.5rem;
}

/* ----- footer fermé ----- */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  border-top: 1px solid #e5e7eb;
}

.author { font-weight: 600; color: #374151; }
.vote-count { color: #6b7280; }

/* ----- confirmation ----- */
.confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #fff;
  padding: 1rem;
  text-align: center;
}

.confirm-overlay p {
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0;
}

.confirm-btns {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.35rem 0.85rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #111;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-primary {
  background: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}
</style>
