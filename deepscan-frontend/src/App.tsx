import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AppProvider } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { StudentOverlayProvider } from './lib/StudentOverlayContext';
import { ThemeProvider } from './lib/ThemeContext';

// Lazy load components
import StudentOverlay from './components/StudentOverlay';
import Sidebar from './components/Sidebar';

import { Auth } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ScanExtract from './pages/ScanExtract';
import ForgeryDetection from './pages/ForgeryDetection';
import RecordsDatabase from './pages/RecordsDatabase';
import Settings from './pages/Settings';
import History from './pages/History';
import Archive from './pages/Archive';
import DemoPipeline from './pages/DemoPipeline';
import Staging from './pages/Staging';
import Blacklist from './pages/Blacklist';
import { LanguageProvider } from './lib/LanguageContext';

// Public Marketing Pages
import PublicLayout from './components/public/PublicLayout';
import Landing from './pages/public/Landing';
import Demo from './pages/public/Demo';
import Pricing from './pages/public/Pricing';
import UseCases from './pages/public/UseCases';

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Error caught by boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: 'red' }}>
          <h1>❌ App Error</h1>
          <p>Check browser console (F12) for details</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ element }: { element: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return null; // or a loading spinner
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return <>{element}</>;
}



function AuthenticatedLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] flex transition-colors duration-500">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className={`flex-1 p-8 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Routes>
          <Route path="/" element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/scan" element={<ProtectedRoute element={<ScanExtract />} />} />
          <Route path="/forgery" element={<ProtectedRoute element={<ForgeryDetection />} />} />
          <Route path="/database" element={<ProtectedRoute element={<RecordsDatabase />} />} />
          <Route path="/history" element={<ProtectedRoute element={<History />} />} />
          <Route path="/archive" element={<ProtectedRoute element={<Archive />} />} />
          <Route path="/presentation" element={<ProtectedRoute element={<DemoPipeline />} />} />
          <Route path="/staging" element={<ProtectedRoute element={<Staging />} />} />
          <Route path="/blacklist" element={<ProtectedRoute element={<Blacklist />} />} />
          <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
        </Routes>
      </main>
      <StudentOverlay />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/use-cases" element={<UseCases />} />
      </Route>

      {/* Auth Route */}
      <Route path="/auth" element={<Auth />} />

      {/* Protected Dashboard Routes */}
      <Route path="/dashboard/*" element={<AuthenticatedLayout />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppWithProviders() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <StudentOverlayProvider>
              <AppRoutes />
            </StudentOverlayProvider>
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppWithProviders />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
