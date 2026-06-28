import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null,
    user: null,
    profile: null,
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
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },

    async _loadProfile(userId) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      this.profile = data
    },

    init() {
      supabase.auth.onAuthStateChange(async (_event, session) => {
        this.session = session
        this.user = session?.user ?? null
        if (session?.user) {
          await this._loadProfile(session.user.id)
        } else {
          this.profile = null
        }
      })
    },
  },
})
