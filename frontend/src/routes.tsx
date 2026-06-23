import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import DashboardScreen from './features/dashboard/DashboardScreen'
import LibraryScreen from './features/library/LibraryScreen'
import ReviewScreen from './features/review/ReviewScreen'
import AddScreen from './features/add/AddScreen'
import ProgressScreen from './features/progress/ProgressScreen'
import AuthScreen from './features/auth/AuthScreen'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { GuidedTourOverlay } from './components/layout/GuidedTourOverlay'
import { useAppStore } from './store/useAppStore'
import { useTourStore } from './store/useTourStore'

function ProtectedLayout() {
  const { isAuthenticated } = useAppStore()
  const startTour = useTourStore(s => s.startTour)

  useEffect(() => {
    if (isAuthenticated && localStorage.getItem('myenglish_tour_done') !== '1') {
      setTimeout(startTour, 450)
    }
  }, [isAuthenticated, startTour])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '34px 46px 60px',
          maxWidth: 1200,
        }}
      >
        <Topbar />
        <Outlet />
      </main>
      <GuidedTourOverlay />
    </div>
  )
}

export function AppRoutes() {
  const { isAuthenticated } = useAppStore()

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <AuthScreen />
      } />
      
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="/review" element={<ReviewScreen />} />
        <Route path="/add" element={<AddScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
      </Route>
    </Routes>
  )
}
