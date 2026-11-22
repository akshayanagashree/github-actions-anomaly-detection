import React, { useState } from 'react';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import ComparisonPage from './pages/ComparisonPage';
import HistoryPage from './pages/HistoryPage';

/**
 * Root Application Router & State Container
 * Manages activePage state and coordinates top-level views.
 */
export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const handleNavigate = (pageId) => {
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAnalysis = (analysis) => {
    setSelectedAnalysis(analysis);
  };

  return (
    <AppShell activePage={activePage} onNavigate={handleNavigate}>
      {activePage === 'dashboard' && (
        <DashboardPage
          onNavigate={handleNavigate}
          onSelectAnalysis={handleSelectAnalysis}
        />
      )}
      {activePage === 'upload' && (
        <UploadPage
          onNavigate={handleNavigate}
          onSelectAnalysis={handleSelectAnalysis}
        />
      )}
      {activePage === 'results' && (
        <ResultsPage
          selectedAnalysis={selectedAnalysis}
          onNavigate={handleNavigate}
        />
      )}
      {activePage === 'comparison' && (
        <ComparisonPage
          selectedAnalysis={selectedAnalysis}
          onNavigate={handleNavigate}
        />
      )}
      {activePage === 'history' && (
        <HistoryPage
          onNavigate={handleNavigate}
          onSelectAnalysis={handleSelectAnalysis}
        />
      )}
    </AppShell>
  );
}
