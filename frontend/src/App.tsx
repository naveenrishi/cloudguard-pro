// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login                   from './pages/Login';
import Register                from './pages/Register';
import NewDashboard            from './pages/NewDashboard';
import VerifyEmail             from './pages/VerifyEmail';
import SetupMFA                from './pages/SetupMFA';
import VerifyMFA               from './pages/VerifyMFA';
import ConnectAWS              from './pages/ConnectAWS';
import Settings                from './pages/Settings';
import Recommendations         from './pages/Recommendations';
import AccountNuke             from './pages/AccountNuke';
import ChangeInvestigation     from './pages/ChangeInvestigation';
import AdvancedAnalytics       from './pages/AdvancedAnalytics';
import MigrationAdvisor        from './pages/MigrationAdvisor';
import CostAnalytics           from './pages/CostAnalytics';
import Optimization            from './pages/Optimization';
import Security                from './pages/Security';
import Compliance              from './pages/Compliance';
import Violations              from './pages/Violations';
import Resources               from './pages/Resources';
import Databases               from './pages/Databases';
import IAMPolicies             from './pages/IAMPolicies';
import Reports                 from './pages/Reports';
import ServiceNowTickets       from './pages/ServiceNowTickets';
import AccountMigrationAdvisor from './pages/AccountMigrationAdvisor';
import ChatBot                 from './components/ChatBot';
import Overview                from './pages/Overview';
import SubUsers                from './pages/SubUsers';
import CloudOnboarding              from './pages/CloudOnboarding';
import NotificationsPage       from './pages/Notifications';
import BillingPage             from './pages/Billing';
import Automation              from './pages/Automation';
import AlertCenter             from './pages/AlertCenter';
import { ThemeProvider }       from './context/ThemeContext';
import React                   from 'react';
// ── Intelligence Pages ──────────────────────────────────────────────────────
import AICloudArchitect    from './pages/AICloudArchitect';
import BlastRadius         from './pages/BlastRadius';
import FinOpsAnomalyFeed   from './pages/FinOpsAnomalyFeed';
import CarbonDashboard     from './pages/CarbonDashboard';
import ShadowITDetector    from './pages/ShadowITDetector';
import TeamBudgetWarrooms  from './pages/TeamBudgetWarrooms';

