import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Role } from './api/types';
import { Skeleton } from './design/components';
import { CreateVacancyScreen } from './employer/CreateVacancyScreen';
import { EmployerHome } from './employer/EmployerHome';
import { EmployerVacancyScreen } from './employer/EmployerVacancyScreen';
import { RegistryScreen } from './employer/RegistryScreen';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StartPage } from './pages/StartPage';
import { AdminRequestsPage } from './pages/admin/AdminRequestsPage';
import { BillingPage } from './pages/admin/BillingPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { ConsolePage } from './pages/admin/ConsolePage';
import { RegionPage } from './pages/admin/RegionPage';
import { UsersPage } from './pages/admin/UsersPage';
import { AppShell } from './shell/AppShell';
import { MessagesScreen } from './shell/MessagesScreen';
import { ProfileScreen } from './shell/ProfileScreen';
import { useApp } from './state/AppContext';
import { HomeScreen } from './worker/HomeScreen';
import { JobsScreen } from './worker/JobsScreen';
import { MapScreen } from './worker/MapScreen';
import { WorkerVacancyScreen } from './worker/WorkerVacancyScreen';

const EMPLOYERS: Role[] = ['APPLICANT', 'BUSINESS'];

/** Sin país elegido se va a la pantalla inicial; sin sesión, al login; con otro rol, al inicio. */
function Guard({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { region, user, role, booting } = useApp();
  const loc = useLocation();
  if (booting) return <Skeleton height={200} />;
  if (!region) return <Navigate to="/start" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function NeedsRegion({ children }: { children: ReactNode }) {
  const { region, user, booting } = useApp();
  if (booting) return <Skeleton height={200} />;
  if (!region) return <Navigate to="/start" replace />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Inicio según el rol: vacantes cercanas (trabajador), mis vacantes (quien contrata) o consola (administrador). */
function Home() {
  const { role } = useApp();
  if (role === 'WORKER') return <HomeScreen />;
  if (role === 'ADMIN') return <ConsolePage />;
  return <EmployerHome />;
}

/** La misma vacante se ve distinto para el trabajador (postularse) y para quien la publicó (gestionar). */
function VacancyByRole() {
  const { role } = useApp();
  return role === 'WORKER' ? <WorkerVacancyScreen /> : <EmployerVacancyScreen />;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/start" element={<StartPage />} />
        <Route path="/login" element={<NeedsRegion><LoginPage /></NeedsRegion>} />
        <Route path="/register" element={<NeedsRegion><RegisterPage /></NeedsRegion>} />
        <Route path="/" element={<Guard><Home /></Guard>} />

        {/* Quien contrata (persona o comercio) */}
        <Route path="/vacantes/nueva" element={<Guard roles={EMPLOYERS}><CreateVacancyScreen /></Guard>} />
        <Route path="/registro" element={<Guard roles={EMPLOYERS}><RegistryScreen /></Guard>} />

        {/* Trabajador */}
        <Route path="/mapa" element={<Guard roles={['WORKER']}><MapScreen /></Guard>} />
        <Route path="/trabajos" element={<Guard roles={['WORKER']}><JobsScreen /></Guard>} />

        {/* Comunes */}
        <Route path="/vacantes/:id" element={<Guard roles={[...EMPLOYERS, 'WORKER']}><VacancyByRole /></Guard>} />
        <Route path="/mensajes" element={<Guard><MessagesScreen /></Guard>} />
        <Route path="/profile" element={<Guard><ProfileScreen /></Guard>} />

        {/* Administrador */}
        <Route path="/admin/users" element={<Guard roles={['ADMIN']}><UsersPage /></Guard>} />
        <Route path="/admin/requests" element={<Guard roles={['ADMIN']}><AdminRequestsPage /></Guard>} />
        <Route path="/admin/categories" element={<Guard roles={['ADMIN']}><CategoriesPage /></Guard>} />
        <Route path="/admin/region" element={<Guard roles={['ADMIN']}><RegionPage /></Guard>} />
        <Route path="/admin/billing" element={<Guard roles={['ADMIN']}><BillingPage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
