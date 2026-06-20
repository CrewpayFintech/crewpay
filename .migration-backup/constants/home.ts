import type { HomeAction, HomeActionConfig } from '../types/app';

export const crewLeadHomeActions: HomeActionConfig[] = [
  {
    id: 'create-task',
    title: 'Create Task',
    subtitle: 'Post quick work',
    tone: 'blue',
  },
  {
    id: 'create-team',
    title: 'Create Team',
    subtitle: 'Build your crew',
    tone: 'orange',
  },
  {
    id: 'view-task',
    title: 'View Task',
    subtitle: 'Track active jobs',
    tone: 'purple',
  },
  {
    id: 'view-team',
    title: 'View Team',
    subtitle: 'Manage members',
    tone: 'black',
  },
];

export const crewMateHomeActions: HomeActionConfig[] = [
  {
    id: 'view-task',
    title: 'My Tasks',
    subtitle: 'Work waiting for you',
    tone: 'blue',
  },
  {
    id: 'view-team',
    title: 'My Teams',
    subtitle: 'Crews you joined',
    tone: 'orange',
  },
  {
    id: 'join-team',
    title: 'Join Team',
    subtitle: 'Use your invite code',
    tone: 'purple',
  },
  {
    id: 'submitted-work',
    title: 'My Submissions',
    subtitle: 'Proof sent for review',
    tone: 'black',
  },
];

export const homeActionLabels: Record<HomeAction, string> = {
  'create-task': 'Create Task',
  'create-team': 'Create Team',
  'join-team': 'Join Team',
  requests: 'Requests',
  'submit-proof': 'Submit Proof',
  'submitted-work': 'My Submissions',
  'view-task': 'View Task',
  'view-team': 'View Team',
};

export const walletSlides = [
  {
    title: 'Add money to your Crewpay wallet',
    subtitle: 'Fund tasks and payouts',
    tone: 'blue' as const,
  },
  {
    title: 'See transactions',
    subtitle: 'Track every movement',
    tone: 'orange' as const,
  },
  {
    title: 'View members',
    subtitle: 'Keep your crew close',
    tone: 'purple' as const,
  },
  {
    title: 'View tasks',
    subtitle: 'Review active work',
    tone: 'black' as const,
  },
];

export const crewMateSlides = [
  {
    title: 'Join a CrewPay team',
    subtitle: 'Use an invite code to get assigned work',
    tone: 'blue' as const,
  },
  {
    title: 'Submit task proof',
    subtitle: 'Send photos, notes, or documents',
    tone: 'orange' as const,
  },
  {
    title: 'Track approvals',
    subtitle: 'Know what is pending or accepted',
    tone: 'purple' as const,
  },
  {
    title: 'Keep payout details ready',
    subtitle: 'Admins pay the bank account you saved',
    tone: 'black' as const,
  },
];
