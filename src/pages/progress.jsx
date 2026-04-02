/* ============================================
   progress.jsx
   Vigil — Ashborne
   Progress charts — visualises calorie history,
   step history and workout frequency over time.
   Uses Recharts for all chart rendering.
   ============================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Progress.module.css'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import Skeleton from '../components/Skeleton'

export default function Progress() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)
  const [calorieData, setCalorieData] = useState([])
  const [stepData, setStepData] = useState([])
  const [workoutData, setWorkoutData] = useState([])
  const [settings, setSettings] = useState({
    calorie_goal: 2000,
    step_goal: 10000,
  })

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      await Promise.all([
        fetchChartData(session.user.id, range),
        fetchSettings(session.user.id),
      ])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  /* Refetch when date range changes */
  useEffect(() => {
    if (user) fetchChartData(user.id, range)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  async function fetchSettings(userId) {
    const { data } = await supabase
      .from('vigil_user_settings')
      .select('calorie_goal, step_goal')
      .eq('user_id', userId)
      .single()

    if (data) setSettings(data)
  }

  async function fetchChartData(userId, days) {
    /* Calculate start date for the selected range */
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startStr = startDate.toISOString().split('T')[0]

    /* Build array of all dates in range for filling gaps */
    const dateArray = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dateArray.push(d.toISOString().split('T')[0])
    }

    /* Fetch calories grouped by date */
    const { data: meals } = await supabase
      .from('vigil_meals')
      .select('date, total_calories')
      .eq('user_id', userId)
      .gte('date', startStr)
      .order('date', { ascending: true })

    /* Fetch steps grouped by date */
    const { data: steps } = await supabase
      .from('vigil_steps')
      .select('date, steps')
      .eq('user_id', userId)
      .gte('date', startStr)
      .order('date', { ascending: true })

    /* Fetch workouts grouped by date */
    const { data: workouts } = await supabase
      .from('vigil_workouts')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startStr)
      .order('date', { ascending: true })

    /* Group calories by date — sum all meals for each day */
    const calMap = {}
    meals?.forEach(m => {
      calMap[m.date] = (calMap[m.date] || 0) + m.total_calories
    })

    /* Group steps by date */
    const stepMap = {}
    steps?.forEach(s => { stepMap[s.date] = s.steps })

    /* Group workouts by date — count sessions per day */
    const workoutMap = {}
    workouts?.forEach(w => {
      workoutMap[w.date] = (workoutMap[w.date] || 0) + 1
    })

    /* Build chart arrays with short date labels
       filling in 0 for days with no data */
    const calData = dateArray.map(date => ({
      date: formatDateShort(date),
      calories: Math.round(calMap[date] || 0),
    }))

    const stpData = dateArray.map(date => ({
      date: formatDateShort(date),
      steps: stepMap[date] || 0,
    }))

    const wktData = dateArray.map(date => ({
      date: formatDateShort(date),
      workouts: workoutMap[date] || 0,
    }))

    setCalorieData(calData)
    setStepData(stpData)
    setWorkoutData(wktData)
  }

  /* Format date to short label e.g. "3 Apr" */
  function formatDateShort(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }

  /* Custom tooltip styles for all charts */
  const tooltipStyle = {
    backgroundColor: 'var(--colour-bg-card)',
    border: '1px solid var(--colour-border)',
    borderRadius: '4px',
    fontFamily: 'Courier New, monospace',
    fontSize: '0.75rem',
    color: 'var(--colour-text-primary)',
  }

  if (loading) return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
      <Skeleton height="2rem" width="200px" style={{ marginBottom: '2rem' }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ marginBottom: '0.75rem' }}>
          <Skeleton height="60px" />
        </div>
      ))}
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <h1>Progress</h1>

          {/* Date range selector */}
          <div className={styles.rangeSelector}>
            {[7, 30, 90].map(r => (
              <button
                key={r}
                className={`${styles.rangeButton} ${range === r ? styles.rangeActive : ''}`}
                onClick={() => setRange(r)}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {/* Calories chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2>Calories</h2>
            <span className={styles.chartGoal}>
              Goal {settings.calorie_goal.toLocaleString()} kcal
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={calorieData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--colour-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontFamily: 'Courier New', fill: 'var(--colour-text-muted)' }}
                tickLine={false}
                axisLine={false}
                interval={range === 7 ? 0 : range === 30 ? 6 : 14}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: 'Courier New', fill: 'var(--colour-text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'var(--colour-bg-secondary)' }}
                formatter={(value) => [`${value} kcal`, 'Calories']}
              />
              <Bar
                dataKey="calories"
                fill="var(--colour-accent)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Steps chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2>Steps</h2>
            <span className={styles.chartGoal}>
              Goal {settings.step_goal.toLocaleString()} steps
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stepData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--colour-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontFamily: 'Courier New', fill: 'var(--colour-text-muted)' }}
                tickLine={false}
                axisLine={false}
                interval={range === 7 ? 0 : range === 30 ? 6 : 14}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: 'Courier New', fill: 'var(--colour-text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value.toLocaleString()}`, 'Steps']}
              />
              <Line
                type="monotone"
                dataKey="steps"
                stroke="var(--colour-accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--colour-accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Workout frequency chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2>Workout Frequency</h2>
            <span className={styles.chartGoal}>Sessions per day</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workoutData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--colour-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontFamily: 'Courier New', fill: 'var(--colour-text-muted)' }}
                tickLine={false}
                axisLine={false}
                interval={range === 7 ? 0 : range === 30 ? 6 : 14}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: 'Courier New', fill: 'var(--colour-text-muted)' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'var(--colour-bg-secondary)' }}
                formatter={(value) => [`${value}`, 'Sessions']}
              />
              <Bar
                dataKey="workouts"
                fill="var(--colour-success)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}