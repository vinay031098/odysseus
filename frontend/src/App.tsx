import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/layout/PageLoader'
import { LoginPage } from '@/pages/LoginPage'

const ChatPage = lazy(() =>
  import('@/pages/ChatPage').then((m) => ({ default: m.ChatPage })),
)
const NotesPage = lazy(() =>
  import('@/pages/NotesPage').then((m) => ({ default: m.NotesPage })),
)
const TasksPage = lazy(() =>
  import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })),
)
const CalendarPage = lazy(() =>
  import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const MemoryPage = lazy(() =>
  import('@/pages/MemoryPage').then((m) => ({ default: m.MemoryPage })),
)
const ComparePage = lazy(() =>
  import('@/pages/ComparePage').then((m) => ({ default: m.ComparePage })),
)
const ResearchPage = lazy(() =>
  import('@/pages/ResearchPage').then((m) => ({ default: m.ResearchPage })),
)
const CookbookPage = lazy(() =>
  import('@/pages/CookbookPage').then((m) => ({ default: m.CookbookPage })),
)
const EmailPage = lazy(() =>
  import('@/pages/EmailPage').then((m) => ({ default: m.EmailPage })),
)
const AgentsPage = lazy(() =>
  import('@/pages/AgentsPage').then((m) => ({ default: m.AgentsPage })),
)
const GroupChatPage = lazy(() =>
  import('@/pages/GroupChatPage').then((m) => ({ default: m.GroupChatPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const GalleryPage = lazy(() =>
  import('@/pages/GalleryPage').then((m) => ({ default: m.GalleryPage })),
)
const LibraryPage = lazy(() =>
  import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })),
)
const BackgroundsPage = lazy(() =>
  import('@/pages/BackgroundsPage').then((m) => ({ default: m.BackgroundsPage })),
)

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route
            path="/chat"
            element={
              <LazyPage>
                <ChatPage />
              </LazyPage>
            }
          />
          <Route
            path="/chat/:sessionId"
            element={
              <LazyPage>
                <ChatPage />
              </LazyPage>
            }
          />
          <Route
            path="/group-chat"
            element={
              <LazyPage>
                <GroupChatPage />
              </LazyPage>
            }
          />
          <Route
            path="/agents"
            element={
              <LazyPage>
                <AgentsPage />
              </LazyPage>
            }
          />
          <Route
            path="/notes"
            element={
              <LazyPage>
                <NotesPage />
              </LazyPage>
            }
          />
          <Route
            path="/tasks"
            element={
              <LazyPage>
                <TasksPage />
              </LazyPage>
            }
          />
          <Route
            path="/calendar"
            element={
              <LazyPage>
                <CalendarPage />
              </LazyPage>
            }
          />
          <Route
            path="/memory"
            element={
              <LazyPage>
                <MemoryPage />
              </LazyPage>
            }
          />
          <Route
            path="/library"
            element={
              <LazyPage>
                <LibraryPage />
              </LazyPage>
            }
          />
          <Route
            path="/compare"
            element={
              <LazyPage>
                <ComparePage />
              </LazyPage>
            }
          />
          <Route
            path="/research"
            element={
              <LazyPage>
                <ResearchPage />
              </LazyPage>
            }
          />
          <Route
            path="/cookbook"
            element={
              <LazyPage>
                <CookbookPage />
              </LazyPage>
            }
          />
          <Route
            path="/email"
            element={
              <LazyPage>
                <EmailPage />
              </LazyPage>
            }
          />
          <Route
            path="/gallery"
            element={
              <LazyPage>
                <GalleryPage />
              </LazyPage>
            }
          />
          <Route
            path="/settings"
            element={
              <LazyPage>
                <SettingsPage />
              </LazyPage>
            }
          />
          <Route
            path="/backgrounds"
            element={
              <LazyPage>
                <BackgroundsPage />
              </LazyPage>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
      <Toaster richColors position="top-right" closeButton />
    </BrowserRouter>
  )
}
