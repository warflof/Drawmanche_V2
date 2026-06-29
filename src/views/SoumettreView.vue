<template>
  <div class="soumettre-page">

    <!-- Chargement -->
    <div v-if="manche.loading" class="state-msg">Chargement…</div>

    <!-- Erreur de chargement -->
    <div v-else-if="manche.error" class="state-msg state-error">
      <p>{{ manche.error }}</p>
      <button class="btn-retry" @click="retry">Réessayer</button>
    </div>

    <!-- Pas de manche active -->
    <div v-else-if="!manche.isActive" class="state-msg">
      <p>Aucune manche active en ce moment.</p>
      <RouterLink to="/" class="link">← Retour à la galerie</RouterLink>
    </div>

    <!-- Déjà soumis -->
    <div v-else-if="manche.mySubmission" class="already-submitted">
      <h2>Dessin soumis ✓</h2>
      <p>Tu as déjà soumis ton dessin pour la manche <strong>#{{ manche.current.numero }}</strong> — <em>{{ manche.current.theme }}</em>.</p>
      <img
        v-if="submittedImgUrl"
        :src="submittedImgUrl"
        alt="Ton dessin soumis"
        class="submitted-preview"
      />
      <RouterLink to="/" class="link">← Voir la galerie</RouterLink>
    </div>

    <!-- Formulaire -->
    <template v-else>
      <header class="page-header">
        <h2>Soumettre ton dessin</h2>
        <p class="subtitle">
          Manche <strong>#{{ manche.current.numero }}</strong> — <em>{{ manche.current.theme }}</em>
        </p>
      </header>

      <form class="form" @submit.prevent="handleSubmit">

        <!-- Sélection fichier -->
        <div class="field">
          <label class="label" for="file-input">Image (PNG, JPG ou WebP)</label>
          <input
            id="file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="file-input"
            @change="handleFile"
          />
        </div>

        <!-- Aperçu local -->
        <div v-if="previewUrl" class="preview-wrap">
          <img :src="previewUrl" alt="Aperçu" class="preview-img" />
        </div>

        <!-- Disclaimer -->
        <div class="disclaimer">
          <p class="disclaimer-text">
            ⚠️ Les dessins générés par IA ne sont pas autorisés.
            Garde tes WIP et captures d'étapes en cas de litige.
          </p>
          <label class="checkbox-label">
            <input v-model="certified" type="checkbox" />
            Je certifie que ce dessin est entièrement de ma main.
          </label>
        </div>

        <!-- Erreur -->
        <p v-if="error" class="form-error">{{ error }}</p>

        <!-- Submit -->
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!canSubmit"
        >
          <span v-if="submitting">Envoi en cours…</span>
          <span v-else>Soumettre mon dessin</span>
        </button>

      </form>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMancheStore } from '../stores/manche'
import { useSubmission } from '../composables/useSubmission'
import { getDisplayUrl } from '../lib/imageHelpers'

const router = useRouter()
const manche = useMancheStore()
const { submitting, error, submit } = useSubmission()

const file = ref(null)
const previewUrl = ref(null)
const certified = ref(false)

const canSubmit = computed(() => file.value && certified.value && !submitting.value)

const submittedImgUrl = computed(() => getDisplayUrl(manche.mySubmission?.image_display_path) || null)

function handleFile(e) {
  const f = e.target.files[0]
  if (!f) return
  file.value = f
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(f)
}

async function handleSubmit() {
  try {
    await submit(file.value)
    // Rafraîchit mySubmission dans le store avant de rediriger
    await manche.loadMySubmission()
    router.push('/')
  } catch {
    // error est déjà positionné dans le composable
  }
}

onMounted(async () => {
  if (!manche.current) await manche.loadAll()
})

async function retry() {
  await manche.loadAll()
}

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<style scoped>
.soumettre-page {
  max-width: 560px;
  margin: 0 auto;
}

.state-msg {
  text-align: center;
  padding: 3rem 0;
  color: #6b7280;
}

.state-error {
  color: #dc2626;
}

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

.link {
  display: inline-block;
  margin-top: 1rem;
  color: #7c3aed;
  text-decoration: none;
  font-size: 0.9rem;
}

/* ----- déjà soumis ----- */
.already-submitted {
  text-align: center;
  padding: 2rem 0;
}

.already-submitted h2 {
  color: #16a34a;
  margin-bottom: 0.5rem;
}

.submitted-preview {
  display: block;
  max-width: 100%;
  max-height: 400px;
  margin: 1.5rem auto;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  object-fit: contain;
}

/* ----- header ----- */
.page-header {
  margin-bottom: 2rem;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.3rem;
}

.subtitle {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0;
}

/* ----- form ----- */
.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.file-input {
  font-size: 0.875rem;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  background: #fafafa;
}

/* ----- aperçu ----- */
.preview-wrap {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.preview-img {
  display: block;
  max-width: 100%;
  max-height: 400px;
  margin: 0 auto;
  object-fit: contain;
}

/* ----- disclaimer ----- */
.disclaimer {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.disclaimer-text {
  font-size: 0.875rem;
  color: #92400e;
  margin: 0;
  line-height: 1.5;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  line-height: 1.4;
}

.checkbox-label input {
  margin-top: 2px;
  flex-shrink: 0;
}

/* ----- erreur ----- */
.form-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin: 0;
}

/* ----- bouton ----- */
.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
}

.btn-primary {
  background: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
