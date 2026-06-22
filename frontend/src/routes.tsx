import { Routes, Route } from 'react-router-dom'
import DashboardScreen from './features/dashboard/DashboardScreen'
function Stub({ name }: { name: string }) { return <div className="p-8 text-ink">{name}</div> }
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/library" element={<Stub name="Library" />} />
      <Route path="/review" element={<Stub name="Review" />} />
      <Route path="/add" element={<Stub name="Add" />} />
      <Route path="/progress" element={<Stub name="Progress" />} />
    </Routes>
  )
}
