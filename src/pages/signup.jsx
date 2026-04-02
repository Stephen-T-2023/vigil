/* ============================================
   signup.jsx
   Vigil — Ashborne
   Signup page — handles new user registration
   via Supabase. Redirects to login on success.
   ============================================ */

import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Auth.module.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.logo}>Vigil</h1>
          <p className={styles.tagline}>by Ashborne</p>
        </div>

        {success ? (
          <div className={styles.successMessage}>
            <p>Check your email to confirm your account.</p>
            <a href="/login">Back to login</a>
          </div>
        ) : (
          <form onSubmit={handleSignup} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <p className={styles.legal}>
              By creating an account you confirm you are aged 13 or over
              and agree to our{' '}
              <a href="/privacy" className={styles.legalLink}>
                Privacy Policy
              </a>
              .
            </p>
          </form>
        )}

        <p className={styles.switch}>
          Already have an account?{' '}
          <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  )
}