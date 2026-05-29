import client from './client';
import type { User } from '../types';

export const usersApi = {
  list: () => client.get<User[]>('/users').then((r) => r.data),
};
