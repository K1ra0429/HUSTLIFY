import { useState } from 'react';
import { adminAuth } from '@/lib/adminApi';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

const AdminApp = () => {
  const [loggedIn, setLoggedIn] = useState(adminAuth.isLoggedIn());

  if (!loggedIn) return <AdminLogin onSuccess={() => setLoggedIn(true)} />;
  return <AdminDashboard onLogout={() => setLoggedIn(false)} />;
};

export default AdminApp;
