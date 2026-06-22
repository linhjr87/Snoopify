import { Routes, Route } from 'react-router-dom'
function Stub({ name }: { name: string }) { return <div className="p-8 text-ink">{name}</div> }
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Stub name="Dashboard" />} />
      <Route path="/library" element={<Stub name="Library" />} />
      <Route path="/review" element={<Stub name="Review" />} />
      <Route path="/add" element={<Stub name="Add" />} />
      <Route path="/progress" element={<Stub name="Progress" />} />
    </Routes>
  )
}
