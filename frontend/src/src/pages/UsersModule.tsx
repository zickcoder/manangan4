import React, { useState, useEffect } from 'react';
import { Users, Shield, Building, Plus, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { fetchUsers } from '../lib/api';
import { User } from '../types';

export function UsersModule() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers().then(setUsers).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <span>Staff Directory & Access Roles</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Department officers, zoning administrators, and building inspectors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map((u) => (
          <Card key={u.id} hoverEffect className="border-[#cbd5e1] p-5 text-center space-y-3">
            <img
              src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2563eb&color=fff`}
              alt={u.name}
              className="w-16 h-16 rounded-2xl mx-auto object-cover border-2 border-white shadow-md shadow-slate-200"
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{u.name}</h3>
              <p className="text-[11px] text-slate-500">{u.department}</p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5">
              <Badge variant="info">{u.role}</Badge>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">{u.email}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
