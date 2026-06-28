import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useMancheStore } from '../stores/manche'

function buildDisplayImage(file, mancheNumero) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const MAX_W = 1000
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > MAX_W) {
        h = Math.round((h * MAX_W) / w)
        w = MAX_W
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      // Watermark répété en diagonale
      const text = `Le Drawmanche · Manche #${mancheNumero}`
      const fontSize = Math.max(12, Math.round(Math.min(w, h) / 12))
      ctx.save()
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'

      // On travaille dans un repère centré + tourné à -30°
      ctx.translate(w / 2, h / 2)
      ctx.rotate(-Math.PI / 6)
      const half = Math.sqrt(w * w + h * h) / 2 + fontSize * 2
      const stepX = ctx.measureText(text).width + fontSize * 2
      const stepY = fontSize * 3

      for (let y = -half; y < half; y += stepY) {
        for (let x = -half; x < half; x += stepX) {
          ctx.fillText(text, x, y)
          ctx.strokeText(text, x, y)
        }
      }
      ctx.restore()

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Échec de conversion canvas'))),
        'image/webp',
        0.85,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Impossible de charger l'image"))
    }
    img.src = objectUrl
  })
}

export function useSubmission() {
  const submitting = ref(false)
  const error = ref(null)

  async function submit(file) {
    const auth = useAuthStore()
    const manche = useMancheStore()

    if (!auth.isAuthenticated) throw new Error('Tu dois être connecté.')
    if (!manche.current || manche.current.status !== 'active') {
      throw new Error('Aucune manche active.')
    }

    submitting.value = true
    error.value = null

    const submissionId = crypto.randomUUID()
    const ext = file.name.split('.').pop().toLowerCase()
    const fullPath = `${submissionId}.${ext}`
    const displayPath = `${submissionId}.webp`

    let fullUploaded = false
    let displayUploaded = false

    try {
      const displayBlob = await buildDisplayImage(file, manche.current.numero)

      const { error: fullErr } = await supabase.storage
        .from('dessins-full')
        .upload(fullPath, file, { contentType: file.type })
      if (fullErr) throw new Error(`Upload original : ${fullErr.message}`)
      fullUploaded = true

      const { error: displayErr } = await supabase.storage
        .from('dessins-display')
        .upload(displayPath, displayBlob, { contentType: 'image/webp' })
      if (displayErr) throw new Error(`Upload display : ${displayErr.message}`)
      displayUploaded = true

      const { error: insertErr } = await supabase.from('submissions').insert({
        id: submissionId,
        manche_id: manche.current.id,
        user_id: auth.user.id,
        image_full_path: fullPath,
        image_display_path: displayPath,
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          throw new Error('Tu as déjà soumis un dessin cette semaine.')
        }
        throw new Error(insertErr.message)
      }

      return submissionId
    } catch (e) {
      // Nettoyage des fichiers orphelins si l'insert a échoué après upload
      const cleanups = []
      if (fullUploaded) cleanups.push(supabase.storage.from('dessins-full').remove([fullPath]))
      if (displayUploaded) cleanups.push(supabase.storage.from('dessins-display').remove([displayPath]))
      await Promise.allSettled(cleanups)
      error.value = e.message
      throw e
    } finally {
      submitting.value = false
    }
  }

  return { submitting, error, submit }
}
