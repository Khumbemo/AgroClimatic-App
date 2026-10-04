import React, { lazy, useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import { DataProvider } from './data/DataProvider';
import LoginPage from './pages/LoginPage';
import { App as CapApp } from '@capacitor/app';

// Pages load on demand so the first screen downloads only what it needs.
const HomePage = lazy(() => import('./pages/home/HomePage'));
const ToolsPage = lazy(() => import('./pages/tools/ToolsPage'));
const CalcPage = lazy(() => import('./pages/calc/CalcPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const EnvironmentalLogsPage = lazy(() => import('./pages/tools/EnvironmentalLogsPage'));
const GerminationTrackerPage = lazy(() => import('./pages/tools/GerminationTrackerPage'));
const TreatmentLogsPage = lazy(() => import('./pages/tools/TreatmentLogsPage'));
const MorphometricsPage = lazy(() => import('./pages/tools/MorphometricsPage'));
const SpatialMappingPage = lazy(() => import('./pages/tools/SpatialMappingPage'));
const ExperimentalDesignPage = lazy(() => import('./pages/tools/ExperimentalDesignPage'));
const SubstratePage = lazy(() => import('./pages/tools/SubstratePage'));
const ProvenancePage = lazy(() => import('./pages/tools/ProvenancePage'));
const MortalityPage = lazy(() => import('./pages/tools/MortalityPage'));
const AuditPage = lazy(() => import('./pages/tools/AuditPage'));
const IrrigationPage = lazy(() => import('./pages/tools/IrrigationPage'));
const BatchListPage = lazy(() => import('./pages/nursery/BatchListPage'));
const BatchDetailPage = lazy(() => import('./pages/nursery/BatchDetailPage'));
const NewBatchPage = lazy(() => import('./pages/nursery/NewBatchPage'));
const RecordsPage = lazy(() => import('./pages/records/RecordsPage'));
const SeedLotsPage = lazy(() => import('./pages/records/SeedLotsPage'));
const SpeciesDBPage = lazy(() => import('./pages/species/SpeciesDBPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, user } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent shadow-md"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (location.pathname === '/') {
        CapApp.exitApp();
      } else if (canGoBack) {
        navigate(-1);
      } else {
        navigate('/');
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [location, navigate]);

  return null;
};

const AppRoutes = () => {
  return (
    <>
      <BackButtonHandler />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DataProvider><MainLayout /></DataProvider></ProtectedRoute>}>
          <Route index element={<HomePage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="tools/environmental" element={<EnvironmentalLogsPage />} />
          <Route path="tools/germination" element={<GerminationTrackerPage />} />
          <Route path="tools/treatments" element={<TreatmentLogsPage />} />
          <Route path="tools/morphometrics" element={<MorphometricsPage />} />
          <Route path="tools/spatial" element={<SpatialMappingPage />} />
          <Route path="tools/experimental" element={<ExperimentalDesignPage />} />
          <Route path="tools/substrate" element={<SubstratePage />} />
          <Route path="tools/provenance" element={<ProvenancePage />} />
          <Route path="tools/mortality" element={<MortalityPage />} />
          <Route path="tools/audit" element={<AuditPage />} />
          <Route path="tools/irrigation" element={<IrrigationPage />} />
          <Route path="calc" element={<CalcPage />} />
          <Route path="chat" element={<ChatPage />} />

          <Route path="nursery" element={<BatchListPage />} />
          <Route path="nursery/new" element={<NewBatchPage />} />
          <Route path="nursery/batch/:id" element={<BatchDetailPage />} />
          <Route path="nursery/batch/:id/edit" element={<NewBatchPage />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="records/seeds" element={<SeedLotsPage />} />
          <Route path="species" element={<SpeciesDBPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  );
};

// Sandboxed hosts (e.g. the single-file artifact build) can't rely on the page URL,
// so they keep routing state in memory instead.
const Router = import.meta.env.VITE_MEMORY_ROUTER === 'true' ? MemoryRouter : BrowserRouter;

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
