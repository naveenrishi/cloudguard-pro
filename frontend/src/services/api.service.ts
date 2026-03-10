// src/services/api.service.ts
const BASE_URL = 'http://localhost:3000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

class ApiService {
  // ─── AUTH ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  }

  async register(payload: { name: string; email: string; password: string; company?: string }) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    return data;
  }

  // ─── ACCOUNTS ──────────────────────────────────────────────────────────────
  async getAccounts() {
    const res = await fetch(`${BASE_URL}/cloud/accounts`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch accounts');
    return Array.isArray(data) ? data : (data.accounts || []);
  }

  // ─── CONNECT AWS ───────────────────────────────────────────────────────────
  // Both names work — connectAWSAccount (old) and connectAwsAccount (new)
  async connectAWSAccount(payload: {
    accountName: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }) {
    const res = await fetch(`${BASE_URL}/cloud/accounts/aws/connect`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Failed to connect AWS');
    return data;
  }

  // Alias so both names work
  async connectAwsAccount(payload: {
    accountName: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }) {
    return this.connectAWSAccount(payload);
  }

  // ─── CONNECT AZURE ─────────────────────────────────────────────────────────
  async connectAzureAccount(payload: {
    accountName: string;
    tenantId: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
  }) {
    const res = await fetch(`${BASE_URL}/cloud/accounts/azure/connect`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Failed to connect Azure');
    return data;
  }

  // ─── DASHBOARD (per account) ───────────────────────────────────────────────
  // index.ts has /api/cloud/dashboard/:accountId
  async getAccountDashboard(accountId: string) {
    const res = await fetch(`${BASE_URL}/cloud/dashboard/${accountId}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard');
    return data;
  }

  // ─── COSTS ─────────────────────────────────────────────────────────────────
  async getCostData(accountId: string) {
    const res = await fetch(`${BASE_URL}/cloud/accounts/${accountId}/costs`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch costs');
    return data;
  }

  // ─── RESOURCES ─────────────────────────────────────────────────────────────
  async getResources(accountId: string) {
    const res = await fetch(`${BASE_URL}/cloud/accounts/${accountId}/resources`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch resources');
    return data;
  }

  // ─── SECURITY ──────────────────────────────────────────────────────────────
  async getSecurityFindings(accountId: string) {
    const res = await fetch(`${BASE_URL}/cloud/accounts/${accountId}/security`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch security');
    return data;
  }

  // ─── AUTOMATION ────────────────────────────────────────────────────────────
  async executeAutomation(payload: {
    cloud: string; accountId: string; serviceId: string;
    actionId: string; resourceId: string; code: string;
    taskName: string; reason?: string;
  }) {
    const res = await fetch(`${BASE_URL}/automation/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Execution failed');
    return data;
  }

  // ─── USERS ─────────────────────────────────────────────────────────────────
  async getUsers() {
    const res = await fetch(`${BASE_URL}/users`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch users');
    return data;
  }

  async createUser(payload: { name: string; email: string; role: string; password: string }) {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create user');
    return data;
  }

  async updateUser(userId: string, payload: Partial<{ name: string; role: string; isActive: boolean }>) {
    const res = await fetch(`${BASE_URL}/users/${userId}`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update user');
    return data;
  }

  async deleteUser(userId: string) {
    const res = await fetch(`${BASE_URL}/users/${userId}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete user');
    return data;
  }
}

export const apiService = new ApiService();
export default apiService;
