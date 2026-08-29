import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RequireAuth from './components/RequireAuth'
import AdminDashboard from './pages/admin/AdminDashboard'
import Analytics from './pages/admin/Analytics'
import LearningManagement from './pages/admin/LearningManagement'
import Monitoring from './pages/admin/Monitoring'
import ProblemAdminDetail from './pages/admin/ProblemAdminDetail'
import ProblemManagement from './pages/admin/ProblemManagement'
import RoundManagement from './pages/admin/RoundManagement'
import StudentManagement from './pages/admin/StudentManagement'
import ChangePassword from './pages/ChangePassword'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import StudentDashboard from './pages/student/Dashboard'
import Leaderboard from './pages/student/Leaderboard'
import Learning from './pages/student/Learning'
import LearningTopicPage from './pages/student/LearningTopic'
import ProblemDetail from './pages/student/ProblemDetail'
import Problems from './pages/student/Problems'
import Results from './pages/student/Results'
import RoundSession from './pages/student/RoundSession'
import Rounds from './pages/student/Rounds'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        }
      />

      {/* Student */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/learning"
        element={
          <ProtectedRoute requiredRole="student">
            <Learning />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/learning/topics/:topicId"
        element={
          <ProtectedRoute requiredRole="student">
            <LearningTopicPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/problems"
        element={
          <ProtectedRoute requiredRole="student">
            <Problems />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/problems/:problemId"
        element={
          <ProtectedRoute requiredRole="student">
            <ProblemDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/rounds"
        element={
          <ProtectedRoute requiredRole="student">
            <Rounds />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/rounds/:roundId"
        element={
          <ProtectedRoute requiredRole="student">
            <RoundSession />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/rounds/:roundId/problems/:problemId"
        element={
          <ProtectedRoute requiredRole="student">
            <ProblemDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/leaderboard"
        element={
          <ProtectedRoute requiredRole="student">
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results"
        element={
          <ProtectedRoute requiredRole="student">
            <Results />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute requiredRole="admin">
            <StudentManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/learning"
        element={
          <ProtectedRoute requiredRole="admin">
            <LearningManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/problems"
        element={
          <ProtectedRoute requiredRole="admin">
            <ProblemManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/problems/:problemId"
        element={
          <ProtectedRoute requiredRole="admin">
            <ProblemAdminDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rounds"
        element={
          <ProtectedRoute requiredRole="admin">
            <RoundManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/monitoring"
        element={
          <ProtectedRoute requiredRole="admin">
            <Monitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requiredRole="admin">
            <Analytics />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
