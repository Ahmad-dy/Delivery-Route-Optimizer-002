import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Route,
  Sparkles,
  Users,
  Truck,
  Settings as SettingsIcon,
  LogOut,
  Globe,
  ShieldCheck,
  PackageCheck,
  ClipboardCheck,
  History as HistoryIcon,
  BarChart3
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { AuthUser } from '../../core/application/ports/AuthRepository';

export type NavTab =
  | 'dashboard'
  | 'import'
  | 'routing'
  | 'optimization'
  | 'distribution'
  | 'history'
  | 'reports'
  | 'buyers'
  | 'drivers'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: AuthUser | null;
  onSignOut: () => void;
  locale: 'ar' | 'en';
  onToggleLocale: () => void;
  messages: Messages;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onSignOut,
  locale,
  onToggleLocale,
  messages
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: messages.navigation.dashboard, icon: LayoutDashboard },
    { id: 'import' as NavTab, label: messages.navigation.import, icon: FileSpreadsheet },
    { id: 'routing' as NavTab, label: messages.navigation.routing, icon: Route },
    { id: 'optimization' as NavTab, label: messages.navigation.optimization, icon: Sparkles },
    { id: 'distribution' as NavTab, label: messages.navigation.distribution, icon: ClipboardCheck },
    { id: 'history' as NavTab, label: messages.navigation.history, icon: HistoryIcon },
    { id: 'reports' as NavTab, label: messages.navigation.reports, icon: BarChart3 },
    { id: 'buyers' as NavTab, label: messages.navigation.buyers, icon: Users },
    { id: 'drivers' as NavTab, label: messages.navigation.drivers, icon: Truck },
    { id: 'settings' as NavTab, label: messages.navigation.settings, icon: SettingsIcon }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>{messages.common.appName}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono">
                  v3.0
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                {messages.common.appSubtitle}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Locale & User */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <button
              id="lang-toggle-btn"
              onClick={onToggleLocale}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Change Language"
            >
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              <span>{locale === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* User Profile Badge & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-slate-800">
                <div className="flex items-center gap-2 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60 text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <div className="text-right rtl:text-left">
                    <span className="font-semibold text-slate-200 block truncate max-w-[120px]">
                      {user.displayName || user.email}
                    </span>
                  </div>
                </div>

                <button
                  id="signout-btn"
                  onClick={onSignOut}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                  title={messages.auth.signOut}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-nav-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium ${
                  isActive ? 'text-blue-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
