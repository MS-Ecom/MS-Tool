import React, { useState, useEffect } from "react";
import { Sidebar, NavTab } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardPage } from "./pages/DashboardPage";
import { NewQuotePage } from "./pages/NewQuotePage";
import { QuotesListPage } from "./pages/QuotesListPage";
import { PackagesPage } from "./pages/PackagesPage";
import { TaxReferencesPage } from "./pages/TaxReferencesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ActivityLogsPage } from "./pages/ActivityLogsPage";
import { User, SyncStatus } from "./types";
import { api } from "./services/api";

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // Initial load
  const loadInitialData = async () => {
    try {
      const [user, users, sync] = await Promise.all([
        api.getCurrentUser(),
        api.getUsers(),
        api.getSyncStatus(),
      ]);
      setCurrentUser(user);
      setAllUsers(users);
      setSyncStatus(sync);
    } catch (err) {
      console.error("Initialization error:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSwitchUser = async (userId: string) => {
    try {
      const switched = await api.switchUser(userId);
      setCurrentUser(switched);
    } catch (err) {
      console.error("Failed to switch user:", err);
    }
  };

  const handleRefreshSync = async () => {
    try {
      setIsSyncing(true);
      const newStatus = await api.syncSpreadsheet();
      setSyncStatus(newStatus);
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setCurrentTab("quotes");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedQuoteId(null);
          setCurrentTab(tab);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Persistent Header */}
        <Header
          currentTab={currentTab}
          onNavigate={(tab) => {
            setSelectedQuoteId(null);
            setCurrentTab(tab);
          }}
          currentUser={currentUser}
          allUsers={allUsers}
          onSwitchUser={handleSwitchUser}
          syncStatus={syncStatus}
          onRefreshSync={handleRefreshSync}
          isSyncing={isSyncing}
        />

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto bg-slate-100/90 print:bg-white print:overflow-visible">
          {currentTab === "dashboard" && (
            <DashboardPage
              onNavigateToNewQuote={() => setCurrentTab("new-quote")}
              onNavigateToQuotes={() => setCurrentTab("quotes")}
              onViewQuote={handleViewQuote}
              currentUser={currentUser}
            />
          )}

          {currentTab === "new-quote" && (
            <NewQuotePage
              currentUser={currentUser}
              onViewQuote={handleViewQuote}
              onQuoteSaved={() => {
                // Keep ready
              }}
            />
          )}

          {currentTab === "quotes" && (
            <QuotesListPage
              currentUser={currentUser}
              onNavigateToNewQuote={() => setCurrentTab("new-quote")}
              selectedQuoteId={selectedQuoteId}
            />
          )}

          {currentTab === "packages" && (
            <PackagesPage currentUser={currentUser} />
          )}

          {currentTab === "tax" && <TaxReferencesPage />}

          {currentTab === "settings" && (
            <SettingsPage
              currentUser={currentUser}
              onRefreshData={loadInitialData}
            />
          )}

          {currentTab === "logs" && <ActivityLogsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
