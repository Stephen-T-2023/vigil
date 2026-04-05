/* ============================================
   Navbar.jsx
   Vigil — Ashborne
   Global navigation bar. Contains logo, nav
   links, dark mode toggle and mobile menu.
   ============================================ */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Navbar.module.css'

export default function Navbar() {
  const router = useRouter()
  const [theme, setTheme] = useState('light')
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem('vigil-theme') || 'light'
    setTheme(savedTheme)

    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  /* Close menu on route change */
  useEffect(() => {
    const timer = setTimeout(() => setMenuOpen(false), 0)
    return () => clearTimeout(timer)
  }, [router.pathname])

  function handleThemeToggle() {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('vigil-theme', newTheme)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function navigate(path) {
    setMenuOpen(false)
    router.push(path)
  }

  /* Hide navbar on auth pages */
  const hideOn = ['/login', '/signup']
  if (hideOn.includes(router.pathname)) return null
  if (!user) return null

  return (
    <>
      <nav className={styles.navbar}>
        <button
          className={styles.logo}
          onClick={() => router.push('/dashboard')}
        >
          Vigil
        </button>

        {/* Desktop nav links */}
        <div className={styles.links}>
          <button
            className={`${styles.link} ${router.pathname === '/dashboard' ? styles.active : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`${styles.link} ${router.pathname === '/calories' ? styles.active : ''}`}
            onClick={() => navigate('/calories')}
          >
            Calories
          </button>
          <button
            className={`${styles.link} ${router.pathname === '/steps' ? styles.active : ''}`}
            onClick={() => navigate('/steps')}
          >
            Steps
          </button>
          <button
            className={`${styles.link} ${router.pathname === '/workouts' ? styles.active : ''}`}
            onClick={() => navigate('/workouts')}
          >
            Workouts
          </button>
          <button
            className={`${styles.link} ${router.pathname === '/weight' ? styles.active : ''}`}
            onClick={() => navigate('/weight')}
          >
            Weight
          </button>
          <button
            className={`${styles.link} ${router.pathname === '/progress' ? styles.active : ''}`}
            onClick={() => navigate('/progress')}
          >
            Progress
          </button>
        </div>

        <div className={styles.right}>
          <button
            className={styles.themeToggle}
            onClick={handleThemeToggle}
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? '●' : '○'}
          </button>
          <button
            className={styles.navLink}
            onClick={() => navigate('/settings')}
          >
            Settings
          </button>
          <button
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>

        {/* Hamburger — mobile only */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Open menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}>
        <div className={styles.mobileNav}>
          <button className={styles.mobileNavButton} onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <button className={styles.mobileNavButton} onClick={() => navigate('/calories')}>
            Calories
          </button>
          <button className={styles.mobileNavButton} onClick={() => navigate('/steps')}>
            Steps
          </button>
          <button className={styles.mobileNavButton} onClick={() => navigate('/workouts')}>
            Workouts
          </button>
          <button className={styles.mobileNavButton} onClick={() => navigate('/weight')}>
            Weight
          </button>
          <button className={styles.mobileNavButton} onClick={() => navigate('/progress')}>
            Progress
          </button>
          <button className={styles.mobileNavButton} onClick={() => navigate('/settings')}>
            Settings
          </button>
          <button className={styles.mobileNavButton} onClick={handleThemeToggle}>
            {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          </button>
          <button className={styles.mobileNavButton} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}