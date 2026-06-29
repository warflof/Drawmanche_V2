<template>
  <div class="admin-page">
    <h1 class="page-title">Administration</h1>

    <div v-if="initialLoading" class="state-msg">Chargement…</div>
    <div v-else-if="loadError" class="state-msg state-error">{{ loadError }}</div>
    <div v-else-if="!store.current" class="state-msg">Aucune manche trouvée.</div>

    <template v-else>
      <section class="info-card">
        <div class="info-row">
          <span class="label">Manche</span>
          <strong>#{{ store.current.numero }}</strong>
        </div>
        <div class="info-row">
          <span class="label">Thème</span>
          <span>{{ store.current.theme }}</span>
        </div>
        <div class="info-row">
          <span class="label">Statut</span>
          <span class="pill" :class="store.current.status">
            {{ store.isActive ? 'En cours' : 'Terminée' }}
          </span>
        </div>
        <div class="info-row">
          <span class="label">Soumissions</span>
          <span>{{ submissionCount ?? '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Fin</span>
          <span>{{ formatDate(store.current.ends_at) }}</span>
        </div>
      </section>

      <div v-if="actionError" class="error-msg">{{ actionError }}</div>
      <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>

      <div class="actions">
        <button
          v-if="store.isActive"
          class="btn btn-danger"
          :disabled="loading"
          @click="askCloture"
        >
          {{ loading ? 'Clôture en cours…' : 'Clôturer la manche' }}
        </button>

        <button
          v-else-if="store.isClosed"
          class="btn btn-primary"
          :disabled="loading"
          @click="askDemarrer"
        >
          {{ loading ? 'Démarrage en cours…' : 'Démarrer la manche suivante' }}
        </button>
      </div>
    </template>

    <!-- Modale de confirmation -->
    <div v-if="modal.show" class="modal-backdrop" @click.self="modal.show = false">
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal-title">{{ modal.title }}</h3>
        <p class="modal-body">{{ modal.message }}</p>
        <p v-if="modal.warning" class="modal-warning">{{ modal.warning }}</p>
        <div class="modal-btns">
          <button class="btn" @click="modal.show = false">Annuler</button>
          <button class="btn" :class="modal.confirmClass" @click="modal.onConfirm()">
            {{ modal.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useMancheStore } from '../stores/manche'
import { supabase } from '../lib/supabase'

const store = useMancheStore()

const initialLoading = ref(false)
const loading = ref(false)
const loadError = ref(null)
const actionError = ref(null)
const successMsg = ref(null)
const submissionCount = ref(null)

const modal = reactive({
  show: false,
  title: '',
  message: '',
  warning: '',
  confirmLabel: '',
  confirmClass: '',
  onConfirm: () => {},
})

onMounted(async () => {
  initialLoading.value = true
  loadError.value = null
  try {
    await store.loadCurrent()
    if (store.error) throw new Error(store.error)
    await loadSubmissionCount()
  } catch (e) {
    loadError.value = e.message ?? 'Erreur de chargement'
  } finally {
    initialLoading.value = false
  }
})

async function loadSubmissionCount() {
  if (!store.current) return
  const { count, error } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('manche_id', store.current.id)
    .eq('status', 'active')
  if (!error) submissionCount.value = count
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function askCloture() {
  actionError.value = null
  successMsg.value = null
  modal.show = true
  modal.title = 'Clôturer la manche ?'
  modal.message = `Les votes seront fermés et les résultats de la manche #${store.current.numero} révélés à tous.`
  modal.warning = ''
  modal.confirmLabel = 'Clôturer'
  modal.confirmClass = 'btn-danger'
  modal.onConfirm = executeCloture
}

function askDemarrer() {
  actionError.value = null
  successMsg.value = null
  modal.show = true
  modal.title = 'Démarrer la manche suivante ?'
  modal.message = `Une nouvelle manche va être lancée.`
  modal.warning = `⚠ Les dessins NON gagnants de la manche #${store.current.numero} seront DÉFINITIVEMENT supprimés du stockage. Cette action est irréversible.`
  modal.confirmLabel = 'Démarrer'
  modal.confirmClass = 'btn-primary'
  modal.onConfirm = executeDemarrer
}

async function executeCloture() {
  modal.show = false
  loading.value = true
  actionError.value = null
  successMsg.value = null
  try {
    const { error } = await supabase.rpc('cloturer_manche')
    if (error) throw new Error(error.message)
    await store.loadAll()
    await loadSubmissionCount()
    successMsg.value = 'Manche clôturée. Les résultats sont maintenant visibles.'
  } catch (e) {
    actionError.value = e.message ?? 'Erreur lors de la clôture.'
  } finally {
    loading.value = false
  }
}

async function executeDemarrer() {
  modal.show = false
  loading.value = true
  actionError.value = null
  successMsg.value = null
  try {
    const { data, error } = await supabase.rpc('demarrer_manche')
    if (error) throw new Error(error.message)

    const toDelete = Array.isArray(data) ? data : []
    const fullPaths = toDelete
      .map((d) => stripPrefix(d.full_path, 'dessins-full/'))
      .filter(Boolean)
    const displayPaths = toDelete
      .map((d) => stripPrefix(d.display_path, 'dessins-display/'))
      .filter(Boolean)

    if (fullPaths.length) {
      await supabase.storage.from('dessins-full').remove(fullPaths)
    }
    if (displayPaths.length) {
      await supabase.storage.from('dessins-display').remove(displayPaths)
    }

    await store.loadAll()
    await loadSubmissionCount()
    successMsg.value = `Nouvelle manche démarrée. ${toDelete.length} dessin(s) supprimé(s) du stockage.`
  } catch (e) {
    actionError.value = e.message ?? 'Erreur lors du démarrage.'
  } finally {
    loading.value = false
  }
}

function stripPrefix(path, prefix) {
  if (!path) return null
  return path.startsWith(prefix) ? path.slice(prefix.length) : path
}
</script>

<style scoped>
.admin-page {
  max-width: 540px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  margin-top: 0;
}

.state-msg {
  padding: 3rem 0;
  text-align: center;
  color: #9ca3af;
}

.state-error {
  color: #dc2626;
}

.info-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.label {
  color: #6b7280;
  width: 100px;
  flex-shrink: 0;
}

.pill {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
}

.pill.active {
  background: #dcfce7;
  color: #16a34a;
}

.pill.closed {
  background: #f3f4f6;
  color: #6b7280;
}

.error-msg {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.success-msg {
  background: #f0fdf4;
  color: #16a34a;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1.1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-primary {
  background: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}

/* Modale */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 10px;
  padding: 1.75rem;
  max-width: 420px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}

.modal-body {
  font-size: 0.9rem;
  color: #374151;
  margin: 0;
}

.modal-warning {
  background: #fef3c7;
  color: #92400e;
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin: 0;
}

.modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
