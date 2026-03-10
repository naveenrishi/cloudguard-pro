// src/pages/SubUsers.tsx — CREATE this new file (it does not exist yet)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Edit2, Shield, Eye,
  DollarSign, Server, Settings, Check, X, User, Mail,
} from 'lucide-react';

interface SubUser {
  id: string; name: string; email: string; role: string;
  permissions: string[]; status: 'Active' | 'Invited'; createdAt: string;
}

const ALL_PERMISSIONS = [
  { key:'view_costs',      label:'View Costs',       icon:DollarSign, desc:'See billing and cost data'             },
  { key:'view_resources',  label:'View Resources',   icon:Server,     desc:'See all cloud resources'              },
  { key:'view_security',   label:'View Security',    icon:Shield,     desc:'See security findings & compliance'   },
  { key:'manage_accounts', label:'Manage Accounts',  icon:Settings,   desc:'Connect / disconnect cloud accounts'  },
  { key:'view_reports',    label:'View Reports',     icon:Eye,        desc:'Access and export reports'            },
  { key:'manage_users',    label:'Manage Users',     icon:User,       desc:'Add / remove sub-users'               },
];

const ROLES: Record<string,{ label:string; color:string; bg:string; permissions:string[] }> = {
  admin:    { label:'Admin',           color:'#7c3aed', bg:'#f5f3ff', permissions: ALL_PERMISSIONS.map(p=>p.key) },
  analyst:  { label:'Cost Analyst',    color:'#2563eb', bg:'#eff6ff', permissions: ['view_costs','view_resources','view_reports'] },
  security: { label:'Security Analyst',color:'#059669', bg:'#f0fdf4', permissions: ['view_security','view_resources','view_reports'] },
  readonly: { label:'Read Only',       color:'#64748b', bg:'#f8fafc', permissions: ['view_costs','view_resources','view_security','view_reports'] },
  custom:   { label:'Custom',          color:'#d97706', bg:'#fffbeb', permissions: [] },
};

const DEMO_USERS: SubUser[] = [
  { id:'1', name:'Sarah Johnson', email:'sarah@company.com', role:'analyst',  permissions:['view_costs','view_resources','view_reports'],                        status:'Active',  createdAt:'Jan 15, 2026' },
  { id:'2', name:'Mike Chen',     email:'mike@company.com',  role:'security', permissions:['view_security','view_resources','view_reports'],                     status:'Active',  createdAt:'Feb 3, 2026'  },
  { id:'3', name:'Lisa Park',     email:'lisa@company.com',  role:'readonly', permissions:['view_costs','view_resources','view_security','view_reports'],         status:'Invited', createdAt:'Mar 1, 2026'  },
];

export default function SubUsers() {
  const navigate = useNavigate();
  const [users,         setUsers]         = useState<SubUser[]>(DEMO_USERS);
  const [showModal,     setShowModal]     = useState(false);
  const [editUser,      setEditUser]      = useState<SubUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name:'', email:'', role:'readonly', permissions: ROLES.readonly.permissions });

  const openAdd  = () => {
    setEditUser(null);
    setForm({ name:'', email:'', role:'readonly', permissions: ROLES.readonly.permissions });
    setShowModal(true);
  };
  const openEdit = (u: SubUser) => {
    setEditUser(u);
    setForm({ name:u.name, email:u.email, role:u.role, permissions:u.permissions });
    setShowModal(true);
  };

  const handleRoleChange = (role: string) =>
    setForm(f => ({ ...f, role, permissions: role === 'custom' ? f.permissions : ROLES[role]?.permissions || [] }));

  const togglePerm = (key: string) =>
    setForm(f => ({
      ...f, role:'custom',
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }));

  const handleSave = () => {
    if (!form.name || !form.email) return;
    if (editUser) {
      setUsers(us => us.map(u => u.id === editUser.id ? { ...u, ...form } : u));
    } else {
      setUsers(us => [...us, {
        id: Date.now().toString(), ...form, status:'Invited',
        createdAt: new Date().toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }),
      }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => { setUsers(us => us.filter(u => u.id !== id)); setDeleteConfirm(null); };

  return (
    <div className="page-wrapper">

      {/* HEADER with Back button */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={14}/> Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 mb-0.5">User Management</h1>
          <p className="text-gray-500 text-sm">Manage sub-users and their access permissions</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus size={14}/> Invite User
        </button>
      </div>

      {/* ROLE LEGEND */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(ROLES).map(([key, r]) => (
          <div key={key} className="section-card py-3 px-4 text-center">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-1"
              style={{ background:r.bg, color:r.color }}>{r.label}</span>
            <p className="text-gray-400 text-xs">{r.permissions.length} permissions</p>
          </div>
        ))}
      </div>

      {/* USERS TABLE */}
      <div className="section-card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Team Members ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                {['User','Role','Permissions','Status','Joined','Actions'].map((h,i) => (
                  <th key={h} className={`text-xs font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 ${i===0?'text-left':'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const role = ROLES[u.role] || ROLES.readonly;
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-bold text-xs">
                            {u.name.split(' ').map(n=>n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{u.name}</p>
                          <p className="text-gray-400 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background:role.bg, color:role.color }}>{role.label}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center max-w-[180px] mx-auto">
                        {u.permissions.slice(0,3).map(p => {
                          const perm = ALL_PERMISSIONS.find(ap => ap.key===p);
                          return perm
                            ? <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{perm.label}</span>
                            : null;
                        })}
                        {u.permissions.length > 3 &&
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">+{u.permissions.length-3}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.status==='Active'?'bg-green-50 text-green-700':'bg-orange-50 text-orange-600'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-400 text-xs">{u.createdAt}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(u)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                          <Edit2 size={13} className="text-gray-600"/>
                        </button>
                        {deleteConfirm === u.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(u.id)}
                              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                              <Check size={13} className="text-red-500"/>
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <X size={13} className="text-gray-500"/>
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(u.id)}
                            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <Trash2 size={13} className="text-red-500"/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}/>
          <div className="relative bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              {editUser ? 'Edit User' : 'Invite New User'}
            </h3>

            <div className="mb-4">
              <label className="label">Full Name *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                  placeholder="John Smith" className="input pl-9"/>
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Email Address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))}
                  placeholder="john@company.com" type="email" className="input pl-9"/>
              </div>
            </div>

            <div className="mb-5">
              <label className="label mb-2">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROLES).map(([key, r]) => (
                  <button key={key} onClick={() => handleRoleChange(key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.role===key ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                    <p className="text-xs font-bold mb-0.5" style={{ color:r.color }}>{r.label}</p>
                    <p className="text-xs text-gray-400">{r.permissions.length} permissions</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="label mb-2">
                Permissions
                {form.role !== 'custom' && <span className="text-gray-400 font-normal ml-1">(set by role)</span>}
              </label>
              <div className="space-y-2">
                {ALL_PERMISSIONS.map(p => {
                  const active = form.permissions.includes(p.key);
                  return (
                    <div key={p.key} onClick={() => togglePerm(p.key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        active ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                      }`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        active ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                      }`}>
                        {active && <Check size={11} className="text-white"/>}
                      </div>
                      <p.icon size={14} className={active ? 'text-blue-600' : 'text-gray-400'}/>
                      <div>
                        <p className={`text-sm font-medium ${active ? 'text-blue-800' : 'text-gray-700'}`}>{p.label}</p>
                        <p className="text-xs text-gray-400">{p.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={!form.name || !form.email}
                className={`btn flex-[2] ${form.name && form.email ? 'btn-primary' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {editUser ? 'Save Changes' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
