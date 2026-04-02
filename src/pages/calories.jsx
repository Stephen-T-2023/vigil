/* ============================================
   calories.jsx
   Vigil — Ashborne
   Calorie tracker page — log meals by entering
   calories per 100g and amount in grams. Auto
   calculates total calories. Shows daily log
   with running total. Supports viewing previous
   days.
   ============================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Calories.module.css'
import toast from 'react-hot-toast'
import Skeleton from '../components/Skeleton'

export default function Calories() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState([])
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  /* Form state */
  const [name, setName] = useState('')
  const [caloriesPer100g, setCaloriesPer100g] = useState('')
  const [amountG, setAmountG] = useState('')
  const [creating, setCreating] = useState(false)

  const [settings, setSettings] = useState({ calorie_goal: 2000 })

  /* Auto calculated total calories */
  const calculatedCalories =
    caloriesPer100g && amountG
      ? Math.round((parseFloat(caloriesPer100g) * parseFloat(amountG)) / 100)
      : 0

  /* Total calories for the selected day */
  const dailyTotal = Math.round(
    meals.reduce((sum, m) => sum + m.total_calories, 0)
  )

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      await fetchMeals(session.user.id, selectedDate)
      await fetchSettings(session.user.id),
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  /* Refetch meals when date changes */
  useEffect(() => {
    if (user) fetchMeals(user.id, selectedDate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  async function fetchMeals(userId, date) {
    const { data, error } = await supabase
      .from('vigil_meals')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Failed to load meals')
    } else {
      setMeals(data)
    }
  }

  async function fetchSettings(userId) {
    const { data } = await supabase
      .from('vigil_user_settings')
      .select('calorie_goal')
      .eq('user_id', userId)
      .single()

    if (data) setSettings(data)
  }

  async function handleAddMeal(e) {
    e.preventDefault()
    if (!name.trim() || !caloriesPer100g || !amountG) return
    setCreating(true)

    const { data, error } = await supabase
      .from('vigil_meals')
      .insert([{
        user_id: user.id,
        name: name.trim(),
        calories_per_100g: parseFloat(caloriesPer100g),
        amount_g: parseFloat(amountG),
        total_calories: calculatedCalories,
        date: selectedDate,
      }])
      .select()

    if (error) {
      toast.error('Failed to add meal')
    } else {
      setMeals([...meals, data[0]])
      setName('')
      setCaloriesPer100g('')
      setAmountG('')
      toast.success('Meal logged')
    }

    setCreating(false)
  }

  async function handleDeleteMeal(id) {
    const { error } = await supabase
      .from('vigil_meals')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete meal')
    } else {
      setMeals(meals.filter(m => m.id !== id))
      toast.success('Meal deleted')
    }
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

  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <div>
            <h1>Calories</h1>
            <p className={styles.total}>
              {dailyTotal.toLocaleString()} kcal logged
            </p>
          </div>

          {/* Date selector */}
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

        {/* Quick link to calorie goal settings */}
        <div className={styles.settingsHint}>
          <span>Daily goal set to {settings.calorie_goal?.toLocaleString() || 2000} kcal</span>
          <button
            className={styles.settingsLink}
            onClick={() => router.push('/settings')}
          >
            Change goal →
          </button>
        </div>

        {/* Add meal form */}
        <form onSubmit={handleAddMeal} className={styles.form}>
          <h3>Log a meal</h3>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Food name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken breast"
                required
              />
            </div>
            <div className={styles.field}>
              <label>Calories per 100g</label>
              <input
                type="number"
                value={caloriesPer100g}
                onChange={(e) => setCaloriesPer100g(e.target.value)}
                placeholder="e.g. 165"
                min="0"
                required
              />
            </div>
            <div className={styles.field}>
              <label>Amount (g)</label>
              <input
                type="number"
                value={amountG}
                onChange={(e) => setAmountG(e.target.value)}
                placeholder="e.g. 200"
                min="0"
                required
              />
            </div>
            <div className={styles.field}>
              <label>Total calories</label>
              <div className={styles.calculatedValue}>
                {calculatedCalories > 0 ? `${calculatedCalories} kcal` : '—'}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className={styles.addButton}
          >
            {creating ? 'Adding...' : 'Add Meal'}
          </button>
        </form>

        {/* Meals list */}
        {meals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No meals logged {isToday ? 'today' : 'on this day'}.</p>
          </div>
        ) : (
          <div className={styles.mealsList}>
            <div className={styles.mealsHeader}>
              <span>Meal</span>
              <span>Amount</span>
              <span>Calories</span>
              <span />
            </div>
            {meals.map(meal => (
              <MealRow
                key={meal.id}
                meal={meal}
                onDelete={handleDeleteMeal}
              />
            ))}
            <div className={styles.dailyTotal}>
              <span>Daily total</span>
              <span />
              <span className={styles.totalValue}>
                {dailyTotal.toLocaleString()} kcal
              </span>
              <span />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

/* ============================================
   MealRow component
   Single meal entry with delete confirmation
   ============================================ */
function MealRow({ meal, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className={styles.mealRow}>
      <span className={styles.mealName}>{meal.name}</span>
      <span className={styles.mealAmount}>{meal.amount_g}g</span>
      <span className={styles.mealCalories}>
        {Math.round(meal.total_calories)} kcal
      </span>
      <div className={styles.mealActions}>
        {confirming ? (
          <>
            <button
              className={styles.confirmButton}
              onClick={() => onDelete(meal.id)}
            >
              Yes
            </button>
            <button
              className={styles.cancelButton}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className={styles.deleteButton}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}