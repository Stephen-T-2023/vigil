/* ============================================
   steps.jsx
   Vigil — Ashborne
   Step counter page — manually log daily steps.
   Shows today's count and history by date.
   ============================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Steps.module.css'
import toast from 'react-hot-toast'
import Skeleton from '../components/Skeleton'

export default function Steps() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stepEntry, setStepEntry] = useState(null)
  const [stepInput, setStepInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [settings, setSettings] = useState({ step_goal: 10000 })

  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      await Promise.all([
        fetchSteps(session.user.id, selectedDate),
        fetchSettings(session.user.id),
      ])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (user) fetchSteps(user.id, selectedDate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  async function fetchSteps(userId, date) {
    const { data } = await supabase
      .from('vigil_steps')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (data) {
      setStepEntry(data)
      setStepInput(data.steps.toString())
    } else {
      setStepEntry(null)
      setStepInput('')
    }
  }

  async function fetchSettings(userId) {
    const { data } = await supabase
      .from('vigil_user_settings')
      .select('step_goal')
      .eq('user_id', userId)
      .single()

    if (data) setSettings(data)
  }

  /* Save or update step count for the selected date */
  async function handleSaveSteps(e) {
    e.preventDefault()
    if (!stepInput) return
    setSaving(true)

    const steps = parseInt(stepInput)

    if (stepEntry) {
      /* Update existing entry */
      const { error } = await supabase
        .from('vigil_steps')
        .update({ steps })
        .eq('id', stepEntry.id)

      if (error) {
        toast.error('Failed to update steps')
      } else {
        setStepEntry({ ...stepEntry, steps })
        toast.success('Steps updated')
      }
    } else {
      /* Create new entry */
      const { data, error } = await supabase
        .from('vigil_steps')
        .insert([{ user_id: user.id, steps, date: selectedDate }])
        .select()
        .single()

      if (error) {
        toast.error('Failed to save steps')
      } else {
        setStepEntry(data)
        toast.success('Steps saved')
      }
    }

    setSaving(false)
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

  const currentSteps = stepEntry?.steps || 0
  const stepPercent = Math.min(
    Math.round((currentSteps / settings.step_goal) * 100),
    100
  )

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <div>
            <h1>Steps</h1>
            <p className={styles.subtitle}>
              Goal: {settings.step_goal.toLocaleString()} steps
            </p>
          </div>

          {/* Date navigation */}
          <div className={styles.dateNav}>
            <button
              className={styles.dateButton}
              onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() - 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}
            >
              ←
            </button>
            <span className={styles.dateLabel}>
              {isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
            <button
              className={styles.dateButton}
              onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() + 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}
              disabled={isToday}
            >
              →
            </button>
          </div>
        </div>

        {/* Quick link to step goal settings */}
        <div className={styles.settingsHint}>
          <span>Daily goal set to {settings.step_goal?.toLocaleString() || 10000} steps</span>
          <button
            className={styles.settingsLink}
            onClick={() => router.push('/settings')}
          >
            Change goal →
          </button>
        </div>

        {/* Step count display */}
        <div className={styles.stepCard}>
          <div className={styles.stepDisplay}>
            <span className={styles.stepCount}>
              {currentSteps.toLocaleString()}
            </span>
            <span className={styles.stepLabel}>steps</span>
          </div>

          {/* Progress bar */}
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${stepPercent}%` }}
              />
            </div>
            <span className={styles.progressLabel}>
              {stepPercent}% of goal
            </span>
          </div>

          {/* Step entry form */}
          <form onSubmit={handleSaveSteps} className={styles.form}>
            <div className={styles.inputRow}>
              <input
                type="number"
                value={stepInput}
                onChange={(e) => setStepInput(e.target.value)}
                placeholder="Enter step count"
                min="0"
                className={styles.stepInput}
                required
              />
              <button
                type="submit"
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? 'Saving...' : stepEntry ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}