import client from './client';
import type { AuthUser } from '../types';

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => client.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    client.post<AuthResponse>('/auth/login', data).then((r) => r.data),
};
