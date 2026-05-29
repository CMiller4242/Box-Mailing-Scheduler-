import { useEffect, useState } from 'react';
import { usersApi } from '../api/users';
import type { User } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => { usersApi.list().then(setUsers).catch(console.error); }, []);
  return users;
}
