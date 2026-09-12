'use client';

import { useState, useEffect } from 'react';

export interface UserPermissions {
  lecturer?: {
    use_short_code?: boolean;
    manually_mark_students?: boolean;
    edit_attendance?: boolean;
    delete_attendance?: boolean;
  };
  librarian?: {
    can_use_tools?: boolean;
    can_mark?: boolean;
    can_view_sessions?: boolean;
    can_verify?: boolean;
    can_history?: boolean;
    can_flag?: boolean;
    can_edit?: boolean;
    can_delete?: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN' | 'STAFF';
  createdAt: string;
  institution_id?: string | null;
  can_mark_attendance?: boolean;
  permissions?: UserPermissions;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
