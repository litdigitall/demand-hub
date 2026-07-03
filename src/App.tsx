import { lazy, Suspense, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { SolicitarPage } from "./pages/SolicitarPage";

/* Cada rota carrega o próprio chunk sob demanda. Reduz drasticamente o
   tempo do primeiro paint. */
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const DemandasPage = lazy(() =>
  import("./pages/DemandasPage").then((m) => ({ default: m.DemandasPage })),
);
const NovaDemandaPage = lazy(() =>
  import("./pages/NovaDemandaPage").then((m) => ({ default: m.NovaDemandaPage })),
);
const DemandaDetailPage = lazy(() =>
  import("./pages/DemandaDetailPage").then((m) => ({ default: m.DemandaDetailPage })),
);
const ScoreBoardPage = lazy(() =>
  import("./pages/ScoreBoardPage").then((m) => ({ default: m.ScoreBoardPage })),
);
const KanbanPage = lazy(() =>
  import("./pages/KanbanPage").then((m) => ({ default: m.KanbanPage })),
);
const SponsorsPage = lazy(() =>
  import("./pages/SponsorsPage").then((m) => ({ default: m.SponsorsPage })),
);
const AprovacoesPage = lazy(() =>
  import("./pages/AprovacoesPage").then((m) => ({ default: m.AprovacoesPage })),
);
const CapacityPage = lazy(() =>
  import("./pages/CapacityPage").then((m) => ({ default: m.CapacityPage })),
);
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const ReportPage = lazy(() =>
  import("./pages/ReportPage").then((m) => ({ default: m.ReportPage })),
);
const IntegrationsPage = lazy(() =>
  import("./pages/IntegrationsPage").then((m) => ({ default: m.IntegrationsPage })),
);
const ApproversStatusPage = lazy(() =>
  import("./pages/ApproversStatusPage").then((m) => ({ default: m.ApproversStatusPage })),
);

function PageLoader() {
  return (
    <Center h="60vh">
      <Loader />
    </Center>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <>{children}</>;
}

function L({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/solicitar" element={<SolicitarPage />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<L><DashboardPage /></L>} />
            <Route path="demandas" element={<L><DemandasPage /></L>} />
            <Route path="demandas/nova" element={<L><NovaDemandaPage /></L>} />
            <Route path="demandas/:id" element={<L><DemandaDetailPage /></L>} />
            <Route path="kanban" element={<L><KanbanPage /></L>} />
            <Route path="scoreboard" element={<L><ScoreBoardPage /></L>} />
            <Route path="sponsors" element={<L><SponsorsPage /></L>} />
            <Route path="aprovacoes" element={<L><AprovacoesPage /></L>} />
            <Route path="approvers" element={<L><ApproversStatusPage /></L>} />
            <Route path="capacity" element={<L><CapacityPage /></L>} />
            <Route path="relatorio" element={<L><ReportPage /></L>} />
            <Route path="integraciones" element={<L><IntegrationsPage /></L>} />
            <Route path="admin" element={<L><AdminPage /></L>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
