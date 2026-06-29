import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

function isInvalidSession(error) {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.status === 401 ||
    msg.includes('jwt expired') ||
    msg.includes('invalid token') ||
    msg.includes('refresh_token_not_found') ||
    msg.includes('invalid refresh token') ||
    msg.includes('token has expired') ||
    msg.includes('not authenticated')
  )
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null,
    user: null,
    profile: null,
    ready: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.session,
    isAdmin: (state) => state.profile?.is_admin === true,
  },

  actions: {
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    },

    async signOut() {
      try {
        await supabase.auth.signOut()
      } catch (e) {
        console.warn('[auth] signOut error:', e.message)
      }
      this._clearAuth()
    },

    _clearAuth() {
      this.session = null
      this.user = null
      this.profile = null
    },

    // Appelable depuis n'importe quel catch de store.
    // Retourne true si l'erreur était une session invalide (et a été traitée).
    async handleSessionError(error) {
      if (!isInvalidSession(error)) return false
      console.warn('[auth] Session invalide détectée, déconnexion locale.', error.message)
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (e) {
        console.warn('[auth] Erreur lors de la déconnexion locale:', e.message)
      }
      this._clearAuth()
      // Import dynamique pour éviter la dépendance circulaire auth ↔ router
      const { default: router } = await import('../router')
      if (router.currentRoute.value.path !== '/') {
        router.push('/')
      }
      return true
    },

    async _loadProfile(userId) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (error) {
          console.warn('[auth] Erreur chargement profil:', error.message)
          return
        }
        this.profile = data
      } catch (e) {
        console.warn('[auth] Exception chargement profil:', e.message)
      }
    },

    async init() {
      // 1. Résout la session existante AVANT le montage de l'app.
      //    Si le refresh token est mort, getSession() retourne une erreur
      //    plutôt que de bloquer toutes les requêtes en file d'attente.
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('[auth] getSession error:', error.message)
          if (isInvalidSession(error)) {
            try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
          }
          // On reste déconnecté — pas de blocage
        } else if (data?.session) {
          this.session = data.session
          this.user = data.session.user
          await this._loadProfile(data.session.user.id)
        }
      } catch (e) {
        console.warn('[auth] Erreur inattendue dans init:', e.message)
      } finally {
        this.ready = true
      }

      // 2. Écoute les changements d'auth pour la durée de vie de l'app.
      //    On ignore INITIAL_SESSION : déjà traité par getSession() ci-dessus.
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') return

        if (event === 'SIGNED_IN') {
          this.session = session
          this.user = session.user
          await this._loadProfile(session.user.id)
        } else if (event === 'TOKEN_REFRESHED') {
          this.session = session
          this.user = session?.user ?? null
        } else if (event === 'SIGNED_OUT') {
          this._clearAuth()
          const { default: router } = await import('../router')
          if (router.currentRoute.value.path !== '/') {
            router.push('/')
          }
        }
      })
    },
  },
})
