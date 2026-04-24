import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';

// New main tabs
import HomePage from './pages/home/HomePage';
import ToolsPage from './pages/tools/ToolsPage';
import CalcPage from './pages/calc/CalcPage';
import ChatPage from './pages/chat/ChatPage';

// Scientific tool pages
import EnvironmentalLogsPage from './pages/tools/EnvironmentalLogsPage';
import GerminationTrackerPage from './pages/tools/GerminationTrackerPage';
import TreatmentLogsPage from './pages/tools/TreatmentLogsPage';
import MorphometricsPage from './pages/tools/MorphometricsPage';
import SpatialMappingPage from './pages/tools/SpatialMappingPage';

// Advanced research pages
import ExperimentalDesignPage from './pages/tools/ExperimentalDesignPage';
import SubstratePage from './pages/tools/SubstratePage';
import ProvenancePage from './pages/tools/ProvenancePage';
import MortalityPage from './pages/tools/MortalityPage';
import AuditPage from './pages/tools/AuditPage';

// Existing tool pages
import BatchListPage from './pages/nursery/BatchListPage';
import BatchDetailPage from './pages/nursery/BatchDetailPage';
import NewBatchPage from './pages/nursery/NewBatchPage';
import RecordsPage from './pages/records/RecordsPage';
import SeedLotsPage from './pages/records/SeedLotsPage';
import SpeciesDBPage from './pages/species/SpeciesDBPage';
import SettingsPage from './pages/settings/SettingsPage';

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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
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
            <Route path="calc" element={<CalcPage />} />
            <Route path="chat" element={<ChatPage />} />
            
            <Route path="nursery" element={<BatchListPage />} />
            <Route path="nursery/new" element={<NewBatchPage />} />
            <Route path="nursery/batch/:id" element={<BatchDetailPage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="records/seeds" element={<SeedLotsPage />} />
            <Route path="species" element={<SpeciesDBPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
