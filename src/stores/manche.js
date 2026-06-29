import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'

function fisherYates(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const useMancheStore = defineStore('manche', {
  state: () => ({
    current: null,
    galerie: [],       // mélangée une seule fois au chargement
    myVote: null,      // { submission_id } | null
    mySubmission: null, // { id } | null
    loading: false,
    error: null,
    winners: [],
    winnersLoading: false,
    winnersError: null,
  }),

  getters: {
    isActive: (s) => s.current?.status === 'active',
    isClosed: (s) => s.current?.status === 'closed',
  },

  actions: {
    async loadCurrent() {
      const { data, error } = await supabase
        .from('manches')
        .select('id, numero, theme, status, starts_at, ends_at, winner_submission_id')
        .order('numero', { ascending: false })
        .limit(1)
        .single()
      if (error) {
        const auth = useAuthStore()
        const handled = await auth.handleSessionError(error)
        if (!handled) this.error = error.message
        return
      }
      this.current = data
    },

    async loadGalerie() {
      if (!this.current) return
      const { data, error } = await supabase
        .from('galerie_manche')
        .select('id, manche_id, image_display_path, image_full_path, author_id, author_username, vote_count')
        .eq('manche_id', this.current.id)
      if (error) { this.error = error.message; return }
      this.galerie = fisherYates(data ?? [])
    },

    async loadMyVote() {
      if (!this.current) return
      const auth = useAuthStore()
      if (!auth.isAuthenticated) return
      const { data, error } = await supabase
        .from('votes')
        .select('submission_id')
        .eq('manche_id', this.current.id)
        .eq('voter_id', auth.user.id)
        .maybeSingle()
      if (error) {
        await auth.handleSessionError(error)
        return
      }
      this.myVote = data
    },

    async loadMySubmission() {
      if (!this.current) return
      const auth = useAuthStore()
      if (!auth.isAuthenticated) return
      // RLS filtre automatiquement sur auth.uid() = user_id
      const { data, error } = await supabase
        .from('submissions')
        .select('id, image_display_path')
        .eq('manche_id', this.current.id)
        .maybeSingle()
      if (error) {
        await auth.handleSessionError(error)
        return
      }
      this.mySubmission = data
    },

    async vote(submissionId) {
      const auth = useAuthStore()
      if (!auth.isAuthenticated) throw new Error('Tu dois être connecté pour voter.')
      const { error } = await supabase.from('votes').insert({
        manche_id: this.current.id,
        voter_id: auth.user.id,
        submission_id: submissionId,
      })
      if (error) {
        const handled = await auth.handleSessionError(error)
        if (handled) throw new Error('Session expirée. Veuillez vous reconnecter.')
        if (error.code === '23505') throw new Error('Tu as déjà voté pour cette manche.')
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw new Error('Tu ne peux pas voter pour ton propre dessin.')
        }
        throw new Error(error.message)
      }
      this.myVote = { submission_id: submissionId }
    },

    async loadAll() {
      this.loading = true
      this.error = null
      try {
        await this.loadCurrent()
        await Promise.all([
          this.loadGalerie(),
          this.loadMyVote(),
          this.loadMySubmission(),
        ])
      } catch (e) {
        this.error = e.message ?? 'Erreur inattendue'
      } finally {
        this.loading = false
      }
    },

    async loadWinners() {
      this.winnersLoading = true
      this.winnersError = null
      try {
        const { data, error } = await supabase
          .from('galerie_gagnants')
          .select('submission_id, manche_id, numero, theme, image_full_path, author_username, won_at, winner_until, image_display_path')
          .order('numero', { ascending: false })
        if (error) {
          const auth = useAuthStore()
          const handled = await auth.handleSessionError(error)
          if (!handled) this.winnersError = error.message
          return
        }
        this.winners = data ?? []
      } catch (e) {
        this.winnersError = e.message ?? 'Erreur inattendue'
      } finally {
        this.winnersLoading = false
      }
    },
  },
})
