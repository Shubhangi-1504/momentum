import { supabase } from '../lib/supabase'
import {
  isOverdueAssignment,
  studentNeedsReview,
  relativeTime,
} from '../utils/mentorUtils'
import {
  dateKey,
  isoToKey,
  daysBetweenKeys,
  overallConsistency,
  dueCountdown,
} from '../utils/consistencyUtils'

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

  async deleteHabitLog(id) {
    const { error } = await supabase
      .from('habit_logs')
      .delete()
      .eq('id', id)
    return { error }
  },

  // All habit logs for a student in one query (used by Home dashboard).
  // Joins habits so the caller can filter by student ownership in the UI.
  async getStudentHabitLogs(studentId, { startDate, endDate } = {}) {
    let query = supabase
      .from('habit_logs')
      .select('id, habit_id, log_date, count, completed, habits!inner(student_id)')
      .eq('habits.student_id', studentId)
    if (startDate) query = query.gte('log_date', startDate)
    if (endDate) query = query.lte('log_date', endDate)
    const { data, error } = await query
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
      .select('id, tracking_start_date')
      .eq('profile_id', profileId)
      .single()
    return { data, error }
  },

  // ============================================
  // CONSISTENCY (RPCs from migration 007)
  // ============================================

  // Student's own consistency snapshot: tracking start date + the real
  // calendar dates on which habits/assignments were completed.
  async getMyConsistency() {
    const { data, error } = await supabase.rpc('get_my_consistency')
    return { data, error }
  },

  // Mentor view of the same snapshot for a connected student.
  // Returns { ok: false } if the student is not connected to the caller.
  async getMentorStudentConsistency(studentId) {
    const { data, error } = await supabase.rpc('get_mentor_student_consistency', {
      p_student_id: studentId,
    })
    return { data, error }
  },

  // All habit logs for every habit of a student in one query (mentor
  // detail page). Two-step: habit ids first, then logs via .in() —
  // avoids a PostgREST embed (an .eq('habits.student_id', ...) filter
  // without habits in the select fails with "habits is not an embedded
  // resource in this request"). RLS scopes this to connected students only.
  async getAllHabitLogsForStudent(studentId) {
    const { data: habitRows, error: habitErr } = await supabase
      .from('habits')
      .select('id')
      .eq('student_id', studentId)
    if (habitErr) return { data: null, error: habitErr }
    const habitIds = (habitRows || []).map((h) => h.id)
    if (habitIds.length === 0) return { data: [], error: null }
    const { data, error } = await supabase
      .from('habit_logs')
      .select('id, habit_id, log_date, count, completed')
      .in('habit_id', habitIds)
      .eq('completed', true)
    return { data, error }
  },

  // Habits of a student (mentor detail page, read-only via RLS).
  async getHabitsForStudent(studentId) {
    const { data, error } = await supabase
      .from('habits')
      .select('id, name, color, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // connection_code is used on the My Students page ("Your mentor code").
  async getMentorByProfileId(profileId) {
    const { data, error } = await supabase
      .from('mentors')
      .select('id, connection_code')
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

  // ============================================
  // MENTOR DASHBOARD STATS (real data)
  // Pending/overdue come from the SAME assignments the student's
  // Study Tracker uses; needing-review uses the shared status rule.
  // ============================================
  async getMentorDashboardStats(mentorId) {
    const { data: rels, error: relErr } = await supabase
      .from('mentor_student_relationships')
      .select('student_id')
      .eq('mentor_id', mentorId)
      .eq('status', 'active')
    if (relErr) return { error: relErr }

    const studentIds = (rels || []).map((r) => r.student_id)
    if (studentIds.length === 0) {
      return {
        assignedStudents: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        remarksGiven: 0,
        needingReview: 0,
        error: null,
      }
    }

    const [asgRes, remRes, revRes] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, student_id, status, due_date')
        .in('student_id', studentIds),
      supabase
        .from('mentor_remarks')
        .select('id')
        .eq('mentor_id', mentorId),
      supabase
        .from('student_reviews')
        .select('student_id, reviewed_at')
        .eq('mentor_id', mentorId),
    ])
    const firstErr = asgRes.error || remRes.error || revRes.error
    if (firstErr) return { error: firstErr }

    const assignments = asgRes.data || []
    const pendingRows = assignments.filter(
      (a) => a.status !== 'completed' && a.status !== 'overdue'
    )
    const overdueRows = assignments.filter((a) => isOverdueAssignment(a))

    // Latest review per student
    const lastReview = {}
    for (const r of revRes.data || []) {
      if (!lastReview[r.student_id] || r.reviewed_at > lastReview[r.student_id]) {
        lastReview[r.student_id] = r.reviewed_at
      }
    }
    const pendingByStudent = {}
    for (const a of pendingRows) {
      pendingByStudent[a.student_id] = (pendingByStudent[a.student_id] || 0) + 1
    }
    const overdueByStudent = {}
    for (const a of overdueRows) {
      overdueByStudent[a.student_id] = (overdueByStudent[a.student_id] || 0) + 1
    }

    const needingReview = studentIds.filter((sid) =>
      studentNeedsReview({
        overdue: overdueByStudent[sid] || 0,
        pending: pendingByStudent[sid] || 0,
        lastReviewedAt: lastReview[sid] || null,
      })
    ).length

    return {
      assignedStudents: studentIds.length,
      pendingTasks: pendingRows.length,
      overdueTasks: overdueRows.length,
      remarksGiven: (remRes.data || []).length,
      needingReview,
      error: null,
    }
  },

  // ============================================
  // MENTOR RECENT ACTIVITY (query-based, no event table)
  // Derives events from assignment created/updated/completed/overdue
  // moments and recent remarks for connected students.
  // ============================================
  async getMentorRecentActivity(mentorId) {
    const { data: rels, error: relErr } = await supabase
      .from('mentor_student_relationships')
      .select('student_id')
      .eq('mentor_id', mentorId)
      .eq('status', 'active')
    if (relErr) return { data: [], error: relErr }

    const studentIds = (rels || []).map((r) => r.student_id)
    if (studentIds.length === 0) return { data: [], error: null }

    const [asgRes, remRes] = await Promise.all([
      supabase
        .from('assignments')
        .select(
          'id, title, status, created_at, updated_at, due_date, created_by_role, students(id, profiles(full_name))'
        )
        .in('student_id', studentIds)
        .order('updated_at', { ascending: false })
        .limit(30),
      supabase
        .from('mentor_remarks')
        .select('id, content, created_at, students(id, profiles(full_name))')
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    const firstErr = asgRes.error || remRes.error
    if (firstErr) return { data: [], error: firstErr }

    const now = new Date()
    const events = []
    for (const a of asgRes.data || []) {
      const who = a.students?.profiles?.full_name || 'Student'
      if (a.status === 'completed' && a.updated_at) {
        events.push({
          id: `asg-done-${a.id}`,
          type: 'completed',
          message: `${who} completed ${a.title}`,
          at: a.updated_at,
        })
      }
      if (a.created_at) {
        events.push({
          id: `asg-new-${a.id}`,
          type: a.created_by_role === 'mentor' ? 'assigned' : 'created',
          message:
            a.created_by_role === 'mentor'
              ? `You assigned "${a.title}" to ${who}`
              : `${who} added ${a.title}`,
          at: a.created_at,
        })
      }
      if (isOverdueAssignment(a, now)) {
        events.push({
          id: `asg-od-${a.id}`,
          type: 'overdue',
          message: `${a.title} (${who}) became overdue`,
          at: a.due_date,
        })
      }
    }
    for (const r of remRes.data || []) {
      const who = r.students?.profiles?.full_name || 'Student'
      events.push({
        id: `rem-${r.id}`,
        type: 'remark',
        message: `You added a remark for ${who}`,
        at: r.created_at,
      })
    }

    events.sort((a, b) => new Date(b.at) - new Date(a.at))
    return {
      data: events.slice(0, 8).map((e) => ({ ...e, when: relativeTime(e.at, now) })),
      error: null,
    }
  },

  // ============================================
  // MENTOR PORTAL — connection, students, reviews
  // ============================================

  // Student side: connect to a mentor by invite code (RPC — no UUIDs).
  async connectToMentorByCode(code) {
    const { data, error } = await supabase.rpc('request_mentor_connection', {
      p_code: code,
    })
    return { data, error }
  },

  // Student side: mentor card info via RPC (name, status, last review,
  // latest remark). Returns { connected: false } when unconnected.
  async getMyMentorInfo() {
    const { data, error } = await supabase.rpc('get_student_mentor_info')
    return { data, error }
  },

  // Active student ids for a mentor (RLS scopes this to own relationships).
  async getMentorStudentIds(mentorId) {
    const { data, error } = await supabase
      .from('mentor_student_relationships')
      .select('student_id')
      .eq('mentor_id', mentorId)
      .eq('status', 'active')
    if (error) return { data: null, error }
    return { data: (data || []).map((r) => r.student_id), error: null }
  },

  // Assignments across connected students — the SAME records shown in the
  // students' Study Tracker (no duplicate task tables). RLS scopes the read.
  async getAssignmentsForStudents(studentIds) {
    if (!studentIds || studentIds.length === 0) return { data: [], error: null }
    const { data, error } = await supabase
      .from('assignments')
      .select('*, students(id, profiles(full_name))')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // My Students rows: connected student + live academic stats + status.
  async getMentorStudentsWithStats(mentorId) {
    const { data: rels, error: relErr } = await supabase
      .from('mentor_student_relationships')
      .select('id, status, assigned_at, students(id, usn, profiles(full_name))')
      .eq('mentor_id', mentorId)
      .eq('status', 'active')
    if (relErr) return { data: null, error: relErr }

    const rows = rels || []
    if (rows.length === 0) return { data: [], error: null }

    const studentIds = rows.map((r) => r.students?.id).filter(Boolean)
    const [asgRes, revRes] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, student_id, status, due_date')
        .in('student_id', studentIds),
      supabase
        .from('student_reviews')
        .select('student_id, reviewed_at')
        .eq('mentor_id', mentorId),
    ])
    if (asgRes.error) return { data: null, error: asgRes.error }
    if (revRes.error) return { data: null, error: revRes.error }

    const lastReview = {}
    for (const r of revRes.data || []) {
      if (!lastReview[r.student_id] || r.reviewed_at > lastReview[r.student_id]) {
        lastReview[r.student_id] = r.reviewed_at
      }
    }
    const byStudent = {}
    for (const a of asgRes.data || []) {
      const s = (byStudent[a.student_id] ||= {
        total: 0,
        completed: 0,
        in_progress: 0,
        pending: 0,
        overdue: 0,
      })
      s.total++
      if (isOverdueAssignment(a)) s.overdue++
      if (a.status === 'completed') s.completed++
      else if (a.status === 'in_progress' && !isOverdueAssignment(a)) s.in_progress++
      else if (!isOverdueAssignment(a)) s.pending++
    }

    const data = rows
      .filter((r) => r.students?.id)
      .map((rel) => {
        const st = byStudent[rel.students.id] || {
          total: 0,
          completed: 0,
          in_progress: 0,
          pending: 0,
          overdue: 0,
        }
        const lastReviewedAt = lastReview[rel.students.id] || null
        return {
          relationshipId: rel.id,
          studentId: rel.students.id,
          name: rel.students.profiles?.full_name || 'Student',
          usn: rel.students.usn || '',
          connectedAt: rel.assigned_at,
          ...st,
          lastReviewedAt,
          needsReview: studentNeedsReview({
            overdue: st.overdue,
            pending: st.pending,
            lastReviewedAt,
          }),
        }
      })
    return { data, error: null }
  },

  // Student detail page for mentors. RLS scopes every query so a
  // non-connected student resolves to null.
  async getMentorStudentDetail(mentorId, studentId) {
    const [stRes, asgRes, remRes, revRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, usn, tracking_start_date, profiles(full_name, email)')
        .eq('id', studentId)
        .maybeSingle(),
      supabase
        .from('assignments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),
      supabase
        .from('mentor_remarks')
        .select('*, assignments(id, title)')
        .eq('student_id', studentId)
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false }),
      supabase
        .from('student_reviews')
        .select('reviewed_at, notes')
        .eq('student_id', studentId)
        .eq('mentor_id', mentorId)
        .order('reviewed_at', { ascending: false })
        .limit(1),
    ])
    const firstErr = stRes.error || asgRes.error || remRes.error || revRes.error
    if (firstErr) return { data: null, error: firstErr }
    if (!stRes.data) {
      return {
        data: null,
        error: { message: 'Student not found or not connected to you.' },
      }
    }
    return {
      data: {
        student: stRes.data,
        assignments: asgRes.data || [],
        remarks: remRes.data || [],
        lastReview: revRes.data?.[0] || null,
      },
      error: null,
    }
  },

  // Full mentor-view bundle for the Student Detail consistency section:
  // student row, assignments, habits and their completion logs — fetched
  // as SEPARATE queries and combined here. No cross-table embeds: the
  // previous .eq('habits.student_id', ...) filter on habit_logs without
  // habits in the select made PostgREST return "habits is not an
  // embedded resource in this request". Every query is RLS-scoped so a
  // non-connected student resolves to null / empty lists.
  async getMentorStudentConsistencyDetail(mentorId, studentId) {
    const detailRes = await this.getMentorStudentDetail(mentorId, studentId)
    if (detailRes.error) return detailRes
    if (!detailRes.data) return detailRes

    // Step 1: the student's habits (RLS: visible only if connected).
    const habitRes = await supabase
      .from('habits')
      .select('id, name, color, category, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
    if (habitRes.error) return { data: null, error: habitRes.error }
    const habits = habitRes.data || []

    // Step 2: their completion logs, scoped by habit ids (no embed needed).
    const habitIds = habits.map((h) => h.id)
    let habitLogs = []
    if (habitIds.length > 0) {
      const logRes = await supabase
        .from('habit_logs')
        .select('id, habit_id, log_date, count, completed')
        .in('habit_id', habitIds)
        .eq('completed', true)
      if (logRes.error) return { data: null, error: logRes.error }
      habitLogs = logRes.data || []
    }

    return {
      data: {
        ...detailRes.data,
        habits,
        habitLogs,
      },
      error: null,
    }
  },

  // Mentor-side remarks feed with student + assignment context.
  async getMentorRemarks(mentorId) {
    const { data, error } = await supabase
      .from('mentor_remarks')
      .select('*, assignments(id, title), students(id, profiles(full_name))')
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // ============================================
  // MENTOR DASHBOARD — STUDENT PROGRESS OVERVIEW
  // Per-student consistency snapshot for the dashboard's progress table:
  // streak / study days / habit % come from REAL habit_logs and completed
  // assignments, never estimated. Deadlines use the shared countdown rule.
  // RLS scopes every query to connected students only.
  // ============================================
  async getMentorProgressOverview(mentorId) {
    const base = await this.getMentorStudentsWithStats(mentorId)
    if (base.error) return { data: null, error: base.error }
    const rows = base.data || []
    if (rows.length === 0) return { data: [], error: null }

    const studentIds = rows.map((r) => r.studentId)

    // Habits + logs (separate queries, no cross-table embeds).
    const habitRes = await supabase
      .from('habits')
      .select('id, student_id, created_at')
      .in('student_id', studentIds)
    if (habitRes.error) return { data: null, error: habitRes.error }
    const habits = habitRes.data || []

    const habitIds = habits.map((h) => h.id)
    let habitLogs = []
    if (habitIds.length > 0) {
      const logRes = await supabase
        .from('habit_logs')
        .select('id, habit_id, log_date, completed')
        .in('habit_id', habitIds)
        .eq('completed', true)
      if (logRes.error) return { data: null, error: logRes.error }
      habitLogs = logRes.data || []
    }

    // Tracking start dates for the study-days denominators.
    const stRes = await supabase
      .from('students')
      .select('id, tracking_start_date')
      .in('id', studentIds)
    if (stRes.error) return { data: null, error: stRes.error }
    const startByStudent = {}
    for (const s of stRes.data || []) startByStudent[s.id] = s.tracking_start_date || null

    const today = dateKey()
    const logsByHabit = {}
    for (const l of habitLogs) {
      if (!l.completed) continue
      ;(logsByHabit[l.habit_id] ||= []).push(l.log_date)
    }
    const habitsByStudent = {}
    for (const h of habits) (habitsByStudent[h.student_id] ||= []).push(h)

    // Next unfinished deadline per student (nearest first, overdue excluded)
    // plus completion timestamps for active-day streaks.
    const asgAllRes = await supabase
      .from('assignments')
      .select('id, title, status, due_date, completed_at, updated_at, student_id')
      .in('student_id', studentIds)
    if (asgAllRes.error) return { data: null, error: asgAllRes.error }
    const assignmentsByStudent = {}
    for (const a of asgAllRes.data || []) {
      (assignmentsByStudent[a.student_id] ||= []).push(a)
    }

    const nextDue = {}
    for (const r of rows) {
      const future = (assignmentsByStudent[r.studentId] || [])
        .filter((a) => a.due_date && isoToKey(a.due_date) >= today)
        .sort((x, z) => new Date(x.due_date) - new Date(z.due_date))[0]
      if (future) {
        nextDue[r.studentId] = { title: future.title, countdown: dueCountdown({ dueKey: isoToKey(future.due_date), completed: false, todayK: today }) }
      }
    }

    const data = rows.map((r) => {
      const habitDates = [...new Set((habitsByStudent[r.studentId] || []).flatMap((h) => logsByHabit[h.id] || []))]
      // Merge assignment completion days into the active-day set so streaks
      // reflect ALL study activity (same rule as the Student Progress page).
      const assignDates = (assignmentsByStudent[r.studentId] || [])
        .filter((a) => a.status === 'completed' && a.completed_at)
        .map((a) => isoToKey(a.completed_at))
        .filter(Boolean)
      const startKey = startByStudent[r.studentId] || today
      const oc = overallConsistency(habitDates, assignDates, startKey, today)
      const habitsOf = habitsByStudent[r.studentId] || []
      const habitPct =
        habitsOf.length > 0
          ? Math.round(
              habitsOf.reduce((sum, h) => {
                const done = (logsByHabit[h.id] || []).length
                const created = h.created_at ? isoToKey(h.created_at) : today
                const age = Math.max(1, daysBetweenKeys(created, today) + 1)
                return sum + Math.min(100, Math.round((done / age) * 100))
              }, 0) / habitsOf.length
            )
          : null
      return {
        ...r,
        currentStreak: oc.currentStreak,
        studyDays: oc.activeDays,
        trackedDays: oc.totalDays,
        overallPct: oc.overallPct,
        habitCount: habitsOf.length,
        habitPct,
        nextDeadline: nextDue[r.studentId] || null,
        lastActivityAt: (assignmentsByStudent[r.studentId] || []).reduce(
          (latest, a) => (a.updated_at && (!latest || a.updated_at > latest) ? a.updated_at : latest),
          null
        ),
      }
    })
    return { data, error: null }
  },

  // "Mark as Reviewed" — one row per review event.
  async createStudentReview(mentorId, studentId, notes = null) {
    const { data, error } = await supabase
      .from('student_reviews')
      .insert({ mentor_id: mentorId, student_id: studentId, notes })
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // CHAT — private 1:1 Mentor <-> Student conversations.
  // Identity is always resolved server-side from auth.uid() (see migration
  // 008); the client never supplies student/mentor/sender ids. RLS enforces
  // that only a connected pair can view or write messages.
  // ============================================

  // Get (or lazily create) my conversation. Students: with their connected
  // mentor. Mentors: pass the connected student's row id.
  // Returns { data: conversation, error } — friendly message on error.
  async getOrCreateConversation(studentId = null) {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_student_id: studentId,
    })
    if (error) return { data: null, error: chatFriendlyError(error) }
    return { data, error: null }
  },

  // All my conversations with counterpart + last message + unread count,
  // via the RPC in migration 008. Ordered by most recent activity.
  async getMyConversations() {
    const { data, error } = await supabase.rpc('get_my_conversations')
    if (error) return { data: null, error: chatFriendlyError(error) }
    return { data: data || [], error: null }
  },

  // Full message history of one conversation (oldest first).
  async getConversationMessages(conversationId) {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, message, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) return { data: null, error: chatFriendlyError(error) }
    return { data: data || [], error: null }
  },

  // Send as the authenticated user. RLS enforces sender_id = auth.uid()
  // and conversation membership, so a spoofed sender_id is rejected.
  async sendMessage(conversationId, message) {
    const text = (message || '').trim()
    if (!text) return { data: null, error: { message: 'Message is empty.' } }
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user?.id, message: text })
      .select()
      .single()
    if (error) return { data: null, error: chatFriendlyError(error) }
    return { data, error: null }
  },

  // Mark all messages I received in this conversation as read.
  async markMessagesAsRead(conversationId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return { data: null, error: null }
    const { data, error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .is('read_at', null)
      .neq('sender_id', user.id)
      .select('id')
    if (error) return { data: null, error: chatFriendlyError(error) }
    return { data, error: null }
  },

  // Realtime: subscribe to new messages of one conversation.
  // Returns an unsubscribe function — always call it on cleanup.
  subscribeToMessages(conversationId, onMessage) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onMessage?.(payload.new)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  },
}

// Map raw Supabase/Postgres errors to clean user-facing messages while
// logging the technical detail for debugging.
function chatFriendlyError(error) {
  console.error('[dbService/chat]', error)
  const code = error?.code || ''
  if (code === '42501' || /row-level security/i.test(error?.message || '')) {
    return { message: 'You can only chat with students connected to you.' }
  }
  if (/no connected mentor/i.test(error?.message || '')) {
    return { message: 'Connect with a mentor to start chatting.' }
  }
  if (/student not connected/i.test(error?.message || '')) {
    return { message: 'This student is not connected to you.' }
  }
  if (/relation .* does not exist|schema cache/i.test(error?.message || '')) {
    return { message: 'Chat is not available yet — the database migration has not been applied.' }
  }
  return { message: 'Something went wrong with chat. Please try again.' }
}
