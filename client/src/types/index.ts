export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'MEMBER';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/** Minimal shape stored in AuthContext after login/register */
export interface AuthUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  managerId: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  mailDate: string;
  status: CampaignStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  campaignId: string;
  title: string;
  instructions?: string;
  owner?: Pick<User, 'id' | 'name' | 'firstName' | 'lastName' | 'email'>;
  ownerId?: string;
  dueDate: string;
  status: TaskStatus;
  priority: Priority;
  reminderDateTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignWithTasks extends Campaign {
  tasks: Task[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'campaign' | 'task';
  resourceId: string;
  status: string;
  priority?: Priority;
  campaignId?: string;
  ownerId?: string;
}
