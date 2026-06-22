import { Routes, Route } from 'react-router-dom'
import DashboardScreen from './features/dashboard/DashboardScreen'
import LibraryScreen from './features/library/LibraryScreen'
import ReviewScreen from './features/review/ReviewScreen'
import AddScreen from './features/add/AddScreen'
import ProgressScreen from './features/progress/ProgressScreen'
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/library" element={<LibraryScreen />} />
      <Route path="/review" element={<ReviewScreen />} />
      <Route path="/add" element={<AddScreen />} />
      <Route path="/progress" element={<ProgressScreen />} />
    </Routes>
  )
}
