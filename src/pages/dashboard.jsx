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
    protein: 0,
    carbs: 0,
    fat: 0,
    weight: null,
    weightUnit: 'metric',
  })
  const [settings, setSettings] = useState({
    unit_preference: 'metric',
    calorie_goal: 2000,
    step_goal: 10000,
    protein_goal: 150,
    carbs_goal: 250,
    fat_goal: 70,
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
    const [mealsRes, stepsRes, workoutsRes, weightRes] = await Promise.all([
      supabase
        .from('vigil_meals')
        .select('total_calories, protein_g, carbs_g, fat_g')
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
      supabase
        .from('vigil_weight_log')
        .select('weight, unit')
        .eq('user_id', userId)
        .eq('date', today)
        .single(),
    ])

    const totalCalories = mealsRes.data
      ? mealsRes.data.reduce((sum, m) => sum + m.total_calories, 0)
      : 0

    const totalProtein = mealsRes.data
      ? mealsRes.data.reduce((sum, m) => sum + (m.protein_g || 0), 0)
      : 0

    const totalCarbs = mealsRes.data
      ? mealsRes.data.reduce((sum, m) => sum + (m.carbs_g || 0), 0)
      : 0

    const totalFat = mealsRes.data
      ? mealsRes.data.reduce((sum, m) => sum + (m.fat_g || 0), 0)
      : 0

    setTodayStats({
      calories: Math.round(totalCalories),
      steps: stepsRes.data?.steps || 0,
      workouts: workoutsRes.data?.length || 0,
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
      weight: weightRes.data?.weight || null,
      weightUnit: weightRes.data?.unit || 'metric',
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

          {/* Macros card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Macros</span>
              <span className={styles.statGoal}>today</span>
            </div>
            <div className={styles.macroList}>
              <div className={styles.macroItem}>
                <div className={styles.macroItemHeader}>
                  <span className={styles.macroItemLabel}>Protein</span>
                  <span className={styles.macroItemValue}>
                    {todayStats.protein}g / {settings.protein_goal || 150}g
                  </span>
                </div>
                <div className={styles.miniBar}>
                  <div
                    className={styles.miniBarFill}
                    style={{
                      width: `${Math.min(Math.round((todayStats.protein / (settings.protein_goal || 150)) * 100), 100)}%`,
                      background: 'var(--colour-success)'
                    }}
                  />
                </div>
              </div>
              <div className={styles.macroItem}>
                <div className={styles.macroItemHeader}>
                  <span className={styles.macroItemLabel}>Carbs</span>
                  <span className={styles.macroItemValue}>
                    {todayStats.carbs}g / {settings.carbs_goal || 250}g
                  </span>
                </div>
                <div className={styles.miniBar}>
                  <div
                    className={styles.miniBarFill}
                    style={{
                      width: `${Math.min(Math.round((todayStats.carbs / (settings.carbs_goal || 250)) * 100), 100)}%`,
                      background: 'var(--colour-accent)'
                    }}
                  />
                </div>
              </div>
              <div className={styles.macroItem}>
                <div className={styles.macroItemHeader}>
                  <span className={styles.macroItemLabel}>Fat</span>
                  <span className={styles.macroItemValue}>
                    {todayStats.fat}g / {settings.fat_goal || 70}g
                  </span>
                </div>
                <div className={styles.miniBar}>
                  <div
                    className={styles.miniBarFill}
                    style={{
                      width: `${Math.min(Math.round((todayStats.fat / (settings.fat_goal || 70)) * 100), 100)}%`,
                      background: 'var(--colour-danger)'
                    }}
                  />
                </div>
              </div>
            </div>
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

          {/* Weight card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Weight</span>
              <span className={styles.statGoal}>today</span>
            </div>
            <div className={styles.statValue}>
              {todayStats.weight !== null ? (
                <>
                  {todayStats.weight}
                  <span className={styles.statUnit}>
                    {todayStats.weightUnit === 'metric' ? 'kg' : 'lbs'}
                  </span>
                </>
              ) : (
                <span className={styles.noData}>—</span>
              )}
            </div>
            <div className={styles.workoutBar}>
              {todayStats.weight !== null ? (
                <span className={styles.workoutDone}>✓ Logged today</span>
              ) : (
                <span className={styles.workoutNone}>Not logged yet</span>
              )}
            </div>
            <button
              className={styles.quickAdd}
              onClick={() => router.push('/weight')}
            >
              Log weight →
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}