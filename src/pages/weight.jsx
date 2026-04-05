/* ============================================
   weight.jsx
   Vigil — Ashborne
   Weight tracking page — log daily weight
   entries and view history over time.
   ============================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Weight.module.css'
import toast from 'react-hot-toast'
import Skeleton from '../components/Skeleton'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function Weight() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [weightInput, setWeightInput] = useState('')
  const [unit, setUnit] = useState('metric')
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [existingEntry, setExistingEntry] = useState(null)
  const [range, setRange] = useState(30)

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
        fetchEntries(session.user.id),
        fetchSettings(session.user.id),
      ])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  /* Refetch when date changes to check for existing entry */
  useEffect(() => {
    if (user) checkExistingEntry(user.id, selectedDate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  async function fetchEntries(userId) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)
    const startStr = startDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('vigil_weight_log')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startStr)
      .order('date', { ascending: true })

    if (error) {
      toast.error('Failed to load weight entries')
    } else {
      setEntries(data)
      /* Check if today already has an entry */
      const todayEntry = data.find(e => e.date === selectedDate)
      if (todayEntry) {
        setExistingEntry(todayEntry)
        setWeightInput(todayEntry.weight.toString())
        setUnit(todayEntry.unit)
      }
    }
  }

  async function fetchSettings(userId) {
    const { data } = await supabase
      .from('vigil_user_settings')
      .select('unit_preference')
      .eq('user_id', userId)
      .single()

    if (data) setUnit(data.unit_preference)
  }

  async function checkExistingEntry(userId, date) {
    const { data } = await supabase
      .from('vigil_weight_log')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (data) {
      setExistingEntry(data)
      setWeightInput(data.weight.toString())
      setUnit(data.unit)
    } else {
      setExistingEntry(null)
      setWeightInput('')
    }
  }

  async function handleSaveWeight(e) {
    e.preventDefault()
    if (!weightInput) return
    setSaving(true)

    const weight = parseFloat(weightInput)

    if (existingEntry) {
      /* Update existing entry */
      const { error } = await supabase
        .from('vigil_weight_log')
        .update({ weight, unit })
        .eq('id', existingEntry.id)

      if (error) {
        toast.error('Failed to update weight')
      } else {
        setEntries(entries.map(e =>
          e.id === existingEntry.id ? { ...e, weight, unit } : e
        ))
        setExistingEntry({ ...existingEntry, weight, unit })
        toast.success('Weight updated')
      }
    } else {
      /* Create new entry */
      const { data, error } = await supabase
        .from('vigil_weight_log')
        .insert([{ user_id: user.id, weight, unit, date: selectedDate }])
        .select()
        .single()

      if (error) {
        toast.error('Failed to save weight')
      } else {
        setEntries([...entries, data].sort((a, b) =>
          a.date.localeCompare(b.date)
        ))
        setExistingEntry(data)
        toast.success('Weight saved')
      }
    }

    setSaving(false)
  }

  async function handleDeleteEntry(id) {
    const { error } = await supabase
      .from('vigil_weight_log')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete entry')
    } else {
      setEntries(entries.filter(e => e.id !== id))
      if (existingEntry?.id === id) {
        setExistingEntry(null)
        setWeightInput('')
      }
      toast.success('Entry deleted')
    }
  }

  /* Build chart data for selected range */
  const chartData = entries
    .filter(e => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - range)
      return new Date(e.date) >= cutoff
    })
    .map(e => ({
      date: new Date(e.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      }),
      weight: e.weight,
      unit: e.unit,
    }))

  const unitLabel = unit === 'metric' ? 'kg' : 'lbs'

  const tooltipStyle = {
    backgroundColor: 'var(--colour-bg-card)',
    border: '1px solid var(--colour-border)',
    borderRadius: '4px',
    fontFamily: 'Courier New, monospace',
    fontSize: '0.75rem',
    color: 'var(--colour-text-primary)',
  }

  if (loading) return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: 760, margin: '0 auto' }}>
      <Skeleton height="2rem" width="200px" />
      <div style={{ marginTop: '2rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ marginBottom: '0.75rem' }}>
            <Skeleton height="60px" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <div>
            <h1>Weight</h1>
            <p className={styles.subtitle}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} logged
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
                day: 'numeric', month: 'short', year: 'numeric'
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

        {/* Log weight card */}
        <div className={styles.logCard}>
          <form onSubmit={handleSaveWeight} className={styles.form}>
            <div className={styles.inputRow}>
              <input
                type="number"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder={`Enter weight in ${unitLabel}`}
                min="0"
                step="0.1"
                className={styles.weightInput}
                required
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={styles.unitSelect}
              >
                <option value="metric">kg</option>
                <option value="imperial">lbs</option>
              </select>
              <button
                type="submit"
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? 'Saving...' : existingEntry ? 'Update' : 'Save'}
              </button>
            </div>
          </form>

          {existingEntry && (
            <div className={styles.currentEntry}>
              <span className={styles.currentWeight}>
                {existingEntry.weight} {existingEntry.unit === 'metric' ? 'kg' : 'lbs'}
              </span>
              <span className={styles.currentLabel}>logged</span>
              <button
                className={styles.deleteButton}
                onClick={() => handleDeleteEntry(existingEntry.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Weight chart */}
        {chartData.length > 1 && (
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2>Weight History</h2>
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
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
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
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value} ${unitLabel}`, 'Weight']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--colour-accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--colour-accent)' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent entries list */}
        {entries.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No weight entries yet. Log your first above.</p>
          </div>
        ) : (
          <div className={styles.entriesList}>
            <h3 className={styles.listTitle}>Recent Entries</h3>
            {[...entries].reverse().slice(0, 10).map(entry => (
              <div key={entry.id} className={styles.entryRow}>
                <span className={styles.entryDate}>
                  {new Date(entry.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <span className={styles.entryWeight}>
                  {entry.weight} {entry.unit === 'metric' ? 'kg' : 'lbs'}
                </span>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteEntry(entry.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}