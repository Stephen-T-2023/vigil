/* ============================================
   calories.jsx
   Vigil — Ashborne
   Calorie tracker — log meals with flexible
   serving sizes, macros and meal templates.
   Shows daily log with running totals.
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
  const [templates, setTemplates] = useState([])
  const [settings, setSettings] = useState({
    calorie_goal: 2000,
    protein_goal: 150,
    carbs_goal: 250,
    fat_goal: 70,
  })
  const [activeTab, setActiveTab] = useState('log')
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  /* Log meal form state */
  const [name, setName] = useState('')
  const [caloriesPerServing, setCaloriesPerServing] = useState('')
  const [servingSizeG, setServingSizeG] = useState('100')
  const [amountG, setAmountG] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbsG, setCarbsG] = useState('')
  const [fatG, setFatG] = useState('')
  const [creating, setCreating] = useState(false)

  /* Template form state */
  const [templateName, setTemplateName] = useState('')
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [itemName, setItemName] = useState('')
  const [itemCalories, setItemCalories] = useState('')
  const [itemServing, setItemServing] = useState('100')
  const [itemProtein, setItemProtein] = useState('')
  const [itemCarbs, setItemCarbs] = useState('')
  const [itemFat, setItemFat] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  /* Auto calculated total calories based on serving size */
  const calculatedCalories =
    caloriesPerServing && servingSizeG && amountG
      ? Math.round(
          (parseFloat(caloriesPerServing) / parseFloat(servingSizeG)) *
          parseFloat(amountG)
        )
      : 0

  /* Daily totals */
  const dailyCalories = Math.round(
    meals.reduce((sum, m) => sum + m.total_calories, 0)
  )
  const dailyProtein = Math.round(
    meals.reduce((sum, m) => sum + (m.protein_g || 0), 0)
  )
  const dailyCarbs = Math.round(
    meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0)
  )
  const dailyFat = Math.round(
    meals.reduce((sum, m) => sum + (m.fat_g || 0), 0)
  )

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
        fetchMeals(session.user.id, selectedDate),
        fetchSettings(session.user.id),
        fetchTemplates(session.user.id),
      ])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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
      .select('calorie_goal, protein_goal, carbs_goal, fat_goal')
      .eq('user_id', userId)
      .single()

    if (data) setSettings(data)
  }

  async function fetchTemplates(userId) {
    const { data, error } = await supabase
      .from('vigil_meal_templates')
      .select('*, vigil_meal_template_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Failed to load templates')
    } else {
      setTemplates(data)
    }
  }

  async function handleAddMeal(e) {
    e.preventDefault()
    if (!name.trim() || !caloriesPerServing || !servingSizeG || !amountG) return
    setCreating(true)

    const { data, error } = await supabase
      .from('vigil_meals')
      .insert([{
        user_id: user.id,
        name: name.trim(),
        calories_per_serving: parseFloat(caloriesPerServing),
        serving_size_g: parseFloat(servingSizeG),
        amount_g: parseFloat(amountG),
        total_calories: calculatedCalories,
        protein_g: proteinG ? parseFloat(proteinG) : null,
        carbs_g: carbsG ? parseFloat(carbsG) : null,
        fat_g: fatG ? parseFloat(fatG) : null,
        date: selectedDate,
      }])
      .select()

    if (error) {
      toast.error('Failed to add meal')
    } else {
      setMeals([...meals, data[0]])
      setName('')
      setCaloriesPerServing('')
      setServingSizeG('100')
      setAmountG('')
      setProteinG('')
      setCarbsG('')
      setFatG('')
      toast.success('Meal logged')
    }

    setCreating(false)
  }

  /* Log all items from a template as individual meals */
  async function handleUseTemplate(template) {
    if (!template.vigil_meal_template_items.length) {
      toast.error('This template has no items')
      return
    }

    const meals_to_insert = template.vigil_meal_template_items.map(item => ({
      user_id: user.id,
      name: item.name,
      calories_per_serving: item.calories_per_serving,
      serving_size_g: item.serving_size_g,
      amount_g: item.serving_size_g,
      total_calories: item.calories_per_serving,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      date: selectedDate,
    }))

    const { data, error } = await supabase
      .from('vigil_meals')
      .insert(meals_to_insert)
      .select()

    if (error) {
      toast.error('Failed to log template meals')
    } else {
      setMeals([...meals, ...data])
      toast.success(`Logged ${template.name}`)
    }
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

  async function handleCreateTemplate(e) {
    e.preventDefault()
    if (!templateName.trim()) return
    setCreatingTemplate(true)

    const { data, error } = await supabase
      .from('vigil_meal_templates')
      .insert([{ user_id: user.id, name: templateName.trim() }])
      .select('*, vigil_meal_template_items(*)')
      .single()

    if (error) {
      toast.error('Failed to create template')
    } else {
      setTemplates([...templates, data])
      setActiveTemplate(data)
      setTemplateName('')
      toast.success('Template created')
    }

    setCreatingTemplate(false)
  }

  async function handleAddTemplateItem(e) {
    e.preventDefault()
    if (!itemName.trim() || !itemCalories || !itemServing || !activeTemplate) return
    setAddingItem(true)

    const { data, error } = await supabase
      .from('vigil_meal_template_items')
      .insert([{
        template_id: activeTemplate.id,
        name: itemName.trim(),
        calories_per_serving: parseFloat(itemCalories),
        serving_size_g: parseFloat(itemServing),
        protein_g: itemProtein ? parseFloat(itemProtein) : null,
        carbs_g: itemCarbs ? parseFloat(itemCarbs) : null,
        fat_g: itemFat ? parseFloat(itemFat) : null,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to add item to template')
    } else {
      const updated = {
        ...activeTemplate,
        vigil_meal_template_items: [
          ...activeTemplate.vigil_meal_template_items,
          data
        ]
      }
      setActiveTemplate(updated)
      setTemplates(templates.map(t =>
        t.id === activeTemplate.id ? updated : t
      ))
      setItemName('')
      setItemCalories('')
      setItemServing('100')
      setItemProtein('')
      setItemCarbs('')
      setItemFat('')
      toast.success('Item added to template')
    }

    setAddingItem(false)
  }

  async function handleDeleteTemplate(id) {
    const { error } = await supabase
      .from('vigil_meal_templates')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete template')
    } else {
      setTemplates(templates.filter(t => t.id !== id))
      if (activeTemplate?.id === id) setActiveTemplate(null)
      toast.success('Template deleted')
    }
  }

  if (loading) return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
      <Skeleton height="2rem" width="200px" />
      <div style={{ marginTop: '2rem' }}>
        {[1,2,3].map(i => (
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
            <h1>Calories</h1>
            <p className={styles.total}>
              {dailyCalories.toLocaleString()} kcal logged
            </p>
          </div>

          <div className={styles.headerRight}>
            {/* Tab switcher */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'log' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('log')}
              >
                Log
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'templates' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('templates')}
              >
                Templates
              </button>
            </div>

            {/* Date navigation — log tab only */}
            {activeTab === 'log' && (
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
            )}
          </div>
        </div>

        {/* Log tab */}
        {activeTab === 'log' && (
          <>
            {/* Settings hint */}
            <div className={styles.settingsHint}>
              <span>Daily goal set to {settings.calorie_goal?.toLocaleString() || 2000} kcal</span>
              <button className={styles.settingsLink} onClick={() => router.push('/settings')}>
                Change goal →
              </button>
            </div>
            {/* Daily macro progress */}
            <div className={styles.macroSummary}>
              <div className={styles.macroSummaryItem}>
                <div className={styles.macroSummaryHeader}>
                  <span className={styles.macroSummaryLabel}>Protein</span>
                  <span className={styles.macroSummaryValue}>
                    {dailyProtein}g / {settings.protein_goal || 150}g
                  </span>
                </div>
                <div className={styles.macroBar}>
                  <div
                    className={styles.macroBarFill}
                    style={{
                      width: `${Math.min(Math.round((dailyProtein / (settings.protein_goal || 150)) * 100), 100)}%`,
                      background: 'var(--colour-success)'
                    }}
                  />
                </div>
              </div>
              <div className={styles.macroSummaryItem}>
                <div className={styles.macroSummaryHeader}>
                  <span className={styles.macroSummaryLabel}>Carbs</span>
                  <span className={styles.macroSummaryValue}>
                    {dailyCarbs}g / {settings.carbs_goal || 250}g
                  </span>
                </div>
                <div className={styles.macroBar}>
                  <div
                    className={styles.macroBarFill}
                    style={{
                      width: `${Math.min(Math.round((dailyCarbs / (settings.carbs_goal || 250)) * 100), 100)}%`,
                      background: 'var(--colour-accent)'
                    }}
                  />
                </div>
              </div>
              <div className={styles.macroSummaryItem}>
                <div className={styles.macroSummaryHeader}>
                  <span className={styles.macroSummaryLabel}>Fat</span>
                  <span className={styles.macroSummaryValue}>
                    {dailyFat}g / {settings.fat_goal || 70}g
                  </span>
                </div>
                <div className={styles.macroBar}>
                  <div
                    className={styles.macroBarFill}
                    style={{
                      width: `${Math.min(Math.round((dailyFat / (settings.fat_goal || 70)) * 100), 100)}%`,
                      background: 'var(--colour-danger)'
                    }}
                  />
                </div>
              </div>
            </div>
            {/* Template quick add */}
            {templates.length > 0 && (
              <div className={styles.templateQuick}>
                <span className={styles.templateQuickLabel}>Log from template</span>
                <div className={styles.templateQuickButtons}>
                  {templates.map(t => (
                    <button
                      key={t.id}
                      className={styles.templateQuickButton}
                      onClick={() => handleUseTemplate(t)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  <label>Calories per serving</label>
                  <input
                    type="number"
                    value={caloriesPerServing}
                    onChange={(e) => setCaloriesPerServing(e.target.value)}
                    placeholder="e.g. 165"
                    min="0"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Serving size (g)</label>
                  <input
                    type="number"
                    value={servingSizeG}
                    onChange={(e) => setServingSizeG(e.target.value)}
                    placeholder="e.g. 100"
                    min="0"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Your amount (g)</label>
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

              {/* Macros row — optional */}
              <div className={styles.macroRow}>
                <span className={styles.macroLabel}>Macros (optional)</span>
                <div className={styles.macroInputs}>
                  <div className={styles.field}>
                    <label>Protein (g)</label>
                    <input
                      type="number"
                      value={proteinG}
                      onChange={(e) => setProteinG(e.target.value)}
                      placeholder="e.g. 31"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Carbs (g)</label>
                    <input
                      type="number"
                      value={carbsG}
                      onChange={(e) => setCarbsG(e.target.value)}
                      placeholder="e.g. 0"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Fat (g)</label>
                    <input
                      type="number"
                      value={fatG}
                      onChange={(e) => setFatG(e.target.value)}
                      placeholder="e.g. 3.6"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={creating} className={styles.addButton}>
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
                  <span>Protein</span>
                  <span>Carbs</span>
                  <span>Fat</span>
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
                  <span>{dailyProtein}g</span>
                  <span>{dailyCarbs}g</span>
                  <span>{dailyFat}g</span>
                  <span className={styles.totalValue}>
                    {dailyCalories.toLocaleString()} kcal
                  </span>
                  <span />
                </div>
              </div>
            )}
          </>
        )}

        {/* Templates tab */}
        {activeTab === 'templates' && (
          <div className={styles.logLayout}>

            {/* Left — template list */}
            <div className={styles.templateList}>
              <h3 className={styles.sectionTitle}>Meal Templates</h3>

              <form onSubmit={handleCreateTemplate} className={styles.createForm}>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name..."
                  required
                />
                <button
                  type="submit"
                  disabled={creatingTemplate}
                  className={styles.createButton}
                >
                  {creatingTemplate ? '...' : '+'}
                </button>
              </form>

              {templates.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No templates yet.</p>
                </div>
              ) : (
                <ul className={styles.templateItems}>
                  {templates.map(t => (
                    <TemplateItem
                      key={t.id}
                      template={t}
                      isActive={activeTemplate?.id === t.id}
                      onSelect={() => setActiveTemplate(t)}
                      onDelete={handleDeleteTemplate}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Right — template items */}
            <div className={styles.templatePanel}>
              {activeTemplate ? (
                <>
                  <h3 className={styles.sectionTitle}>{activeTemplate.name}</h3>

                  <form onSubmit={handleAddTemplateItem} className={styles.form}>
                    <div className={styles.formRow}>
                      <div className={styles.field}>
                        <label>Food name</label>
                        <input
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="e.g. Oats"
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Calories per serving</label>
                        <input
                          type="number"
                          value={itemCalories}
                          onChange={(e) => setItemCalories(e.target.value)}
                          placeholder="e.g. 375"
                          min="0"
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Serving size (g)</label>
                        <input
                          type="number"
                          value={itemServing}
                          onChange={(e) => setItemServing(e.target.value)}
                          placeholder="e.g. 100"
                          min="0"
                          required
                        />
                      </div>
                    </div>
                    <div className={styles.macroRow}>
                      <span className={styles.macroLabel}>Macros (optional)</span>
                      <div className={styles.macroInputs}>
                        <div className={styles.field}>
                          <label>Protein (g)</label>
                          <input
                            type="number"
                            value={itemProtein}
                            onChange={(e) => setItemProtein(e.target.value)}
                            placeholder="e.g. 13"
                            min="0"
                            step="0.1"
                          />
                        </div>
                        <div className={styles.field}>
                          <label>Carbs (g)</label>
                          <input
                            type="number"
                            value={itemCarbs}
                            onChange={(e) => setItemCarbs(e.target.value)}
                            placeholder="e.g. 60"
                            min="0"
                            step="0.1"
                          />
                        </div>
                        <div className={styles.field}>
                          <label>Fat (g)</label>
                          <input
                            type="number"
                            value={itemFat}
                            onChange={(e) => setItemFat(e.target.value)}
                            placeholder="e.g. 7"
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingItem}
                      className={styles.addButton}
                    >
                      {addingItem ? 'Adding...' : 'Add Item'}
                    </button>
                  </form>

                  {activeTemplate.vigil_meal_template_items.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>No items in this template yet.</p>
                    </div>
                  ) : (
                    <ul className={styles.templateItemList}>
                      {activeTemplate.vigil_meal_template_items.map(item => (
                        <li key={item.id} className={styles.templateItemRow}>
                          <div className={styles.templateItemInfo}>
                            <span className={styles.templateItemName}>{item.name}</span>
                            <span className={styles.templateItemMeta}>
                              {item.calories_per_serving} kcal per {item.serving_size_g}g
                            </span>
                          </div>
                          <button
                            className={styles.deleteButton}
                            onClick={async () => {
                              await supabase
                                .from('vigil_meal_template_items')
                                .delete()
                                .eq('id', item.id)
                              const updated = {
                                ...activeTemplate,
                                vigil_meal_template_items:
                                  activeTemplate.vigil_meal_template_items.filter(
                                    i => i.id !== item.id
                                  )
                              }
                              setActiveTemplate(updated)
                              setTemplates(templates.map(t =>
                                t.id === activeTemplate.id ? updated : t
                              ))
                              toast.success('Item removed')
                            }}
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <div className={styles.noTemplateSelected}>
                  <p>Select or create a template to edit its items.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

/* ============================================
   MealRow component
   Single meal entry with macros and delete
   ============================================ */
function MealRow({ meal, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className={styles.mealRow}>
      <span className={styles.mealName}>{meal.name}</span>
      <span className={styles.mealAmount}>{meal.amount_g}g</span>
      <span className={styles.mealMacro}>
        {meal.protein_g != null ? `${Math.round(meal.protein_g)}g` : '—'}
      </span>
      <span className={styles.mealMacro}>
        {meal.carbs_g != null ? `${Math.round(meal.carbs_g)}g` : '—'}
      </span>
      <span className={styles.mealMacro}>
        {meal.fat_g != null ? `${Math.round(meal.fat_g)}g` : '—'}
      </span>
      <span className={styles.mealCalories}>
        {Math.round(meal.total_calories)} kcal
      </span>
      <div className={styles.mealActions}>
        {confirming ? (
          <>
            <button className={styles.confirmButton} onClick={() => onDelete(meal.id)}>
              Yes
            </button>
            <button className={styles.cancelButton} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className={styles.deleteButton} onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

/* ============================================
   TemplateItem component
   Single template in the list
   ============================================ */
function TemplateItem({ template, isActive, onSelect, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <li
      className={`${styles.templateItem} ${isActive ? styles.templateItemActive : ''}`}
      onClick={onSelect}
    >
      <div className={styles.templateItemInfo}>
        <span className={styles.templateItemName}>{template.name}</span>
        <span className={styles.templateItemMeta}>
          {template.vigil_meal_template_items.length} items
        </span>
      </div>
      <div onClick={e => e.stopPropagation()}>
        {confirming ? (
          <>
            <button className={styles.confirmButton} onClick={() => onDelete(template.id)}>
              Yes
            </button>
            <button className={styles.cancelButton} onClick={() => setConfirming(false)}>
              No
            </button>
          </>
        ) : (
          <button className={styles.deleteButton} onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
    </li>
  )
}