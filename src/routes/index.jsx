import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout'
import StudentLayout from '../layouts/StudentLayout'
import MentorLayout from '../layouts/MentorLayout'
import LoginPage from '../pages/auth/LoginPage'
import SignupPage from '../pages/auth/SignupPage'
import StudentHome from '../pages/student/StudentHome'
import StudyTracker from '../pages/student/StudyTracker'
import HabitTracker from '../pages/student/HabitTracker'
import Journal from '../pages/student/Journal'
import StudentRemarks from '../pages/student/StudentRemarks'
import StudentProgress from '../pages/student/StudentProgress'
import MentorDashboard from '../pages/mentor/MentorDashboard'
import StudentDetails from '../pages/mentor/StudentDetails'
import StudentDetailPage from '../pages/mentor/StudentDetailPage'
import MentorRemarks from '../pages/mentor/MentorRemarks'
import AssignedTasks from '../pages/mentor/AssignedTasks'
import MentorJournals from '../pages/mentor/MentorJournals'
import ProtectedRoute from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        path: 'student',
        element: (
          <ProtectedRoute role="student">
            <StudentLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <StudentHome />,
          },
          {
            path: 'study',
            element: <StudyTracker />,
          },
          {
            path: 'habits',
            element: <HabitTracker />,
          },
          {
            path: 'journal',
            element: <Journal />,
          },
          {
            path: 'remarks',
            element: <StudentRemarks />,
          },
          {
            path: 'progress',
            element: <StudentProgress />,
          },
        ],
      },
      {
        path: 'mentor',
        element: (
          <ProtectedRoute role="mentor">
            <MentorLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <MentorDashboard />,
          },
          {
            path: 'students',
            element: <StudentDetails />,
          },
          {
            path: 'students/:studentId',
            element: <StudentDetailPage />,
          },
          {
            path: 'remarks',
            element: <MentorRemarks />,
          },
          {
            path: 'tasks',
            element: <AssignedTasks />,
          },
          {
            path: 'journals',
            element: <MentorJournals />,
          },
        ],
      },
    ],
  },
])
