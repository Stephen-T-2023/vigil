/* ============================================
   workouts.jsx
   Vigil — Ashborne
   Workout logger — create workout sessions,
   add exercises with sets/reps/weight.
   Supports templates for quick logging.
   ============================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '../lib/supabaseClient'
import styles from '../styles/Workouts.module.css'
import toast from 'react-hot-toast'
import Skeleton from '../components/Skeleton'

export default function Workouts() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState([])
  const [templates, setTemplates] = useState([])
  const [activeTab, setActiveTab] = useState('log')
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  /* New workout form state */
  const [workoutName, setWorkoutName] = useState('')
  const [creatingWorkout, setCreatingWorkout] = useState(false)
  const [activeWorkout, setActiveWorkout] = useState(null)

  /* New exercise form state */
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState('metric')
  const [addingExercise, setAddingExercise] = useState(false)

  /* Template form state */
  const [templateName, setTemplateName] = useState('')
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [templateExerciseName, setTemplateExerciseName] = useState('')
  const [templateSets, setTemplateSets] = useState('')
  const [templateReps, setTemplateReps] = useState('')
  const [templateWeight, setTemplateWeight] = useState('')
  const [templateUnit, setTemplateUnit] = useState('metric')
  const [addingTemplateExercise, setAddingTemplateExercise] = useState(false)

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
        fetchWorkouts(session.user.id, selectedDate),
        fetchTemplates(session.user.id),
      ])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (user) fetchWorkouts(user.id, selectedDate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  async function fetchWorkouts(userId, date) {
    const { data, error } = await supabase
      .from('vigil_workouts')
      .select('*, vigil_workout_exercises(*)')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load workouts')
    } else {
      setWorkouts(data)
    }
  }

  async function fetchTemplates(userId) {
    const { data, error } = await supabase
      .from('vigil_workout_templates')
      .select('*, vigil_template_exercises(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Failed to load templates')
    } else {
      setTemplates(data)
    }
  }

  /* Create a new workout session */
  async function handleCreateWorkout(e) {
    e.preventDefault()
    if (!workoutName.trim()) return
    setCreatingWorkout(true)

    const { data, error } = await supabase
      .from('vigil_workouts')
      .insert([{
        user_id: user.id,
        name: workoutName.trim(),
        date: selectedDate,
      }])
      .select('*, vigil_workout_exercises(*)')
      .single()

    if (error) {
      toast.error('Failed to create workout')
    } else {
      setWorkouts([data, ...workouts])
      setActiveWorkout(data)
      setWorkoutName('')
      toast.success('Workout created')
    }

    setCreatingWorkout(false)
  }

  /* Create workout from a template */
  async function handleUseTemplate(template) {
    setCreatingWorkout(true)

    const { data: workout, error: workoutError } = await supabase
      .from('vigil_workouts')
      .insert([{
        user_id: user.id,
        name: template.name,
        date: selectedDate,
      }])
      .select()
      .single()

    if (workoutError) {
      toast.error('Failed to create workout from template')
      setCreatingWorkout(false)
      return
    }

    /* Copy template exercises to the new workout */
    if (template.vigil_template_exercises.length > 0) {
      const exercises = template.vigil_template_exercises.map(ex => ({
        workout_id: workout.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        unit: ex.unit,
      }))

      await supabase
        .from('vigil_workout_exercises')
        .insert(exercises)
    }

    /* Refetch to get exercises */
    const { data: fullWorkout } = await supabase
      .from('vigil_workouts')
      .select('*, vigil_workout_exercises(*)')
      .eq('id', workout.id)
      .single()

    setWorkouts([fullWorkout, ...workouts])
    setActiveWorkout(fullWorkout)
    toast.success(`Workout started from ${template.name}`)
    setCreatingWorkout(false)
  }

  /* Add exercise to active workout */
  async function handleAddExercise(e) {
    e.preventDefault()
    if (!exerciseName.trim() || !activeWorkout) return
    setAddingExercise(true)

    const { data, error } = await supabase
      .from('vigil_workout_exercises')
      .insert([{
        workout_id: activeWorkout.id,
        name: exerciseName.trim(),
        sets: sets ? parseInt(sets) : null,
        reps: reps ? parseInt(reps) : null,
        weight: weight ? parseFloat(weight) : null,
        unit,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to add exercise')
    } else {
      /* Update the active workout and workouts list */
      const updatedWorkout = {
        ...activeWorkout,
        vigil_workout_exercises: [
          ...activeWorkout.vigil_workout_exercises,
          data
        ]
      }
      setActiveWorkout(updatedWorkout)
      setWorkouts(workouts.map(w =>
        w.id === activeWorkout.id ? updatedWorkout : w
      ))
      setExerciseName('')
      setSets('')
      setReps('')
      setWeight('')
      toast.success('Exercise added')
    }

    setAddingExercise(false)
  }

  /* Delete a workout */
  async function handleDeleteWorkout(id) {
    const { error } = await supabase
      .from('vigil_workouts')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete workout')
    } else {
      setWorkouts(workouts.filter(w => w.id !== id))
      if (activeWorkout?.id === id) setActiveWorkout(null)
      toast.success('Workout deleted')
    }
  }

  /* Delete an exercise from a workout */
  async function handleDeleteExercise(exerciseId) {
    const { error } = await supabase
      .from('vigil_workout_exercises')
      .delete()
      .eq('id', exerciseId)

    if (error) {
      toast.error('Failed to delete exercise')
    } else {
      const updatedWorkout = {
        ...activeWorkout,
        vigil_workout_exercises: activeWorkout.vigil_workout_exercises.filter(
          ex => ex.id !== exerciseId
        )
      }
      setActiveWorkout(updatedWorkout)
      setWorkouts(workouts.map(w =>
        w.id === activeWorkout.id ? updatedWorkout : w
      ))
      toast.success('Exercise removed')
    }
  }

  /* Create a new template */
  async function handleCreateTemplate(e) {
    e.preventDefault()
    if (!templateName.trim()) return
    setCreatingTemplate(true)

    const { data, error } = await supabase
      .from('vigil_workout_templates')
      .insert([{
        user_id: user.id,
        name: templateName.trim(),
      }])
      .select('*, vigil_template_exercises(*)')
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

  /* Add exercise to template */
  async function handleAddTemplateExercise(e) {
    e.preventDefault()
    if (!templateExerciseName.trim() || !activeTemplate) return
    setAddingTemplateExercise(true)

    const { data, error } = await supabase
      .from('vigil_template_exercises')
      .insert([{
        template_id: activeTemplate.id,
        name: templateExerciseName.trim(),
        sets: templateSets ? parseInt(templateSets) : null,
        reps: templateReps ? parseInt(templateReps) : null,
        weight: templateWeight ? parseFloat(templateWeight) : null,
        unit: templateUnit,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to add exercise to template')
    } else {
      const updatedTemplate = {
        ...activeTemplate,
        vigil_template_exercises: [
          ...activeTemplate.vigil_template_exercises,
          data
        ]
      }
      setActiveTemplate(updatedTemplate)
      setTemplates(templates.map(t =>
        t.id === activeTemplate.id ? updatedTemplate : t
      ))
      setTemplateExerciseName('')
      setTemplateSets('')
      setTemplateReps('')
      setTemplateWeight('')
      toast.success('Exercise added to template')
    }

    setAddingTemplateExercise(false)
  }

  /* Delete a template */
  async function handleDeleteTemplate(id) {
    const { error } = await supabase
      .from('vigil_workout_templates')
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
          <div>
            <h1>Workouts</h1>
            <p className={styles.subtitle}>
              {workouts.length} {workouts.length === 1 ? 'session' : 'sessions'} logged
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

            {/* Date navigation — only on log tab */}
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
            )}
          </div>
        </div>

        {/* Quick link to unit preference settings */}
        <div className={styles.settingsHint}>
          <span>Recording weights and distances in metric units</span>
          <button
            className={styles.settingsLink}
            onClick={() => router.push('/settings')}
          >
            Change units →
          </button>
        </div>

        {/* Log tab */}
        {activeTab === 'log' && (
          <div className={styles.logLayout}>

            {/* Left — workout list and create */}
            <div className={styles.workoutList}>
              <h3 className={styles.sectionTitle}>Sessions</h3>

              {/* Create workout form */}
              <form onSubmit={handleCreateWorkout} className={styles.createForm}>
                <input
                  type="text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="Workout name..."
                  required
                />
                <button
                  type="submit"
                  disabled={creatingWorkout}
                  className={styles.createButton}
                >
                  {creatingWorkout ? '...' : '+'}
                </button>
              </form>

              {/* Template quick start */}
              {templates.length > 0 && (
                <div className={styles.templateQuick}>
                  <span className={styles.templateQuickLabel}>
                    Start from template
                  </span>
                  {templates.map(t => (
                    <button
                      key={t.id}
                      className={styles.templateQuickButton}
                      onClick={() => handleUseTemplate(t)}
                      disabled={creatingWorkout}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Workouts list */}
              {workouts.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No sessions {isToday ? 'today' : 'on this day'}.</p>
                </div>
              ) : (
                <ul className={styles.workoutItems}>
                  {workouts.map(workout => (
                    <WorkoutItem
                      key={workout.id}
                      workout={workout}
                      isActive={activeWorkout?.id === workout.id}
                      onSelect={() => setActiveWorkout(workout)}
                      onDelete={handleDeleteWorkout}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Right — active workout exercises */}
            <div className={styles.exercisePanel}>
              {activeWorkout ? (
                <>
                  <h3 className={styles.sectionTitle}>
                    {activeWorkout.name}
                  </h3>

                  {/* Add exercise form */}
                  <form
                    onSubmit={handleAddExercise}
                    className={styles.exerciseForm}
                  >
                    <div className={styles.exerciseFormRow}>
                      <div className={styles.field}>
                        <label>Exercise</label>
                        <input
                          type="text"
                          value={exerciseName}
                          onChange={(e) => setExerciseName(e.target.value)}
                          placeholder="e.g. Bench Press"
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Sets</label>
                        <input
                          type="number"
                          value={sets}
                          onChange={(e) => setSets(e.target.value)}
                          placeholder="e.g. 3"
                          min="0"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Reps</label>
                        <input
                          type="number"
                          value={reps}
                          onChange={(e) => setReps(e.target.value)}
                          placeholder="e.g. 10"
                          min="0"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Weight</label>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="e.g. 80"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Unit</label>
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                        >
                          <option value="metric">Metric</option>
                          <option value="imperial">Imperial</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingExercise}
                      className={styles.addExerciseButton}
                    >
                      {addingExercise ? 'Adding...' : 'Add Exercise'}
                    </button>
                  </form>

                  {/* Exercise list */}
                  {activeWorkout.vigil_workout_exercises.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>No exercises yet. Add one above.</p>
                    </div>
                  ) : (
                    <ul className={styles.exerciseList}>
                      {activeWorkout.vigil_workout_exercises.map(ex => (
                        <ExerciseRow
                          key={ex.id}
                          exercise={ex}
                          onDelete={handleDeleteExercise}
                        />
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <div className={styles.noWorkoutSelected}>
                  <p>Select or create a session to log exercises.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Templates tab */}
        {activeTab === 'templates' && (
          <div className={styles.logLayout}>

            {/* Left — template list */}
            <div className={styles.workoutList}>
              <h3 className={styles.sectionTitle}>Templates</h3>

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
                <ul className={styles.workoutItems}>
                  {templates.map(template => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      isActive={activeTemplate?.id === template.id}
                      onSelect={() => setActiveTemplate(template)}
                      onDelete={handleDeleteTemplate}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Right — template exercises */}
            <div className={styles.exercisePanel}>
              {activeTemplate ? (
                <>
                  <h3 className={styles.sectionTitle}>
                    {activeTemplate.name}
                  </h3>

                  <form
                    onSubmit={handleAddTemplateExercise}
                    className={styles.exerciseForm}
                  >
                    <div className={styles.exerciseFormRow}>
                      <div className={styles.field}>
                        <label>Exercise</label>
                        <input
                          type="text"
                          value={templateExerciseName}
                          onChange={(e) => setTemplateExerciseName(e.target.value)}
                          placeholder="e.g. Bench Press"
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Sets</label>
                        <input
                          type="number"
                          value={templateSets}
                          onChange={(e) => setTemplateSets(e.target.value)}
                          placeholder="e.g. 3"
                          min="0"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Reps</label>
                        <input
                          type="number"
                          value={templateReps}
                          onChange={(e) => setTemplateReps(e.target.value)}
                          placeholder="e.g. 10"
                          min="0"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Weight</label>
                        <input
                          type="number"
                          value={templateWeight}
                          onChange={(e) => setTemplateWeight(e.target.value)}
                          placeholder="e.g. 80"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Unit</label>
                        <select
                          value={templateUnit}
                          onChange={(e) => setTemplateUnit(e.target.value)}
                        >
                          <option value="metric">Metric</option>
                          <option value="imperial">Imperial</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingTemplateExercise}
                      className={styles.addExerciseButton}
                    >
                      {addingTemplateExercise ? 'Adding...' : 'Add Exercise'}
                    </button>
                  </form>

                  {activeTemplate.vigil_template_exercises.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>No exercises in this template yet.</p>
                    </div>
                  ) : (
                    <ul className={styles.exerciseList}>
                      {activeTemplate.vigil_template_exercises.map(ex => (
                        <ExerciseRow
                          key={ex.id}
                          exercise={ex}
                          onDelete={async (id) => {
                            await supabase
                              .from('vigil_template_exercises')
                              .delete()
                              .eq('id', id)
                            const updated = {
                              ...activeTemplate,
                              vigil_template_exercises:
                                activeTemplate.vigil_template_exercises.filter(
                                  e => e.id !== id
                                )
                            }
                            setActiveTemplate(updated)
                            setTemplates(templates.map(t =>
                              t.id === activeTemplate.id ? updated : t
                            ))
                            toast.success('Exercise removed from template')
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <div className={styles.noWorkoutSelected}>
                  <p>Select or create a template to edit its exercises.</p>
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
   WorkoutItem component
   Single workout session in the list
   ============================================ */
function WorkoutItem({ workout, isActive, onSelect, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <li
      className={`${styles.workoutItem} ${isActive ? styles.workoutItemActive : ''}`}
      onClick={onSelect}
    >
      <div className={styles.workoutItemInfo}>
        <span className={styles.workoutItemName}>{workout.name}</span>
        <span className={styles.workoutItemCount}>
          {workout.vigil_workout_exercises.length} exercises
        </span>
      </div>
      <div className={styles.workoutItemActions} onClick={e => e.stopPropagation()}>
        {confirming ? (
          <>
            <button
              className={styles.confirmButton}
              onClick={() => onDelete(workout.id)}
            >
              Yes
            </button>
            <button
              className={styles.cancelButton}
              onClick={() => setConfirming(false)}
            >
              No
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
    </li>
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
      className={`${styles.workoutItem} ${isActive ? styles.workoutItemActive : ''}`}
      onClick={onSelect}
    >
      <div className={styles.workoutItemInfo}>
        <span className={styles.workoutItemName}>{template.name}</span>
        <span className={styles.workoutItemCount}>
          {template.vigil_template_exercises.length} exercises
        </span>
      </div>
      <div className={styles.workoutItemActions} onClick={e => e.stopPropagation()}>
        {confirming ? (
          <>
            <button
              className={styles.confirmButton}
              onClick={() => onDelete(template.id)}
            >
              Yes
            </button>
            <button
              className={styles.cancelButton}
              onClick={() => setConfirming(false)}
            >
              No
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
    </li>
  )
}

/* ============================================
   ExerciseRow component
   Single exercise in a workout or template
   ============================================ */
function ExerciseRow({ exercise, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  const weightLabel = exercise.weight
    ? `${exercise.weight}${exercise.unit === 'metric' ? 'kg' : 'lbs'}`
    : null

  return (
    <li className={styles.exerciseRow}>
      <div className={styles.exerciseInfo}>
        <span className={styles.exerciseName}>{exercise.name}</span>
        <div className={styles.exerciseStats}>
          {exercise.sets && (
            <span className={styles.exerciseStat}>
              {exercise.sets} sets
            </span>
          )}
          {exercise.reps && (
            <span className={styles.exerciseStat}>
              {exercise.reps} reps
            </span>
          )}
          {weightLabel && (
            <span className={styles.exerciseStat}>{weightLabel}</span>
          )}
        </div>
      </div>
      <div className={styles.exerciseActions}>
        {confirming ? (
          <>
            <button
              className={styles.confirmButton}
              onClick={() => onDelete(exercise.id)}
            >
              Yes
            </button>
            <button
              className={styles.cancelButton}
              onClick={() => setConfirming(false)}
            >
              No
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
    </li>
  )
}