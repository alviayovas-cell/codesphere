import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import RequireAuth from './components/RequireAuth'
import AdminDashboard from './pages/admin/AdminDashboard'
import LearningManagement from './pages/admin/LearningManagement'
import ChangePassword from './pages/ChangePassword'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import StudentDashboard from './pages/student/Dashboard'
import Learning from './pages/student/Learning'
import LearningTopicPage from './pages/student/LearningTopic'

function App() {
  return (
    <>
      <Navbar />
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
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
