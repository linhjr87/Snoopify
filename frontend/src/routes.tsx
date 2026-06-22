import { Routes, Route } from 'react-router-dom'
import DashboardScreen from './features/dashboard/DashboardScreen'
import LibraryScreen from './features/library/LibraryScreen'
import ReviewScreen from './features/review/ReviewScreen'
function Stub({ name }: { name: string }) { return <div className="p-8 text-ink">{name}</div> }
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/library" element={<LibraryScreen />} />
      <Route path="/review" element={<ReviewScreen />} />
      <Route path="/add" element={<Stub name="Add" />} />
      <Route path="/progress" element={<Stub name="Progress" />} />
    </Routes>
  )
}
