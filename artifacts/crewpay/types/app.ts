import type { ImageSourcePropType } from 'react-native';

import type { CreateTeamInput } from '../lib/team-service';
import type { TaskWithTeams } from '../lib/task-service';

export type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  image?: ImageSourcePropType;
  imageScale?: number;
  imageOffsetY?: number;
  imageOffsetX?: number;
  accent?: string;
  cta: string;
};

export type AppScreen =
  | 'onboarding'
  | 'email'
  | 'passcode-lock'
  | 'account-intro'
  | 'setup'
  | 'home'
  | 'create-task'
  | 'create-team'
  | 'join-team'
  | 'chat'
  | 'notifications'
  | 'requests'
  | 'submissions'
  | 'submit-proof'
  | 'view-task'
  | 'view-team'
  | 'bulk-transfer'
  | 'payout-history'
  | 'edit-bank';

export type EmailStep = 'entry' | 'otp';
export type AccountIntroSource = 'onboarding' | 'email';
export type AccountRole = 'crewlead' | 'crewmate';
export type HomeTab = 'home' | 'activity' | 'settings';

export type HomeAction =
  | 'create-task'
  | 'create-team'
  | 'join-team'
  | 'requests'
  | 'submit-proof'
  | 'submitted-work'
  | 'view-task'
  | 'view-team';

export type HomeActionConfig = {
  id: HomeAction;
  title: string;
  subtitle: string;
  tone: 'blue' | 'orange' | 'purple' | 'black';
};

export type TeamCreationStep =
  | 'name'
  | 'category'
  | 'location'
  | 'join'
  | 'payout'
  | 'permissions'
  | 'review';

export type TaskCreationStep =
  | 'basics'
  | 'teams'
  | 'instructions'
  | 'location'
  | 'payout'
  | 'proof'
  | 'assignment'
  | 'review';

export type TeamDraft = CreateTeamInput;

export type SubmissionDraft = {
  task: TaskWithTeams;
  team: TeamDraft;
};

export type SyncStatus = 'idle' | 'loading';

export type SetupStep =
  | 'country'
  | 'phone'
  | 'sms'
  | 'password'
  | 'confirmPassword'
  | 'passcode'
  | 'confirmPasscode'
  | 'complete'
  | 'profile'
  | 'address'
  | 'bankDetails';

export type CountryOption = {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
};