// ─── Guard: redirect first-time users to /onboarding ─────────────────────────
const RequireOnboarding: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" replace />;
  if (!user.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

// ─── Guard: already logged-in users shouldn't see login/register ──────────────
const RedirectIfLoggedIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');
  if (token && user.onboardingComplete) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* ── AUTH (public) ──────────────────────────────────────────────── */}
          <Route path="/login"        element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>}    />
          <Route path="/register"     element={<RedirectIfLoggedIn><Register /></RedirectIfLoggedIn>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/setup-mfa"    element={<SetupMFA />}    />
          <Route path="/verify-mfa"   element={<VerifyMFA />}   />

          {/* ── ONBOARDING ─────────────────────────────────────────────────── */}
          <Route path="/onboarding" element={<CloudOnboarding />} />

          {/* ── MAIN DASHBOARD ─────────────────────────────────────────────── */}
          <Route path="/dashboard" element={<RequireOnboarding><NewDashboard /></RequireOnboarding>} />

          {/* ── NOTIFICATIONS & ALERTS ─────────────────────────────────────── */}
          <Route path="/notifications" element={<RequireOnboarding><NotificationsPage /></RequireOnboarding>} />
          <Route path="/alerts"        element={<RequireOnboarding><AlertCenter /></RequireOnboarding>}       />

          {/* ── ACCOUNT-SPECIFIC ROUTES ────────────────────────────────────── */}
          <Route path="/account/:accountId/overview"          element={<RequireOnboarding><Overview /></RequireOnboarding>}                />
          <Route path="/account/:accountId/cost-analytics"    element={<RequireOnboarding><CostAnalytics /></RequireOnboarding>}           />
          <Route path="/account/:accountId/recommendations"   element={<RequireOnboarding><Optimization /></RequireOnboarding>}            />
          <Route path="/account/:accountId/optimization"      element={<RequireOnboarding><Optimization /></RequireOnboarding>}            />
          <Route path="/account/:accountId/security"          element={<RequireOnboarding><Security /></RequireOnboarding>}                />
          <Route path="/account/:accountId/iam"               element={<RequireOnboarding><IAMPolicies /></RequireOnboarding>}             />
          <Route path="/account/:accountId/resources"         element={<RequireOnboarding><Resources /></RequireOnboarding>}               />
          <Route path="/account/:accountId/databases"         element={<RequireOnboarding><Databases /></RequireOnboarding>}               />
          <Route path="/account/:accountId/migration-advisor" element={<RequireOnboarding><AccountMigrationAdvisor /></RequireOnboarding>} />
          <Route path="/account/:accountId/nuke"              element={<RequireOnboarding><AccountNuke /></RequireOnboarding>}             />
          <Route path="/account/:accountId/alerts"            element={<RequireOnboarding><AlertCenter /></RequireOnboarding>}             />
          <Route path="/account/:accountId/activity"             element={<RequireOnboarding><ChangeInvestigation /></RequireOnboarding>} />
          <Route path="/account/:accountId/audit"                element={<RequireOnboarding><ChangeInvestigation /></RequireOnboarding>} />
          <Route path="/account/:accountId/audit-logs"           element={<RequireOnboarding><ChangeInvestigation /></RequireOnboarding>} />
          <Route path="/account/:accountId/change-investigation" element={<RequireOnboarding><ChangeInvestigation /></RequireOnboarding>} />

          {/* ── INTELLIGENCE ROUTES ────────────────────────────────────────── */}
          <Route path="/account/:accountId/ai-architect"    element={<RequireOnboarding><AICloudArchitect /></RequireOnboarding>}   />
          <Route path="/account/:accountId/blast-radius"    element={<RequireOnboarding><BlastRadius /></RequireOnboarding>}        />
          <Route path="/account/:accountId/finops-feed"     element={<RequireOnboarding><FinOpsAnomalyFeed /></RequireOnboarding>}  />
          <Route path="/account/:accountId/carbon"          element={<RequireOnboarding><CarbonDashboard /></RequireOnboarding>}    />
          <Route path="/account/:accountId/shadow-it"       element={<RequireOnboarding><ShadowITDetector /></RequireOnboarding>}   />
          <Route path="/account/:accountId/budget-warrooms" element={<RequireOnboarding><TeamBudgetWarrooms /></RequireOnboarding>} />

          {/* ── GLOBAL ROUTES ──────────────────────────────────────────────── */}
          <Route path="/analytics"            element={<RequireOnboarding><AdvancedAnalytics /></RequireOnboarding>}   />
          <Route path="/migration-advisor"    element={<RequireOnboarding><MigrationAdvisor /></RequireOnboarding>}    />
          <Route path="/change-investigation" element={<RequireOnboarding><ChangeInvestigation /></RequireOnboarding>} />
          <Route path="/reports"              element={<RequireOnboarding><Reports /></RequireOnboarding>}             />
          <Route path="/billing"              element={<RequireOnboarding><BillingPage /></RequireOnboarding>}         />
          <Route path="/automation"           element={<RequireOnboarding><Automation /></RequireOnboarding>}          />
          <Route path="/iam-policies"         element={<RequireOnboarding><IAMPolicies /></RequireOnboarding>}         />
          <Route path="/settings"             element={<RequireOnboarding><Settings /></RequireOnboarding>}            />
          <Route path="/settings/users"       element={<RequireOnboarding><SubUsers /></RequireOnboarding>}            />

          {/* ── LEGACY ─────────────────────────────────────────────────────── */}
          <Route path="/recommendations"    element={<RequireOnboarding><Recommendations /></RequireOnboarding>}   />
          <Route path="/security"           element={<RequireOnboarding><Security /></RequireOnboarding>}          />
          <Route path="/compliance"         element={<RequireOnboarding><Compliance /></RequireOnboarding>}        />
          <Route path="/violations"         element={<RequireOnboarding><Violations /></RequireOnboarding>}        />
          <Route path="/resources"          element={<RequireOnboarding><Resources /></RequireOnboarding>}         />
          <Route path="/databases"          element={<RequireOnboarding><Databases /></RequireOnboarding>}         />
          <Route path="/servicenow-tickets" element={<RequireOnboarding><ServiceNowTickets /></RequireOnboarding>} />

          <Route path="/connect"       element={<CloudOnboarding />} />
          <Route path="/connect-aws"   element={<CloudOnboarding />} />
          <Route path="/connect-azure" element={<CloudOnboarding />} />
          <Route path="/connect-gcp"   element={<CloudOnboarding />} />
          <Route path="/connect-cloud" element={<CloudOnboarding />} />

          {/* ── REDIRECTS ──────────────────────────────────────────────────── */}
          <Route path="/"  element={<Navigate to="/login" replace />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
        <ChatBot position="bottom-right" />
      </Router>
    </ThemeProvider>
  );
}

export default App;
