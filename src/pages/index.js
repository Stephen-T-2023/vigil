/* ============================================
   index.js
   Vigil — Ashborne
   Root route — redirects to dashboard if
   logged in, or to login if not authenticated.
   ============================================ */

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
    redirect()
  }, [router])

  return null
}