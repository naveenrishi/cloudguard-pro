import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import NewDashboard from './pages/NewDashboard';
import VerifyEmail from './pages/VerifyEmail';
import SetupMFA from './pages/SetupMFA';
import VerifyMFA from './pages/VerifyMFA';
import ConnectAWS from './pages/ConnectAWS';
import Settings from './pages/Settings';
import Recommendations from './pages/Recommendations';
import ConnectAzure from './pages/ConnectAzure';
import NukeDashboard from './pages/NukeDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/setup-mfa" element={<SetupMFA />} />
        <Route path="/verify-mfa" element={<VerifyMFA />} />
        <Route path="/connect-aws" element={<ConnectAWS />} />
        <Route path="/dashboard" element={<NewDashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="/connect-azure" element={<ConnectAzure />} />
        <Route path="/nuke" element={<NukeDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
