import React, { useEffect, useState } from 'react';
import { useAuthStore } from './state/authStore';
import { useBuyerStore } from './state/buyerStore';
import { useDriverStore } from './state/driverStore';
import { useSettingsStore } from './state/settingsStore';
import { useLocalization } from './localization/useLocalization';
import { Navbar, NavTab } from './presentation/components/Navbar';
import { DashboardView } from './presentation/views/DashboardView';
import { ImportView } from './presentation/views/ImportView';
import { RoutingView } from './presentation/views/RoutingView';
import { OptimizationView } from './presentation/views/OptimizationView';
import { DistributionView } from './presentation/views/DistributionView';
import { BuyersView } from './presentation/views/BuyersView';
import { DriversView } from './presentation/views/DriversView';
import { SettingsView } from './presentation/views/SettingsView';
import { LoginView } from './presentation/views/LoginView';
import { DistributionHistoryView } from './presentation/views/DistributionHistoryView';
import { DistributionHistoryDetailsView } from './presentation/views/DistributionHistoryDetailsView';
import { ReportsDashboardView } from './presentation/views/ReportsDashboardView';

export default function App() {
  const { user, status, initialize, signOut } = useAuthStore();
  const { fetchBuyers } = useBuyerStore();
  const { fetchDrivers } = useDriverStore();
  const { fetchSettings } = useSettingsStore();
  const { locale, toggleLocale, messages, isRtl } = useLocalization();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedHistoryDistributionId, setSelectedHistoryDistributionId] = useState<string | null>(null);

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== 'history') {
      setSelectedHistoryDistributionId(null);
    }
  };

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  // Load data once user is authenticated
  useEffect(() => {
    if (user) {
      fetchBuyers();
      fetchDrivers();
      fetchSettings();
    }
  }, [user, fetchBuyers, fetchDrivers, fetchSettings]);

  // Set HTML dir and lang dynamically
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [isRtl, locale]);

  if (!user && status !== 'loading') {
    return <LoginView messages={messages} locale={locale} onToggleLocale={toggleLocale} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-blue-500 selection:text-white flex flex-col">
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        user={user}
        onSignOut={signOut}
        locale={locale}
        onToggleLocale={toggleLocale}
        messages={messages}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView messages={messages} onNavigate={handleTabChange} />
        )}
        {activeTab === 'import' && <ImportView messages={messages} />}
        {activeTab === 'routing' && (
          <RoutingView
            messages={messages}
            onNavigateToImport={() => handleTabChange('import')}
          />
        )}
        {activeTab === 'optimization' && (
          <OptimizationView
            messages={messages}
            onNavigateToImport={() => handleTabChange('import')}
            onNavigateToRouting={() => handleTabChange('routing')}
            onNavigateToDistribution={() => handleTabChange('distribution')}
          />
        )}
        {activeTab === 'distribution' && (
          <DistributionView
            messages={messages}
            onNavigateToOptimization={() => handleTabChange('optimization')}
            onNavigateToImport={() => handleTabChange('import')}
            onNavigateToRouting={() => handleTabChange('routing')}
          />
        )}
        {activeTab === 'history' && (
          selectedHistoryDistributionId ? (
            <DistributionHistoryDetailsView
              distributionId={selectedHistoryDistributionId}
              onBack={() => setSelectedHistoryDistributionId(null)}
              messages={messages}
            />
          ) : (
            <DistributionHistoryView
              onSelectDistribution={(id) => setSelectedHistoryDistributionId(id)}
            />
          )
        )}
        {activeTab === 'reports' && (
          <ReportsDashboardView
            messages={messages}
            onNavigateToHistory={() => {
              setSelectedHistoryDistributionId(null);
              handleTabChange('history');
            }}
          />
        )}
        {activeTab === 'buyers' && <BuyersView messages={messages} />}
        {activeTab === 'drivers' && <DriversView messages={messages} />}
        {activeTab === 'settings' && <SettingsView messages={messages} />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{messages.common.appName} &copy; 2026</span>
          <span className="text-slate-400 font-mono">Stage 7 — Reporting, Exporting, History & Audit Engine</span>
        </div>
      </footer>
    </div>
  );
}
