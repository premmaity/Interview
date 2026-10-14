import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage, RecoveryPage, RegisterPage } from '../features/auth/AuthPages'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { HistoryPage } from '../features/dashboard/HistoryPage'
import { LiveInterviewPage } from '../features/interviews/LiveInterviewPage'
import { NewInterviewPage } from '../features/interviews/NewInterviewPage'
import { ReportPage } from '../features/interviews/ReportPage'
import { LandingPage } from '../features/landing/LandingPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { ComingSoonPage } from '../features/secondary/ComingSoonPage'
import { SettingsPage } from '../features/settings/SettingsPage'

export function App() {
  return <Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/recovery" element={<RecoveryPage />} /><Route element={<ProtectedRoute />}><Route path="/app" element={<AppShell />}><Route index element={<DashboardPage />} /><Route path="history" element={<HistoryPage />} /><Route path="profile" element={<ProfilePage />} /><Route path="settings" element={<SettingsPage />} /><Route path="interviews/new" element={<NewInterviewPage />} /><Route path="interviews/:id" element={<LiveInterviewPage />} /><Route path="interviews/:id/report" element={<ReportPage />} /><Route path="quiz" element={<ComingSoonPage feature="Quiz practice" />} /><Route path="resources" element={<ComingSoonPage feature="Preparation resources" />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}

