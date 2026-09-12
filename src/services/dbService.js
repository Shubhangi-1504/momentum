import { supabase } from '../lib/supabase'

export const dbService = {
  // ============================================
  // ASSIGNMENTS
  // ============================================
  async getAssignments(studentId) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createAssignment(assignment) {
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignment)
      .select()
      .single()
    return { data, error }
  },

  async updateAssignment(id, updates) {
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteAssignment(id) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
    return { error }
  },

  // ============================================
  // HABITS
  // ============================================
  async getHabits(studentId) {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createHabit(habit) {
    const { data, error } = await supabase
      .from('habits')
      .insert(habit)
      .select()
      .single()
    return { data, error }
  },

  async updateHabit(id, updates) {
    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteHabit(id) {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id)
    return { error }
  },

  // ============================================
  // HABIT LOGS
  // ============================================
  async getHabitLogs(habitId, startDate, endDate) {
    let query = supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', habitId)

    if (startDate) query = query.gte('log_date', startDate)
    if (endDate) query = query.lte('log_date', endDate)

    const { data, error } = await query.order('log_date', { ascending: false })
    return { data, error }
  },

  async createOrUpdateHabitLog(log) {
    const { data, error } = await supabase
      .from('habit_logs')
      .upsert(log, { onConflict: 'habit_id,log_date' })
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // JOURNAL ENTRIES
  // ============================================
  async getJournalEntries(studentId) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createJournalEntry(entry) {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert(entry)
      .select()
      .single()
    return { data, error }
  },

  async updateJournalEntry(id, updates) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteJournalEntry(id) {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
    return { error }
  },

  // ============================================
  // MENTOR REMARKS
  // ============================================
  async getRemarks(studentId) {
    const { data, error } = await supabase
      .from('mentor_remarks')
      .select('*, mentors(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createRemark(remark) {
    const { data, error } = await supabase
      .from('mentor_remarks')
      .insert(remark)
      .select()
      .single()
    return { data, error }
  },

  async updateRemark(id, updates) {
    const { data, error } = await supabase
      .from('mentor_remarks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // ASSIGNED TASKS
  // ============================================
  async getAssignedTasks(studentId) {
    const { data, error } = await supabase
      .from('assigned_tasks')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createAssignedTask(task) {
    const { data, error } = await supabase
      .from('assigned_tasks')
      .insert(task)
      .select()
      .single()
    return { data, error }
  },

  async updateAssignedTask(id, updates) {
    const { data, error } = await supabase
      .from('assigned_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // STUDENTS (for mentors)
  // ============================================
  async getMentorStudents(mentorId) {
    const { data, error } = await supabase
      .from('mentor_student_relationships')
      .select('*, students(*, profiles(*))')
      .eq('mentor_id', mentorId)
    return { data, error }
  },

  // ============================================
  // PROGRESS
  // ============================================
  async getProgress(studentId, startDate, endDate) {
    let query = supabase
      .from('progress')
      .select('*')
      .eq('student_id', studentId)

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data, error } = await query.order('date', { ascending: false })
    return { data, error }
  },

  async createOrUpdateProgress(progress) {
    const { data, error } = await supabase
      .from('progress')
      .upsert(progress, { onConflict: 'student_id,date' })
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // SHARED JOURNALS (for mentors)
  // ============================================
  async getSharedJournals(studentIds) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, students(*, profiles(*))')
      .in('student_id', studentIds)
      .eq('is_visible_to_mentor', true)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // ============================================
  // PROFILE LOOKUPS
  // ============================================
  async getStudentByProfileId(profileId) {
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', profileId)
      .single()
    return { data, error }
  },

  async getMentorByProfileId(profileId) {
    const { data, error } = await supabase
      .from('mentors')
      .select('id')
      .eq('profile_id', profileId)
      .single()
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getStudentDashboardStats(studentId) {
    const today = new Date().toISOString().split('T')[0]

    const [assignmentsRes, habitsRes, habitLogsRes, journalRes, progressRes] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, status')
        .eq('student_id', studentId),
      supabase
        .from('habits')
        .select('id')
        .eq('student_id', studentId),
      supabase
        .from('habit_logs')
        .select('habit_id, completed')
        .eq('log_date', today),
      supabase
        .from('journal_entries')
        .select('id')
        .eq('student_id', studentId),
      supabase
        .from('progress')
        .select('study_hours')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(7),
    ])

    const assignments = assignmentsRes.data || []
    const habits = habitsRes.data || []
    const habitLogs = habitLogsRes.data || []
    const journals = journalRes.data || []
    const progress = progressRes.data || []

    const pendingAssignments = assignments.filter(
      (a) => a.status === 'pending' || a.status === 'in_progress'
    ).length
    const completedToday = habitLogs.filter((h) => h.completed).length
    const totalStudyHours = progress.reduce((sum, p) => sum + (parseFloat(p.study_hours) || 0), 0)

    return {
      pendingAssignments,
      habitsToday: `${completedToday}/${habits.length}`,
      journalCount: journals.length,
      studyHours: `${totalStudyHours.toFixed(1)}h`,
    }
  },

  async getMentorDashboardStats(mentorId) {
    const [relationshipsRes, tasksRes, remarksRes] = await Promise.all([
      supabase
        .from('mentor_student_relationships')
        .select('id')
        .eq('mentor_id', mentorId),
      supabase
        .from('assigned_tasks')
        .select('id, status')
        .eq('mentor_id', mentorId),
      supabase
        .from('mentor_remarks')
        .select('id, rating')
        .eq('mentor_id', mentorId),
    ])

    const relationships = relationshipsRes.data || []
    const tasks = tasksRes.data || []
    const remarks = remarksRes.data || []

    const pendingTasks = tasks.filter(
      (t) => t.status === 'assigned' || t.status === 'in_progress'
    ).length
    const avgRating = remarks.length > 0
      ? (remarks.reduce((sum, r) => sum + (r.rating || 0), 0) / remarks.length).toFixed(1)
      : '0.0'

    return {
      assignedStudents: relationships.length,
      pendingTasks,
      remarksGiven: remarks.length,
      avgRating,
    }
  },

  // ============================================
  // MENTOR RECENT ACTIVITY
  // ============================================
  async getMentorRecentActivity(mentorId) {
    const { data: tasks, error: tasksErr } = await supabase
      .from('assigned_tasks')
      .select('id, title, status, created_at, students(id, profiles(full_name))')
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (tasksErr) return { data: [], error: tasksErr }
    return { data: tasks || [], error: null }
  },
}
