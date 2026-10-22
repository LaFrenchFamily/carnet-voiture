import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { Layout } from '@/components/Layout'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RedirectIfSignedIn, RequireAuth } from '@/features/auth/RequireAuth'
import { CostsTab } from '@/features/costs/CostsTab'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ArchivedVehiclesPage } from '@/features/vehicles/ArchivedVehiclesPage'
import { DocumentsTab } from '@/features/documents/DocumentsTab'
import { EntryPage } from '@/features/entries/EntryPage'
import { JournalTab } from '@/features/entries/JournalTab'
import { RemindersTab } from '@/features/reminders/RemindersTab'
import { NewVehiclePage } from '@/features/vehicles/NewVehiclePage'
import { VehicleInfoTab } from '@/features/vehicles/VehicleInfoTab'
import { VehiclePage } from '@/features/vehicles/VehiclePage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const router = createBrowserRouter([
  { path: '/connexion', element: <RedirectIfSignedIn><LoginPage /></RedirectIfSignedIn> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'voitures/archivees', element: <ArchivedVehiclesPage /> },
          { path: 'voitures/nouvelle', element: <NewVehiclePage /> },
          {
            path: 'voitures/:vehicleId',
            element: <VehiclePage />,
            children: [
              { index: true, element: <Navigate to="journal" replace /> },
              { path: 'journal', element: <JournalTab /> },
              { path: 'entrees/nouvelle', element: <EntryPage /> },
              { path: 'entrees/:entryId', element: <EntryPage /> },
              { path: 'echeances', element: <RemindersTab /> },
              { path: 'factures', element: <DocumentsTab /> },
              { path: 'couts', element: <CostsTab /> },
              { path: 'infos', element: <VehicleInfoTab /> },
            ],
          },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
