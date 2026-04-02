/* ============================================
   dashboard.jsx
   Vigil — Ashborne
   Main dashboard — shows today's stats at a
   glance. Calories, steps and workout summary.
   Protected route.
   ============================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Dashboard.module.css'
import Skeleton from '../components/Skeleton'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [todayStats, setTodayStats] = useState({
    calories: 0,
    steps: 0,
    workouts: 0,
  })
  const [settings, setSettings] = useState({
    unit_preference: 'metric',
    calorie_goal: 2000,
    step_goal: 10000,
  })

  /* Get today's date as a string in YYYY-MM-DD format */
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setUser(session.user)
      await Promise.all([
        fetchTodayStats(session.user.id),
        fetchSettings(session.user.id),
      ])
      setLoading(false)
    }

    init()
  }, [router])

  /* Fetch today's calories, steps and workout count */
  async function fetchTodayStats(userId) {
    const [mealsRes, stepsRes, workoutsRes] = await Promise.all([
      supabase
        .from('vigil_meals')
        .select('total_calories')
        .eq('user_id', userId)
        .eq('date', today),
      supabase
        .from('vigil_steps')
        .select('steps')
        .eq('user_id', userId)
        .eq('date', today)
        .single(),
      supabase
        .from('vigil_workouts')
        .select('id')
        .eq('user_id', userId)
        .eq('date', today),
    ])

    /* Sum up total calories from all meals today */
    const totalCalories = mealsRes.data
      ? mealsRes.data.reduce((sum, m) => sum + m.total_calories, 0)
      : 0

    setTodayStats({
      calories: Math.round(totalCalories),
      steps: stepsRes.data?.steps || 0,
      workouts: workoutsRes.data?.length || 0,
    })
  }

  /* Fetch user settings for goals */
  async function fetchSettings(userId) {
    const { data } = await supabase
      .from('vigil_user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) setSettings(data)
  }

  if (loading) return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
      <Skeleton height="2rem" width="200px" style={{ marginBottom: '0.5rem' }} />
      <Skeleton height="1rem" width="160px" style={{ marginBottom: '2rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[1,2,3].map(i => <Skeleton key={i} height="180px" />)}
      </div>
    </div>
  )

  /* Calculate progress percentages for goal bars */
  const caloriePercent = Math.min(
    Math.round((todayStats.calories / settings.calorie_goal) * 100),
    100
  )
  const stepPercent = Math.min(
    Math.round((todayStats.steps / settings.step_goal) * 100),
    100
  )

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <div>
            <h1>Dashboard</h1>
            <p className={styles.date}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Today's stats grid */}
        <div className={styles.statsGrid}>

          {/* Calories card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Calories</span>
              <span className={styles.statGoal}>
                goal {settings.calorie_goal.toLocaleString()}
              </span>
            </div>
            <div className={styles.statValue}>
              {todayStats.calories.toLocaleString()}
              <span className={styles.statUnit}>kcal</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${caloriePercent}%` }}
              />
            </div>
            <span className={styles.progressLabel}>{caloriePercent}% of goal</span>
            <button
              className={styles.quickAdd}
              onClick={() => router.push('/calories')}
            >
              Log meal →
            </button>
          </div>

          {/* Steps card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Steps</span>
              <span className={styles.statGoal}>
                goal {settings.step_goal.toLocaleString()}
              </span>
            </div>
            <div className={styles.statValue}>
              {todayStats.steps.toLocaleString()}
              <span className={styles.statUnit}>steps</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${stepPercent}%` }}
              />
            </div>
            <span className={styles.progressLabel}>{stepPercent}% of goal</span>
            <button
              className={styles.quickAdd}
              onClick={() => router.push('/steps')}
            >
              Update steps →
            </button>
          </div>

          {/* Workouts card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Workouts</span>
              <span className={styles.statGoal}>today</span>
            </div>
            <div className={styles.statValue}>
              {todayStats.workouts}
              <span className={styles.statUnit}>
                {todayStats.workouts === 1 ? 'session' : 'sessions'}
              </span>
            </div>
            <div className={styles.workoutBar}>
              {todayStats.workouts > 0 ? (
                <span className={styles.workoutDone}>✓ Logged today</span>
              ) : (
                <span className={styles.workoutNone}>Nothing logged yet</span>
              )}
            </div>
            <button
              className={styles.quickAdd}
              onClick={() => router.push('/workouts')}
            >
              Log workout →
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}