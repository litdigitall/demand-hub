import { lazy, Suspense, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { RequireRole } from "./components/RequireRole";
import { Role } from "./domain/roles";
import { LoginPage } from "./pages/LoginPage";
import { SolicitarPage } from "./pages/SolicitarPage";

/* Cada rota carrega o próprio chunk sob demanda. */
const InboxPage = lazy(() =>
  import("./pages/InboxPage").then((m) => ({ default: m.InboxPage })),
);
const RequestsPage = lazy(() =>
  import("./pages/requests/RequestsPage").then((m) => ({ default: m.RequestsPage })),
);
const DemandaDetailPage = lazy(() =>
  import("./pages/DemandaDetailPage").then((m) => ({ default: m.DemandaDetailPage })),
);
const OverviewPage = lazy(() =>
  import("./pages/OverviewPage").then((m) => ({ default: m.OverviewPage })),
);
const CapacityPage = lazy(() =>
  import("./pages/CapacityPage").then((m) => ({ default: m.CapacityPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

function PageLoader() {
  return (
    <Center h="60vh">
      <Loader />
    </Center>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, resolvendo } = useAuth();
  const loc = useLocation();
  /* Em produção a identidade vem do host do Power Apps: enquanto ela não
     chega não dá para decidir entre "logado" e "mandar para o login". */
  if (resolvendo) return <PageLoader />;
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
          {/* Porta de entrada pública (usada enquanto o Canvas externo não
              estiver publicado — ver VITE_INTAKE_FORM_URL em AppLayout). */}
          <Route path="/solicitar" element={<SolicitarPage />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            {/* Inbox é a casa: "o que precisa de mim agora" */}
            <Route index element={<L><InboxPage /></L>} />

            {/* Uma coleção, três visões (?view=table|board|priority) */}
            <Route path="demandas" element={<L><RequestsPage /></L>} />
            <Route path="demandas/:id" element={<L><DemandaDetailPage /></L>} />

            <Route
              path="overview"
              element={
                <RequireRole roles={[Role.PMO, Role.Decisor]}>
                  <L><OverviewPage /></L>
                </RequireRole>
              }
            />
            <Route
              path="capacity"
              element={
                <RequireRole roles={[Role.PMO, Role.TechLead]}>
                  <L><CapacityPage /></L>
                </RequireRole>
              }
            />
            <Route
              path="admin"
              element={
                <RequireRole roles={[Role.Admin]}>
                  <L><SettingsPage /></L>
                </RequireRole>
              }
            />

            {/* Compatibilidade: links salvos das telas que viraram visões.
                Sem isto cairiam no catch-all e o usuário acharia que sumiu. */}
            <Route path="kanban" element={<Navigate to="/demandas?view=board" replace />} />
            <Route path="scoreboard" element={<Navigate to="/demandas?view=priority" replace />} />
            <Route path="approvers" element={<Navigate to="/demandas?status=aprovacao" replace />} />
            <Route path="aprovacoes" element={<Navigate to="/" replace />} />
            <Route path="relatorio" element={<Navigate to="/overview" replace />} />
            <Route path="sponsors" element={<Navigate to="/demandas" replace />} />
            <Route path="integraciones" element={<Navigate to="/admin" replace />} />
            <Route path="demandas/nova" element={<Navigate to="/solicitar" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
