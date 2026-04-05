/* ============================================
   settings.jsx
   Vigil — Ashborne
   User settings page — unit preference, calorie
   goal, step goal and account management.
   ============================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Settings.module.css'
import toast from 'react-hot-toast'
import Skeleton from '../components/Skeleton'

export default function Settings() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  /* Settings state */
  const [unitPreference, setUnitPreference] = useState('metric')
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [stepGoal, setStepGoal] = useState(10000)
  const [settingsId, setSettingsId] = useState(null)

  /* Account state */
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [updatingEmail, setUpdatingEmail] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [proteinGoal, setProteinGoal] = useState(150)
  const [carbsGoal, setCarbsGoal] = useState(250)
  const [fatGoal, setFatGoal] = useState(70)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      await fetchSettings(session.user.id)
      setLoading(false)
    }
    init()
  }, [router])

  async function fetchSettings(userId) {
    const { data } = await supabase
      .from('vigil_user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      setSettingsId(data.id)
      setUnitPreference(data.unit_preference)
      setCalorieGoal(data.calorie_goal)
      setStepGoal(data.step_goal)
      setProteinGoal(data.protein_goal || 150)
      setCarbsGoal(data.carbs_goal || 250)
      setFatGoal(data.fat_goal || 70)
    }
  }

  /* Save or create settings row */
  async function handleSaveSettings(e) {
    e.preventDefault()
    setSaving(true)

    if (settingsId) {
      const { error } = await supabase
        .from('vigil_user_settings')
        .update({
          unit_preference: unitPreference,
          calorie_goal: calorieGoal,
          step_goal: stepGoal,
          protein_goal: proteinGoal,
          carbs_goal: carbsGoal,
          fat_goal: fatGoal,
        })
        .eq('id', settingsId)

      if (error) {
        toast.error('Failed to save settings')
      } else {
        toast.success('Settings saved')
      }
    } else {
      const { data, error } = await supabase
        .from('vigil_user_settings')
        .insert([{
          user_id: user.id,
          unit_preference: unitPreference,
          calorie_goal: calorieGoal,
          step_goal: stepGoal,
          protein_goal: proteinGoal,
          carbs_goal: carbsGoal,
          fat_goal: fatGoal,
        }])
        .select()
        .single()

      if (error) {
        toast.error('Failed to save settings')
      } else {
        setSettingsId(data.id)
        toast.success('Settings saved')
      }
    }

    setSaving(false)
  }

  async function handleUpdateEmail(e) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setUpdatingEmail(true)

    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Confirmation email sent to your new address')
      setNewEmail('')
    }

    setUpdatingEmail(false)
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setUpdatingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    }

    setUpdatingPassword(false)
  }

  async function handleDeleteAccount(e) {
    e.preventDefault()
    if (deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm')
      return
    }
    setDeleting(true)

    /* Delete all user data then sign out */
    await Promise.all([
      supabase.from('vigil_meals').delete().eq('user_id', user.id),
      supabase.from('vigil_steps').delete().eq('user_id', user.id),
      supabase.from('vigil_workouts').delete().eq('user_id', user.id),
      supabase.from('vigil_workout_templates').delete().eq('user_id', user.id),
      supabase.from('vigil_user_settings').delete().eq('user_id', user.id),
    ])

    await supabase.auth.signOut()
    router.push('/login')
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
          <h1>Settings</h1>
          <p>{user?.email}</p>
        </div>

        {/* App settings */}
        <section className={styles.section}>
          <h2>Preferences</h2>
          <p className={styles.sectionDescription}>
            Customise your goals and unit preferences.
          </p>
          <form onSubmit={handleSaveSettings} className={styles.form}>
            <div className={styles.field}>
              <label>Unit Preference</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="unit"
                    value="metric"
                    checked={unitPreference === 'metric'}
                    onChange={() => setUnitPreference('metric')}
                    className={styles.radio}
                  />
                  Metric (kg, km)
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="unit"
                    value="imperial"
                    checked={unitPreference === 'imperial'}
                    onChange={() => setUnitPreference('imperial')}
                    className={styles.radio}
                  />
                  Imperial (lbs, miles)
                </label>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>Daily Calorie Goal</label>
                <input
                  type="number"
                  value={calorieGoal}
                  onChange={(e) => setCalorieGoal(parseInt(e.target.value))}
                  min="0"
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>Daily Protein Goal (g)</label>
                  <input
                    type="number"
                    value={proteinGoal}
                    onChange={(e) => setProteinGoal(parseInt(e.target.value))}
                    min="0"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Daily Carbs Goal (g)</label>
                  <input
                    type="number"
                    value={carbsGoal}
                    onChange={(e) => setCarbsGoal(parseInt(e.target.value))}
                    min="0"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Daily Fat Goal (g)</label>
                  <input
                    type="number"
                    value={fatGoal}
                    onChange={(e) => setFatGoal(parseInt(e.target.value))}
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label>Daily Step Goal</label>
                <input
                  type="number"
                  value={stepGoal}
                  onChange={(e) => setStepGoal(parseInt(e.target.value))}
                  min="0"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </section>

        {/* Change email */}
        <section className={styles.section}>
          <h2>Change Email</h2>
          <p className={styles.sectionDescription}>
            A confirmation link will be sent to your new email address.
          </p>
          <form onSubmit={handleUpdateEmail} className={styles.form}>
            <div className={styles.field}>
              <label>New Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={updatingEmail}
              className={styles.saveButton}
            >
              {updatingEmail ? 'Sending...' : 'Update Email'}
            </button>
          </form>
        </section>

        {/* Change password */}
        <section className={styles.section}>
          <h2>Change Password</h2>
          <p className={styles.sectionDescription}>
            Must be at least 6 characters.
          </p>
          <form onSubmit={handleUpdatePassword} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={updatingPassword}
              className={styles.saveButton}
            >
              {updatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* Delete account */}
        <section className={`${styles.section} ${styles.dangerSection}`}>
          <h2>Delete Account</h2>
          <p className={styles.sectionDescription}>
            Permanently deletes your account and all fitness data. This cannot be undone.
          </p>
          <form onSubmit={handleDeleteAccount} className={styles.form}>
            <div className={styles.field}>
              <label>Type DELETE to confirm</label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <button
              type="submit"
              disabled={deleting || deleteConfirm !== 'DELETE'}
              className={styles.deleteButton}
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </form>
        </section>

      </div>
    </div>
  )
}