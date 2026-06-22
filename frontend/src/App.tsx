import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { SettingsPanel } from './components/layout/SettingsPanel'
import { AppRoutes } from './routes'
export default function App() {
  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-6"><AppRoutes /></main>
      </div>
      <SettingsPanel />
    </div>
  )
}
