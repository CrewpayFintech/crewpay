import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  nigerianBanks,
  saveBankAccount,
  type NigerianBank,
  getMyBankAccount,
} from './lib/bank-service';
import {
  createTeamRecord,
  defaultTeamTaskSettings,
  listMyTeamMemberships,
  teamRecordToDraft,
  updateTeamAccessSettings,
  updateTeamTaskSettings,
  type CreateTeamInput,
  type TeamTaskSettings,
} from './lib/team-service';
import { createTeamInvite, joinTeamWithInvite } from './lib/invite-service';
import {
  archiveTaskRecord,
  createTaskRecord,
  listMyTasks,
  updateTaskSettings,
  type CreateTaskInput,
  type TaskWithTeams,
} from './lib/task-service';
import {
  approveJoinRequest,
  listMyJoinRequestStatuses,
  listPendingJoinRequests,
  rejectJoinRequest,
  type MyJoinRequestStatus,
  type TeamJoinRequest,
} from './lib/request-service';
import {
  getTeamMemberDetail,
  listTeamMembers,
  removeTeamMember,
  updateTeamMemberRole,
  type TeamMemberDetail,
  type TeamMemberListItem,
} from './lib/member-service';
import {
  listTeamPayoutQueue,
  reservePayoutApprovals,
  updatePayoutApprovalAmount,
  type PayoutQueueItem,
} from './lib/payout-service';
import {
  listMyNotifications,
  markNotificationsRead,
  type AppNotification,
} from './lib/notification-service';
import {
  getSubmissionAssetUrl,
  listMyTaskSubmissions,
  listTeamTaskSubmissions,
  reviewTaskSubmission,
  submitTaskProof,
  uploadSubmissionAsset,
  type MyTaskSubmission,
  type SelectedSubmissionAsset,
  type SubmissionAsset,
  type SubmissionAssetKind,
  type TaskSubmissionRecord,
  type TeamTaskSubmission,
} from './lib/submission-service';
import {
  getCurrentUser,
  hasLocalPasscode,
  isValidEmail,
  normalizeEmail,
  saveLocalPasscode,
  sendEmailCode,
  setAccountPassword,
  signOut as signOutUser,
  validatePassword,
  verifyEmailCode,
  verifyLocalPasscode,
  type AuthMode,
} from './lib/auth-service';
import {
  getMyProfile,
  markOnboardingComplete,
  saveProfileAddress,
  saveProfileDetails,
  saveProfileRole,
} from './lib/profile-service';
import { supabase } from './lib/supabase';
import {
  createWalletDeposit,
  getWalletSummary,
  listWalletTransactions,
  verifyWalletDepositReturnUrl,
  type WalletTransaction,
} from './lib/wallet-service';
import { authRedirectUrl } from './constants/auth';
import {
  checkEmailImage,
  countries,
  crewLeadSetupSteps,
  crewMateSetupSteps,
  debitCard3dImage,
  defaultCountry,
  months,
  passcodeSecuredImage,
  persistentImageAssets,
  slides,
  splashImageAssets,
} from './constants/onboarding';
import {
  crewLeadHomeActions,
  crewMateHomeActions,
  crewMateSlides,
  homeActionLabels,
  walletSlides,
} from './constants/home';
import {
  taskApprovalOptions,
  taskAssignmentOptions,
  taskCategoryOptions,
  taskCreationSteps,
  taskLocationOptions,
  taskProofOptions,
  teamCategoryOptions,
  teamCategoryStructure,
  teamCreationSteps,
  teamJoinOptions,
  teamPayoutOptions,
  teamPermissionOptions,
} from './constants/team-task-options';
import { palette } from './constants/theme';
import type {
  AccountIntroSource,
  AccountRole,
  AppScreen,
  CountryOption,
  EmailStep,
  HomeAction,
  HomeActionConfig,
  HomeTab,
  SetupStep,
  Slide,
  SubmissionDraft,
  SyncStatus,
  TaskCreationStep,
  TeamCreationStep,
  TeamDraft,
} from './types/app';
import {
  extractInviteToken,
  formatRequestTime,
  getAuthCallbackParams,
  getErrorMessage,
  getJoinNotificationKey,
  getSeenJoinNotificationStorageKey,
  getTasksForTeam,
  getUniqueTeams,
} from './utils/app-helpers';
import {
  formatMoneyInput,
  formatNaira,
  formatNairaWhole,
  nairaSymbol,
  parseMoneyAmount,
} from './utils/money';
import {
  PasscodeDots,
  PasscodeKeypad,
} from './components/passcode/passcode-controls';
import { ChatScreen } from './components/chat/chat-screen';
import { PayoutQueueSheet } from './components/payouts/payout-queue-sheet';
import { SubmissionReviewSheet } from './components/submissions/submission-review-sheet';
import { MemberDetailSheet } from './components/team/member-detail-sheet';
import {
  ArrowDown,
  ArrowLeftRight,
  Bell,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  FileText,
  House,
  Image as ImageIcon,
  Link2,
  MapPin,
  MessageCircle,
  Send,
  Settings,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  FlatList,
  Image as RNImage,
  ImageSourcePropType,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  Vibration,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

function prefetchImageSource(image?: ImageSourcePropType | null) {
  if (!image) {
    return;
  }

  const imageHelpers = RNImage as any;

  try {
    const resolvedSource =
      typeof imageHelpers.resolveAssetSource === 'function'
        ? imageHelpers.resolveAssetSource(image)
        : typeof image === 'object' && image !== null && 'uri' in image
          ? image
          : undefined;
    const uri =
      typeof resolvedSource?.uri === 'string' ? resolvedSource.uri : undefined;

    if (uri && typeof imageHelpers.prefetch === 'function') {
      imageHelpers.prefetch(uri).catch(() => undefined);
    }
  } catch {
    // Image preloading is an optimization; it should never stop the app booting.
  }
}

function isWalletDepositReturnUrl(url?: string | null) {
  return Boolean(
    url &&
      (url.includes('wallet/deposit-return') ||
        url.includes('wallet_deposit_return=1')),
  );
}

const pendingWalletDepositStorageKey = 'crewpay.pendingWalletDepositTxRef';
const preferredRoleStorageKeyPrefix = 'crewpay.preferredRole.v1';
const seenSubmissionStorageKeyPrefix = 'crewpay.seen-submissions.v1';
type PendingInvite = {
  createdAt?: number;
  teamName?: string;
  token: string;
};

function getPreferredRoleStorageKey(userId: string) {
  return `${preferredRoleStorageKeyPrefix}.${userId}`;
}

function parseStoredAccountRole(value: string | null): AccountRole | null {
  return value === 'crewlead' || value === 'crewmate' ? value : null;
}

async function loadPreferredRole(userId: string): Promise<AccountRole | null> {
  if (!userId) {
    return null;
  }

  return parseStoredAccountRole(
    await AsyncStorage.getItem(getPreferredRoleStorageKey(userId)),
  );
}

async function persistPreferredRole(userId: string, role: AccountRole) {
  if (!userId) {
    return;
  }

  await AsyncStorage.setItem(getPreferredRoleStorageKey(userId), role);
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('onboarding');
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [emailStep, setEmailStep] = useState<EmailStep>('entry');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('create');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signedInUserId, setSignedInUserId] = useState('');
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockShake, setUnlockShake] = useState(0);
  const [accountIntroSource, setAccountIntroSource] =
    useState<AccountIntroSource>('onboarding');
  const [selectedRole, setSelectedRole] = useState<AccountRole>('crewmate');
  const [setupStartStep, setSetupStartStep] = useState<SetupStep>('country');
  const [createdTeam, setCreatedTeam] = useState<TeamDraft | null>(null);
  const [availableTeams, setAvailableTeams] = useState<TeamDraft[]>([]);
  const [createdTasks, setCreatedTasks] = useState<TaskWithTeams[]>([]);
  const [myTaskSubmissions, setMyTaskSubmissions] = useState<MyTaskSubmission[]>(
    [],
  );
  const [teamTaskSubmissionsByTeamId, setTeamTaskSubmissionsByTeamId] = useState<
    Record<string, TeamTaskSubmission[]>
  >({});
  const [submissionDraft, setSubmissionDraft] = useState<SubmissionDraft | null>(
    null,
  );
  const [teamMembersByTeamId, setTeamMembersByTeamId] = useState<
    Record<string, TeamMemberListItem[]>
  >({});
  const [myJoinRequestStatuses, setMyJoinRequestStatuses] = useState<
    MyJoinRequestStatus[]
  >([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [teamIdToOpen, setTeamIdToOpen] = useState('');
  const [seenJoinNotificationKeys, setSeenJoinNotificationKeys] = useState<string[]>(
    [],
  );
  const [seenSubmissionIds, setSeenSubmissionIds] = useState<string[]>([]);
  const [seenJoinNotificationsHydratedFor, setSeenJoinNotificationsHydratedFor] =
    useState('');
  const [seenSubmissionsHydratedFor, setSeenSubmissionsHydratedFor] = useState('');
  const [pendingJoinRequests, setPendingJoinRequests] = useState<TeamJoinRequest[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [syncError, setSyncError] = useState('');
  const initialSessionHandled = useRef(false);
  const visibleTeams = useMemo(() => {
    const roleScopedTeams = availableTeams.filter((team) => {
      if (selectedRole === 'crewmate') {
        return team.memberRole === 'member' || team.memberRole === 'admin';
      }

      return team.memberRole === 'owner' || team.memberRole === 'admin';
    });

    return getUniqueTeams(roleScopedTeams);
  }, [availableTeams, selectedRole]);
  const visibleTasks = useMemo(() => {
    const visibleTeamIds = new Set(
      visibleTeams.map((team) => team.id).filter(Boolean),
    );

    return createdTasks.filter((task) =>
      task.task_team_assignments?.some((assignment) =>
        visibleTeamIds.has(assignment.team_id),
      ),
    );
  }, [createdTasks, selectedRole, visibleTeams]);
  const unseenCrewMateNotificationCount = useMemo(() => {
    if (selectedRole !== 'crewmate') {
      return 0;
    }

    const seen = new Set(seenJoinNotificationKeys);

    return myJoinRequestStatuses.filter(
      (notification) => !seen.has(getJoinNotificationKey(notification)),
    ).length;
  }, [myJoinRequestStatuses, seenJoinNotificationKeys, selectedRole]);
  const unreadAppNotificationCount = useMemo(
    () => appNotifications.filter((notification) => !notification.read_at).length,
    [appNotifications],
  );
  const visiblePrimaryTeam = visibleTeams[0] ?? null;

  const openEmailRegistration = useCallback((mode: AuthMode = 'create') => {
    setAuthMode(mode);
    setAuthError('');
    setEmailOtpCode('');
    setEmailStep('entry');
    setScreen('email');
  }, []);

  const openAccountIntro = useCallback((source: AccountIntroSource) => {
    setAccountIntroSource(source);
    setScreen('account-intro');
  }, []);

  const routeSignedInUser = useCallback(
    async (options?: { requirePasscode?: boolean }) => {
      try {
        let profile = await getMyProfile();
        const user = await getCurrentUser();
        const hasPasscode = user ? await hasLocalPasscode(user.id) : false;
        const preferredRole = user?.id ? await loadPreferredRole(user.id) : null;
        const nextRole: AccountRole =
          preferredRole ?? profile?.account_role ?? selectedRole ?? 'crewmate';

        if (user?.email) {
          setEmailAddress(user.email);
        }

        setSelectedRole(nextRole);

        if (user?.id) {
          await persistPreferredRole(user.id, nextRole);
        }

        if (
          user?.email &&
          !profile?.account_role &&
          preferredRole
        ) {
          try {
            profile = await saveProfileRole({
              email: normalizeEmail(user.email),
              role: nextRole,
            });
          } catch (error) {
            setSyncError(`Account role sync failed: ${getErrorMessage(error)}`);
          }
        }

        if (options?.requirePasscode && user && hasPasscode) {
          setUnlockCode('');
          setUnlockError('');
          setScreen('passcode-lock');
          return;
        }

        if (profile?.onboarding_status === 'complete') {
          setScreen('home');
          return;
        }

        if (profile?.account_role) {
          setSetupStartStep(
            profile.onboarding_status === 'profile' ? 'address' : 'country',
          );
          setScreen('setup');
          return;
        }

        if (user && authMode === 'login') {
          if (user.email) {
            try {
              await saveProfileRole({
                email: normalizeEmail(user.email),
                role: nextRole,
              });
            } catch (error) {
              setSyncError(`Account repair failed: ${getErrorMessage(error)}`);
            }
          }

          setScreen('home');
          return;
        }

        openAccountIntro('email');
      } catch (error) {
        setSyncError(`Account restore failed: ${getErrorMessage(error)}`);

        const user = await getCurrentUser().catch(() => null);

        if (user) {
          setScreen('home');
          return;
        }

        openEmailRegistration('login');
      }
    },
    [authMode, openAccountIntro, openEmailRegistration, selectedRole],
  );

  const submitEmailForCode = useCallback(async () => {
    setAuthSubmitting(true);
    setAuthError('');

    try {
      const normalizedEmail = normalizeEmail(emailAddress);
      await sendEmailCode(normalizedEmail, authMode);
      setEmailAddress(normalizedEmail);
      setEmailOtpCode('');
      setEmailStep('otp');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }, [authMode, emailAddress]);

  const submitEmailOtp = useCallback(async () => {
    setAuthSubmitting(true);
    setAuthError('');

    try {
      await verifyEmailCode(emailAddress, emailOtpCode);

      if (authMode === 'login') {
        await routeSignedInUser({ requirePasscode: true });
        return;
      }

      openAccountIntro('email');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }, [authMode, emailAddress, emailOtpCode, openAccountIntro, routeSignedInUser]);

  const handleOAuthRedirectUrl = useCallback(
    async (url: string) => {
      const params = getAuthCallbackParams(url);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const code = params.get('code');
      const oauthError =
        params.get('error_description') || params.get('error') || '';

      if (!accessToken && !refreshToken && !code && !oauthError) {
        return;
      }

      setAuthSubmitting(true);
      setAuthError('');

      try {
        if (oauthError) {
          throw new Error(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }
        } else {
          throw new Error('Google did not return a complete sign-in session.');
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/');
        }

        await routeSignedInUser({ requirePasscode: true });
      } catch (error) {
        setAuthError(getErrorMessage(error));
        setScreen('email');
      } finally {
        setAuthSubmitting(false);
      }
    },
    [routeSignedInUser],
  );

  const submitGoogleAuth = useCallback(async () => {
    setAuthSubmitting(true);
    setAuthError('');
    Keyboard.dismiss();

    try {
      const isWeb = Platform.OS === 'web';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authRedirectUrl,
          queryParams: {
            prompt: 'select_account',
          },
          // We redirect manually on web so mobile browsers do not swallow the
          // OAuth navigation silently on a Pressable tap.
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (isWeb) {
        if (!data.url) {
          throw new Error('Google sign-in could not be started.');
        }

        window.location.assign(data.url);
        return;
      }

      if (!data.url) {
        throw new Error('Google sign-in could not be started.');
      }

      await Linking.openURL(data.url);
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }, []);

  const selectAccountRole = useCallback(
    async (role: AccountRole) => {
      setSelectedRole(role);

      try {
        const user = await getCurrentUser().catch(() => null);

        if (user?.id) {
          await persistPreferredRole(user.id, role);
        }

        await saveProfileRole({
          email: normalizeEmail(emailAddress || user?.email || ''),
          role,
        });
      } catch (error) {
        Alert.alert(
          'Could not save account type',
          getErrorMessage(error),
        );
      }

      setSetupStartStep('country');
      setScreen('setup');
    },
    [emailAddress],
  );

  const switchAccountRole = useCallback(async () => {
    const nextRole = selectedRole === 'crewlead' ? 'crewmate' : 'crewlead';

    setSelectedRole(nextRole);
    setScreen('home');

    try {
      const user = await getCurrentUser().catch(() => null);
      const roleEmail = normalizeEmail(emailAddress || user?.email || '');

      if (user?.id) {
        await persistPreferredRole(user.id, nextRole);
      }

      if (roleEmail) {
        await saveProfileRole({
          email: roleEmail,
          role: nextRole,
        });
      }
    } catch (error) {
      setSyncError(`Could not save role switch: ${getErrorMessage(error)}`);
    }
  }, [emailAddress, selectedRole]);

  const logoutCurrentUser = useCallback(async () => {
    try {
      await signOutUser();
      initialSessionHandled.current = false;
      setIsSignedIn(false);
      setSignedInUserId('');
      setSelectedRole('crewmate');
      setSetupStartStep('country');
      setAvailableTeams([]);
      setCreatedTeam(null);
      setCreatedTasks([]);
      setMyTaskSubmissions([]);
      setTeamTaskSubmissionsByTeamId({});
      setTeamMembersByTeamId({});
      setMyJoinRequestStatuses([]);
      setSeenJoinNotificationKeys([]);
      setSeenJoinNotificationsHydratedFor('');
      setSeenSubmissionIds([]);
      setSeenSubmissionsHydratedFor('');
      setPendingJoinRequests([]);
      setUnlockCode('');
      setUnlockError('');
      setUnlockShake(0);
      setSyncError('');
      setSyncStatus('idle');
      setAuthMode('login');
      setEmailStep('entry');
      setEmailOtpCode('');
      setAuthError('');
      setOnboardingIndex(0);
      setScreen('email');
    } catch (error) {
      Alert.alert('Could not log out', getErrorMessage(error));
    }
  }, []);

  const submitUnlockPasscode = useCallback(
    async (nextCode: string) => {
      if (!signedInUserId || nextCode.length !== 4) {
        return;
      }

      const result = await verifyLocalPasscode(signedInUserId, nextCode);

      if (result.ok) {
        setUnlockCode('');
        setUnlockError('');
        await routeSignedInUser();
        return;
      }

      setUnlockCode('');
      setUnlockShake((v) => v + 1);

      if (result.lockedUntil) {
        const unlockTime = new Date(result.lockedUntil).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });
        setUnlockError(`Too many tries. Try again after ${unlockTime}.`);
        return;
      }

      setUnlockError(
        `${result.attemptsRemaining} ${
          result.attemptsRemaining === 1 ? 'try' : 'tries'
        } left.`,
      );
    },
    [routeSignedInUser, signedInUserId],
  );

  const reportSyncError = useCallback((area: string, error: unknown) => {
    setSyncError(`${area}: ${getErrorMessage(error)}`);
  }, []);

  const handleIncomingUrl = useCallback(
    async (url: string) => {
      const authParams = getAuthCallbackParams(url);
      const hasAuthCallback =
        authParams.has('access_token') ||
        authParams.has('refresh_token') ||
        authParams.has('code') ||
        authParams.has('error') ||
        authParams.has('error_description');

      if (hasAuthCallback) {
        await handleOAuthRedirectUrl(url);
      }
    },
    [handleOAuthRedirectUrl],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url);
    });

    if (Platform.OS !== 'web') {
      Linking.getInitialURL()
        .then((url) => {
          if (url) {
            void handleIncomingUrl(url);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      subscription.remove();
    };
  }, [handleIncomingUrl]);

  useEffect(() => {
    let isMounted = true;

    const authCheckTimeout = setTimeout(() => {
      if (isMounted) {
        setAuthChecked(true);
      }
    }, 8000);

    const restoreSession = async () => {
      // Remove invite-link state written by older web builds. Team joining is
      // now code-only and must never influence authentication or onboarding.
      await AsyncStorage.removeItem('crewpay.pendingInvite.v1').catch(
        () => undefined,
      );

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const params = getAuthCallbackParams(window.location.href);
        const hasAuthCallback =
          params.has('access_token') ||
          params.has('refresh_token') ||
          params.has('code') ||
          params.has('error') ||
          params.has('error_description');

        if (hasAuthCallback) {
          await handleOAuthRedirectUrl(window.location.href);

          if (isMounted) {
            setAuthChecked(true);
          }

          return;
        }
      }

      const result = await supabase.auth.getSession();
      let user = result.data.session?.user;
      let isAnonymousUser = Boolean(
        (user as { is_anonymous?: boolean } | undefined)?.is_anonymous ||
          user?.app_metadata?.provider === 'anonymous',
      );

      if (user && !isAnonymousUser) {
        const validation = await supabase.auth.getUser();

        if (validation.error || !validation.data.user) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          user = undefined;
          isAnonymousUser = false;
        } else {
          user = validation.data.user;
        }
      }

      if (isAnonymousUser) {
        await supabase.auth.signOut();
      }

      if (!isMounted) {
        return;
      }

      setIsSignedIn(Boolean(user) && !isAnonymousUser);
      setSignedInUserId(isAnonymousUser ? '' : user?.id ?? '');

      if (!isAnonymousUser && user?.email) {
        setEmailAddress(user.email);
      }

      if (!isAnonymousUser && user && !initialSessionHandled.current) {
        initialSessionHandled.current = true;
        const isReturningFromWalletTopUp =
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          isWalletDepositReturnUrl(window.location.href);
        await routeSignedInUser({
          requirePasscode: !isReturningFromWalletTopUp,
        });

        if (isMounted) {
          setAuthChecked(true);
        }

        return;
      }

      setAuthChecked(true);
    };

    restoreSession().catch((error) => {
      if (isMounted) {
        setAuthChecked(true);
        setSyncStatus('idle');
        reportSyncError('Session restore failed', error);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const isAnonymousUser = Boolean(
        (user as { is_anonymous?: boolean } | undefined)?.is_anonymous ||
          user?.app_metadata?.provider === 'anonymous',
      );

      setIsSignedIn(Boolean(user) && !isAnonymousUser);
      setSignedInUserId(isAnonymousUser ? '' : user?.id ?? '');

      if (!isAnonymousUser && user?.email) {
        setEmailAddress(user.email);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(authCheckTimeout);
      subscription.unsubscribe();
    };
  }, [
    handleOAuthRedirectUrl,
    reportSyncError,
    routeSignedInUser,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (!signedInUserId) {
      setSeenJoinNotificationKeys([]);
      setSeenJoinNotificationsHydratedFor('');
      return () => {
        isMounted = false;
      };
    }

    AsyncStorage.getItem(getSeenJoinNotificationStorageKey(signedInUserId))
      .then((value) => {
        if (!isMounted) {
          return;
        }

        const parsed = value ? (JSON.parse(value) as unknown) : [];
        setSeenJoinNotificationKeys(
          Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string')
            : [],
        );
        setSeenJoinNotificationsHydratedFor(signedInUserId);
      })
      .catch(() => {
        if (isMounted) {
          setSeenJoinNotificationKeys([]);
          setSeenJoinNotificationsHydratedFor(signedInUserId);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [signedInUserId]);

  useEffect(() => {
    if (!signedInUserId || seenJoinNotificationsHydratedFor !== signedInUserId) {
      return;
    }

    AsyncStorage.setItem(
      getSeenJoinNotificationStorageKey(signedInUserId),
      JSON.stringify(seenJoinNotificationKeys),
    ).catch(() => undefined);
  }, [
    seenJoinNotificationKeys,
    seenJoinNotificationsHydratedFor,
    signedInUserId,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (!signedInUserId) {
      setSeenSubmissionIds([]);
      setSeenSubmissionsHydratedFor('');
      return () => {
        isMounted = false;
      };
    }

    AsyncStorage.getItem(`${seenSubmissionStorageKeyPrefix}.${signedInUserId}`)
      .then((value) => {
        if (!isMounted) {
          return;
        }

        const parsed = value ? (JSON.parse(value) as unknown) : [];
        setSeenSubmissionIds(
          Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string')
            : [],
        );
        setSeenSubmissionsHydratedFor(signedInUserId);
      })
      .catch(() => {
        if (isMounted) {
          setSeenSubmissionIds([]);
          setSeenSubmissionsHydratedFor(signedInUserId);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [signedInUserId]);

  useEffect(() => {
    if (!signedInUserId || seenSubmissionsHydratedFor !== signedInUserId) {
      return;
    }

    AsyncStorage.setItem(
      `${seenSubmissionStorageKeyPrefix}.${signedInUserId}`,
      JSON.stringify(seenSubmissionIds),
    ).catch(() => undefined);
  }, [seenSubmissionIds, seenSubmissionsHydratedFor, signedInUserId]);

  useEffect(() => {
    let isMounted = true;

    const restoreTeam = async () => {
      if (!authChecked) {
        return;
      }

      if (!isSignedIn) {
        setAvailableTeams([]);
        setCreatedTeam(null);
        setCreatedTasks([]);
        setMyTaskSubmissions([]);
        setAppNotifications([]);
        setPendingJoinRequests([]);
        setSyncStatus('idle');
        return;
      }

      setSyncStatus('loading');
      setSyncError('');

      try {
        const teams = await listMyTeamMemberships();
        const restoredTeams = teams.map(teamRecordToDraft);
        const uniqueTeams = getUniqueTeams(restoredTeams);
        const newestTeam = uniqueTeams[0];

        if (isMounted) {
          setAvailableTeams(uniqueTeams);
          setCreatedTeam(newestTeam ?? null);
        }
      } catch (error) {
        if (isMounted) {
          reportSyncError('Teams sync failed', error);
        }
        // Team reads retry on the next screen open or explicit refresh.
      }

      try {
        const tasks = await listMyTasks();

        if (isMounted) {
          setCreatedTasks(tasks);
        }
      } catch (error) {
        if (isMounted) {
          reportSyncError('Tasks sync failed', error);
        }
        // Task reads will retry when the user creates or views tasks later.
      }

      try {
        const submissions = await listMyTaskSubmissions();

        if (isMounted) {
          setMyTaskSubmissions(submissions);
        }
      } catch (error) {
        if (isMounted) {
          reportSyncError('Submissions sync failed', error);
        }
        // Submission reads retry when the user opens teams or tasks later.
      }

      if (selectedRole === 'crewlead') {
        try {
          const requests = await listPendingJoinRequests();

          if (isMounted) {
            setPendingJoinRequests(requests);
          }
        } catch (error) {
          if (isMounted) {
            reportSyncError('Requests sync failed', error);
          }
          // Request reads only work for a CrewLead owner/admin session.
        }
      }

      if (selectedRole === 'crewmate') {
        try {
          const statuses = await listMyJoinRequestStatuses();

          if (isMounted) {
            setMyJoinRequestStatuses(statuses);
          }
        } catch (error) {
          if (isMounted) {
            reportSyncError('Notifications sync failed', error);
          }
        // Join request status reads retry when CrewMate opens notifications.
        }
      }

      try {
        const notifications = await listMyNotifications();

        if (isMounted) {
          setAppNotifications(notifications);
        }
      } catch (error) {
        if (isMounted) {
          reportSyncError('App notifications sync failed', error);
        }
      }

      if (isMounted) {
        setSyncStatus('idle');
      }
    };

    restoreTeam();

    return () => {
      isMounted = false;
    };
  }, [authChecked, isSignedIn, reportSyncError, selectedRole]);

  const refreshTeamsFromBackend = useCallback(async () => {
    try {
      const teams = await listMyTeamMemberships();
      const uniqueTeams = getUniqueTeams(teams.map(teamRecordToDraft));
      const newestTeam = uniqueTeams[0] ?? null;

      setAvailableTeams(uniqueTeams);
      setCreatedTeam(newestTeam);
    } catch (error) {
      reportSyncError('Teams sync failed', error);
    }
  }, [reportSyncError]);

  const refreshTasksFromBackend = useCallback(async () => {
    try {
      const tasks = await listMyTasks();
      setCreatedTasks(tasks);
    } catch (error) {
      reportSyncError('Tasks sync failed', error);
      // Task reads retry on the next screen open or explicit refresh.
    }
  }, [reportSyncError]);

  const deleteTaskFromBackend = useCallback(async (taskId: string) => {
    let previousTasks: TaskWithTeams[] = [];

    setCreatedTasks((tasks) => {
      previousTasks = tasks;
      return tasks.filter((task) => task.id !== taskId);
    });

    try {
      await archiveTaskRecord(taskId);
      await refreshTasksFromBackend();
    } catch (error) {
      setCreatedTasks(previousTasks);
      Alert.alert(
        'Could not delete task',
        error instanceof Error
          ? error.message
          : 'Please try again in a moment.',
      );
    }
  }, [refreshTasksFromBackend]);

  const refreshMySubmissionsFromBackend = useCallback(async () => {
    try {
      const submissions = await listMyTaskSubmissions();
      setMyTaskSubmissions(submissions);
    } catch (error) {
      reportSyncError('Submissions sync failed', error);
      setMyTaskSubmissions([]);
    }
  }, [reportSyncError]);

  const refreshTeamSubmissions = useCallback(async (teamId?: string) => {
    if (!teamId) {
      return;
    }

    try {
      const submissions = await listTeamTaskSubmissions(teamId);

      setTeamTaskSubmissionsByTeamId((current) => ({
        ...current,
        [teamId]: submissions,
      }));
    } catch (error) {
      reportSyncError('Team submissions sync failed', error);
      setTeamTaskSubmissionsByTeamId((current) => ({
        ...current,
        [teamId]: current[teamId] ?? [],
      }));
    }
  }, [reportSyncError]);

  const refreshVisibleTeamSubmissions = useCallback(async () => {
    const teamIds = visibleTeams
      .map((team) => team.id)
      .filter((teamId): teamId is string => Boolean(teamId));

    if (teamIds.length === 0) {
      return;
    }

    await Promise.all(teamIds.map((teamId) => refreshTeamSubmissions(teamId)));
  }, [refreshTeamSubmissions, visibleTeams]);

  const refreshTeamMembers = useCallback(async (teamId?: string) => {
    if (!teamId) {
      return;
    }

    try {
      const members = await listTeamMembers(teamId);

      setTeamMembersByTeamId((current) => ({
        ...current,
        [teamId]: members,
      }));
    } catch (error) {
      reportSyncError('Members sync failed', error);
      setTeamMembersByTeamId((current) => ({
        ...current,
        [teamId]: current[teamId] ?? [],
      }));
    }
  }, [reportSyncError]);

  const refreshJoinRequests = useCallback(async () => {
    try {
      const requests = await listPendingJoinRequests();
      setPendingJoinRequests(requests);
    } catch (error) {
      reportSyncError('Requests sync failed', error);
      setPendingJoinRequests([]);
    }
  }, [reportSyncError]);

  const refreshMyJoinRequestStatuses = useCallback(async () => {
    try {
      const statuses = await listMyJoinRequestStatuses();
      setMyJoinRequestStatuses(statuses);
    } catch (error) {
      reportSyncError('Notifications sync failed', error);
      setMyJoinRequestStatuses([]);
    }
  }, [reportSyncError]);

  const refreshAppNotifications = useCallback(async () => {
    try {
      const notifications = await listMyNotifications();
      setAppNotifications(notifications);
    } catch (error) {
      reportSyncError('App notifications sync failed', error);
      setAppNotifications([]);
    }
  }, [reportSyncError]);

  const markSubmissionSeen = useCallback((submissionId: string) => {
    setSeenSubmissionIds((current) =>
      current.includes(submissionId) ? current : [...current, submissionId],
    );
  }, []);

  const refreshVisibleData = useCallback(async () => {
    setSyncStatus('loading');
    setSyncError('');

    try {
      if (selectedRole === 'crewlead') {
        await Promise.all([
          refreshTeamsFromBackend(),
          refreshJoinRequests(),
          refreshAppNotifications(),
          refreshTasksFromBackend(),
          refreshTeamSubmissions(visiblePrimaryTeam?.id),
        ]);
        return;
      }

      await Promise.all([
        refreshMyJoinRequestStatuses(),
        refreshAppNotifications(),
        refreshMySubmissionsFromBackend(),
        refreshTeamsFromBackend(),
        refreshTasksFromBackend(),
      ]);
    } finally {
      setSyncStatus('idle');
    }
  }, [
    refreshJoinRequests,
    refreshAppNotifications,
    refreshMyJoinRequestStatuses,
    refreshMySubmissionsFromBackend,
    refreshTasksFromBackend,
    refreshTeamSubmissions,
    refreshTeamsFromBackend,
    selectedRole,
    visiblePrimaryTeam?.id,
  ]);

  useEffect(() => {
    if (screen !== 'home') {
      return;
    }

    refreshVisibleData();
  }, [refreshVisibleData, screen]);

  useEffect(() => {
    if (!authChecked || !isSignedIn || screen !== 'home') {
      return undefined;
    }

    const refreshJoinNotifications = () => {
      if (selectedRole === 'crewlead') {
        void Promise.allSettled([
          refreshJoinRequests(),
          refreshAppNotifications(),
        ]);
        return;
      }

      void Promise.allSettled([
        refreshMyJoinRequestStatuses(),
        refreshAppNotifications(),
      ]);
    };
    const interval = setInterval(refreshJoinNotifications, 8000);
    const appStateSubscription =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              refreshJoinNotifications();
            }
          });
    const handleWindowFocus = () => refreshJoinNotifications();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
    }

    return () => {
      clearInterval(interval);
      appStateSubscription?.remove();

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
      }
    };
  }, [
    authChecked,
    isSignedIn,
    refreshAppNotifications,
    refreshJoinRequests,
    refreshMyJoinRequestStatuses,
    screen,
    selectedRole,
  ]);

  useEffect(() => {
    if (screen !== 'notifications' || myJoinRequestStatuses.length === 0) {
      return;
    }

    setSeenJoinNotificationKeys((current) => {
      const next = new Set(current);
      myJoinRequestStatuses.forEach((notification) => {
        next.add(getJoinNotificationKey(notification));
      });

      return Array.from(next);
    });
  }, [myJoinRequestStatuses, screen]);

  useEffect(() => {
    if (screen !== 'notifications') {
      return;
    }

    const unreadKeys = appNotifications
      .filter((notification) => !notification.read_at)
      .map((notification) => notification.notification_key);

    if (unreadKeys.length === 0) {
      return;
    }

    markNotificationsRead(unreadKeys)
      .then(() => {
        const readAt = new Date().toISOString();
        setAppNotifications((current) =>
          current.map((notification) =>
            unreadKeys.includes(notification.notification_key)
              ? { ...notification, read_at: notification.read_at ?? readAt }
              : notification,
          ),
        );
      })
      .catch((error) => reportSyncError('Notification read sync failed', error));
  }, [appNotifications, reportSyncError, screen]);

  return (
    <View style={{ backgroundColor: palette.paper, flex: 1 }}>
      <SplashImageWarmDeck images={splashImageAssets} />
      {authChecked ? (
        <View
          pointerEvents={screen === 'onboarding' ? 'auto' : 'none'}
          style={{ flex: 1, opacity: screen === 'onboarding' ? 1 : 0 }}
        >
          <CrewPayOnboarding
            initialIndex={onboardingIndex}
            onAlreadyHaveAccount={() => openEmailRegistration('login')}
            onCreateAccount={() => openEmailRegistration('create')}
            onIndexChange={setOnboardingIndex}
          />
        </View>
      ) : (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: palette.paper,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={palette.greenDeep} size="large" />
        </View>
      )}
      {screen === 'email' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 2,
          }}
        >
          <EmailRegistrationFlow
            authError={authError}
            isSubmitting={authSubmitting}
            email={emailAddress}
            mode={authMode}
            onClose={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.history.replaceState({}, '', '/');
              }

              setScreen(isSignedIn ? 'home' : 'onboarding');
            }}
            onSwitchMode={(nextMode) => {
              setAuthMode(nextMode);
              setAuthError('');
              setEmailOtpCode('');
              setEmailStep('entry');
            }}
            onSubmitEmail={submitEmailForCode}
            onSubmitGoogle={submitGoogleAuth}
            onSubmitOtp={submitEmailOtp}
            otpCode={emailOtpCode}
            setEmail={setEmailAddress}
            setOtpCode={setEmailOtpCode}
            setStep={setEmailStep}
            step={emailStep}
          />
        </View>
      ) : null}
      {screen === 'account-intro' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 3,
          }}
        >
          <AccountIntroScreen
            onBack={() => {
              if (accountIntroSource === 'email') {
                setEmailStep('otp');
                setScreen('email');
                return;
              }

              setScreen('onboarding');
            }}
            onSelectRole={selectAccountRole}
          />
        </View>
      ) : null}
      {screen === 'passcode-lock' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 4,
          }}
        >
          <PasscodeUnlockScreen
            error={unlockError}
            onBack={() => openEmailRegistration('login')}
            onDelete={() => {
              setUnlockError('');
              setUnlockCode((value) => value.slice(0, -1));
            }}
            onDigit={(digit) => {
              setUnlockError('');
              setUnlockCode((value) => {
                const nextCode = `${value}${digit}`.slice(0, 4);

                if (nextCode.length === 4) {
                  setTimeout(() => submitUnlockPasscode(nextCode), 120);
                }

                return nextCode;
              });
            }}
            shakeTrigger={unlockShake}
            value={unlockCode}
          />
        </View>
      ) : null}
      {screen === 'setup' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 4,
          }}
        >
          <SetupFlow
            email={emailAddress}
            initialStep={setupStartStep}
            onComplete={() => setScreen('home')}
            onExit={() => setScreen('account-intro')}
            role={selectedRole}
          />
        </View>
      ) : null}
      {screen === 'home' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 5,
          }}
        >
          <HomeScreen
            email={emailAddress}
            hasTeam={visiblePrimaryTeam !== null}
            onBulkTransfer={() => setScreen('bulk-transfer')}
            onLogout={logoutCurrentUser}
            onRetrySync={refreshVisibleData}
            onCreateTeam={() => setScreen('create-team')}
            onCreateTask={() => setScreen('create-task')}
            onJoinTeam={() => setScreen('join-team')}
            onOpenChat={() => setScreen('chat')}
            onOpenPayoutHistory={() => setScreen('payout-history')}
            onOpenNotifications={() => {
              setScreen('notifications');
              refreshAppNotifications();

              if (selectedRole === 'crewmate') {
                refreshMyJoinRequestStatuses();
                refreshTeamsFromBackend();
                refreshTasksFromBackend();
              } else {
                refreshJoinRequests();
              }
            }}
            onOpenRequests={() => {
              if (selectedRole === 'crewmate') {
                setScreen('notifications');
                refreshAppNotifications();
                refreshMyJoinRequestStatuses();
                refreshTeamsFromBackend();
                refreshTasksFromBackend();
                return;
              }

              setScreen('requests');
              refreshJoinRequests();
            }}
            onOpenSubmissions={() => {
              setScreen('submissions');
              refreshTeamsFromBackend();
              refreshTasksFromBackend();

              if (selectedRole === 'crewlead') {
                refreshVisibleTeamSubmissions();
              } else {
                refreshMySubmissionsFromBackend();
              }
            }}
            onSwitchRole={switchAccountRole}
            onViewTask={() => {
              setScreen('view-task');
              refreshTeamsFromBackend();
              refreshTasksFromBackend();
            }}
            onViewTeam={() => {
              setScreen('view-team');
              refreshTeamsFromBackend();
              refreshTasksFromBackend();
              refreshTeamMembers(visiblePrimaryTeam?.id);
              if (selectedRole === 'crewlead') {
                refreshTeamSubmissions(visiblePrimaryTeam?.id);
              } else {
                refreshMySubmissionsFromBackend();
              }
            }}
            pendingRequestCount={
              selectedRole === 'crewmate'
                ? unseenCrewMateNotificationCount + unreadAppNotificationCount
                : pendingJoinRequests.length + unreadAppNotificationCount
            }
            role={selectedRole}
            onEditPayoutInfo={() => setScreen('edit-bank')}
            submissionCount={
              selectedRole === 'crewlead'
                ? Object.values(teamTaskSubmissionsByTeamId).reduce(
                    (total, submissions) => total + submissions.length,
                    0,
                  )
                : myTaskSubmissions.length
            }
            syncError={syncError}
            syncStatus={syncStatus}
            taskCount={visibleTasks.length}
            teamCount={visibleTeams.length}
          />
        </View>
      ) : null}
      {screen === 'edit-bank' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 10,
          }}
        >
          <EditBankScreen
            onBack={() => setScreen('home')}
            onSaved={() => {
              Alert.alert('Saved', 'Your payout info has been updated.');
              setScreen('home');
            }}
          />
        </View>
      ) : null}
      {screen === 'chat' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 6,
          }}
        >
          <ChatScreen
            allowedTeamIds={visibleTeams
              .map((team) => team.id)
              .filter((teamId): teamId is string => Boolean(teamId))}
            onBack={() => setScreen('home')}
          />
        </View>
      ) : null}
      {screen === 'create-task' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 6,
          }}
        >
          {visibleTeams.some((team) => team.id) ? (
            <CreateTaskFlow
              onBack={() => setScreen('home')}
              onComplete={async (task) => {
                try {
                  const record = await createTaskRecord(task);
                  const refreshedTasks = await listMyTasks();

                  setCreatedTasks(
                    refreshedTasks.length > 0
                      ? refreshedTasks
                      : [
                          {
                            ...record,
                            task_team_assignments: task.teamIds.map((teamId) => ({
                              team_id: teamId,
                            })),
                          },
                          ...createdTasks,
                        ],
                  );
                  setScreen('home');
                } catch (error) {
                  Alert.alert(
                    'Could not create task',
                    error instanceof Error
                      ? error.message
                      : 'Please try again in a moment.',
                  );
                }
              }}
              teams={visibleTeams.filter((team) => team.id)}
            />
          ) : (
            <CreateTaskEmptyScreen onBack={() => setScreen('home')} />
          )}
        </View>
      ) : null}
      {screen === 'create-team' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 7,
          }}
        >
          <CreateTeamFlow
            onBack={() => setScreen('home')}
            onComplete={async (team) => {
              try {
                const record = await createTeamRecord(team);
                const savedTeam = teamRecordToDraft(record);

                setCreatedTeam(savedTeam);
                setAvailableTeams((teams) => {
                  const existing = teams.filter(
                    (teamItem) => teamItem.id !== savedTeam.id,
                  );

                  return [savedTeam, ...existing];
                });
                setScreen('home');
              } catch (error) {
                Alert.alert(
                  'Could not create team',
                  error instanceof Error
                    ? error.message
                    : 'Please try again in a moment.',
                );
              }
            }}
          />
        </View>
      ) : null}
      {screen === 'view-task' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 8,
          }}
        >
          <ViewTasksScreen
            onBack={() => setScreen('home')}
            onJoinTeam={() => setScreen('join-team')}
            hasJoinedTeam={
              visibleTeams.length > 0 ||
              (selectedRole === 'crewmate' &&
                myJoinRequestStatuses.some(
                  (request) => request.request_status === 'approved',
                ))
            }
            mySubmissions={myTaskSubmissions}
            onDeleteTask={deleteTaskFromBackend}
            onRefreshMySubmissions={refreshMySubmissionsFromBackend}
            onRefreshTasks={refreshTasksFromBackend}
            onRefreshTeamSubmissions={refreshTeamSubmissions}
            onSubmitTask={(task, teamDraft) => {
              setSubmissionDraft({ task, team: teamDraft });
              setScreen('submit-proof');
            }}
            role={selectedRole}
            teamSubmissionsByTeamId={teamTaskSubmissionsByTeamId}
            tasks={visibleTasks}
            teams={visibleTeams}
          />
        </View>
      ) : null}
      {screen === 'view-team' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 8,
          }}
        >
          <ViewTeamsScreen
            initialTeamId={teamIdToOpen}
            onBack={() => setScreen('home')}
            onJoinTeam={() => setScreen('join-team')}
            onInitialTeamOpened={() => setTeamIdToOpen('')}
            membersByTeamId={teamMembersByTeamId}
            onRefreshMembers={refreshTeamMembers}
            onRefreshMySubmissions={refreshMySubmissionsFromBackend}
            onRefreshTasks={refreshTasksFromBackend}
            onRefreshTeamSubmissions={refreshTeamSubmissions}
            onSubmitTask={(task, teamDraft) => {
              setSubmissionDraft({ task, team: teamDraft });
              setScreen('submit-proof');
            }}
            onTeamUpdated={(team) => {
              setCreatedTeam(team);
              setAvailableTeams((teams) => {
                const existing = teams.filter((teamItem) => teamItem.id !== team.id);

                return [team, ...existing];
              });
            }}
            role={selectedRole}
            mySubmissions={myTaskSubmissions}
            tasks={visibleTasks}
            teamSubmissionsByTeamId={teamTaskSubmissionsByTeamId}
            teams={visibleTeams}
          />
        </View>
      ) : null}
      {screen === 'submit-proof' && submissionDraft ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 9,
          }}
        >
          <SubmitProofScreen
            existingSubmissions={myTaskSubmissions.filter(
              (submission) =>
                submission.task_id === submissionDraft.task.id &&
                submission.team_id === submissionDraft.team.id,
            )}
            onBack={() => setScreen('view-team')}
            onSubmitted={async () => {
              await refreshMySubmissionsFromBackend();
              await refreshTeamSubmissions(submissionDraft.team.id);
              await refreshAppNotifications();
              await refreshTasksFromBackend();
              setScreen('view-team');
            }}
            task={submissionDraft.task}
            team={submissionDraft.team}
          />
        </View>
      ) : null}
      {screen === 'join-team' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 9,
          }}
        >
          <JoinTeamScreen
            onBack={() => {
              setScreen('home');
            }}
            onJoined={async (joinResult) => {
              setSelectedRole('crewmate');
              if (signedInUserId) {
                await persistPreferredRole(signedInUserId, 'crewmate');
              }

              await Promise.allSettled([
                refreshTeamsFromBackend(),
                refreshTasksFromBackend(),
                refreshMyJoinRequestStatuses(),
                refreshMySubmissionsFromBackend(),
              ]);

              if (joinResult.join_status === 'joined') {
                setTeamIdToOpen(joinResult.team_id);
                setScreen('view-team');
                return;
              }

              setScreen('home');
            }}
          />
        </View>
      ) : null}
      {screen === 'bulk-transfer' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 10,
          }}
        >
          <BulkTransferScreen
            teams={visibleTeams}
            onBack={() => setScreen('home')}
          />
        </View>
      ) : null}
      {screen === 'payout-history' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 10,
          }}
        >
          <PayoutHistoryScreen
            onBack={() => setScreen('home')}
          />
        </View>
      ) : null}
      {screen === 'submissions' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 9,
          }}
        >
          <SubmissionsInboxScreen
            mySubmissions={myTaskSubmissions}
            onBack={() => setScreen('home')}
            onJoinTeam={() => setScreen('join-team')}
            onMarkSeen={markSubmissionSeen}
            onRefreshMySubmissions={refreshMySubmissionsFromBackend}
            onRefreshTasks={refreshTasksFromBackend}
            onRefreshTeamSubmissions={refreshTeamSubmissions}
            onSubmitTask={(task, teamDraft) => {
              setSubmissionDraft({ task, team: teamDraft });
              setScreen('submit-proof');
            }}
            role={selectedRole}
            seenSubmissionIds={seenSubmissionIds}
            teamSubmissionsByTeamId={teamTaskSubmissionsByTeamId}
            tasks={visibleTasks}
            teams={visibleTeams}
          />
        </View>
      ) : null}
      {screen === 'requests' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 10,
          }}
        >
          <JoinRequestsScreen
            onApprove={async (requestId) => {
              try {
                await approveJoinRequest(requestId);
                await refreshJoinRequests();
                await refreshAppNotifications();
                await refreshTeamsFromBackend();
                await refreshTasksFromBackend();
              } catch (error) {
                Alert.alert(
                  'Could not approve request',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }
            }}
            onApproveAll={async (requestIds) => {
              try {
                for (const requestId of requestIds) {
                  await approveJoinRequest(requestId);
                }

                await refreshJoinRequests();
                await refreshAppNotifications();
                await refreshTeamsFromBackend();
                await refreshTasksFromBackend();
              } catch (error) {
                Alert.alert(
                  'Could not approve all requests',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }
            }}
            onBack={() => setScreen('home')}
            onReject={async (requestId) => {
              try {
                await rejectJoinRequest(requestId);
                await refreshJoinRequests();
                await refreshAppNotifications();
              } catch (error) {
                Alert.alert(
                  'Could not cancel request',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }
            }}
            onRefresh={refreshJoinRequests}
            requests={pendingJoinRequests}
          />
        </View>
      ) : null}
      {screen === 'notifications' ? (
        <View
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 10,
          }}
        >
          <CrewMateNotificationsScreen
            appNotifications={appNotifications}
            joinNotifications={myJoinRequestStatuses}
            onBack={() => setScreen('home')}
            onRefresh={async () => {
              await refreshAppNotifications();
              if (selectedRole === 'crewmate') {
                await refreshMyJoinRequestStatuses();
                await refreshTeamsFromBackend();
                await refreshTasksFromBackend();
                return;
              }

              await refreshJoinRequests();
            }}
          />
        </View>
      ) : null}
      <PermanentImageCache images={persistentImageAssets} />
    </View>
  );
}

function SplashImageWarmDeck({
  images,
}: {
  images: ImageSourcePropType[];
}) {
  const { width, height } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(288, height * 0.43), 392);
  const imageSize = Math.min(width * 1.18, heroHeight * 1.08);

  return (
    <View
      collapsable={false}
      pointerEvents="none"
      style={{
        bottom: 0,
        left: 0,
        opacity: 0.01,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 30,
      }}
    >
      {images.map((image, index) => (
        <ExpoImage
          cachePolicy="memory-disk"
          contentFit="contain"
          key={`splash-warm-${index}`}
          priority="high"
          source={image}
          transition={0}
          style={{
            backgroundColor: 'transparent',
            height: imageSize,
            left: (width - imageSize) / 2,
            position: 'absolute',
            top: 96,
            width: imageSize,
          }}
        />
      ))}
    </View>
  );
}

function PermanentImageCache({ images }: { images: ImageSourcePropType[] }) {
  useEffect(() => {
    images.forEach((image) => {
      prefetchImageSource(image);
    });
  }, [images]);

  return (
    <View
      collapsable={false}
      pointerEvents="none"
      style={{
        height: 2,
        left: 0,
        opacity: 0.01,
        overflow: 'hidden',
        position: 'absolute',
        top: 0,
        width: 2,
      }}
    >
      {images.map((image, index) => (
        <ExpoImage
          cachePolicy="memory-disk"
          contentFit="contain"
          key={`permanent-cache-${index}`}
          priority="high"
          source={image}
          transition={0}
          style={{ height: 2, width: 2 }}
        />
      ))}
    </View>
  );
}

function CrewPayOnboarding({
  initialIndex,
  onAlreadyHaveAccount,
  onCreateAccount,
  onIndexChange,
}: {
  initialIndex: number;
  onAlreadyHaveAccount: () => void;
  onCreateAccount: () => void;
  onIndexChange: (index: number) => void;
}) {
  const { width, height } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(initialIndex * width)).current;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeIndexRef = useRef(initialIndex);
  const goToRef = useRef<(index: number) => void>(() => undefined);
  const widthRef = useRef(width);

  activeIndexRef.current = activeIndex;
  widthRef.current = width;

  useEffect(() => {
    slides.forEach((slide) => {
      prefetchImageSource(slide.image);
    });
  }, []);

  useEffect(() => {
    scrollX.setValue(activeIndexRef.current * width);
  }, [scrollX, width]);

  const goTo = useCallback(
    (index: number) => {
      const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
      const toValue = nextIndex * widthRef.current;

      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      onIndexChange(nextIndex);

      Animated.timing(scrollX, {
        duration: 560,
        easing: Easing.out(Easing.cubic),
        toValue,
        useNativeDriver: true,
      }).start();
    },
    [onIndexChange, scrollX],
  );

  goToRef.current = goTo;

  const prevInitialIndex = useRef(initialIndex);
  useEffect(() => {
    if (prevInitialIndex.current !== initialIndex) {
      prevInitialIndex.current = initialIndex;
      if (initialIndex === 0) {
        goTo(0);
      }
    }
  }, [initialIndex, goTo]);

  useEffect(() => {
    if (activeIndex !== 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (activeIndexRef.current === 0) {
        goTo(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activeIndex, goTo]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        const horizontalMove = Math.abs(gesture.dx) > 18;
        const intentionalSwipe =
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35;

        return horizontalMove && intentionalSwipe;
      },
      onPanResponderRelease: (_, gesture) => {
        const wantsToGoBack = gesture.dx > widthRef.current * 0.12;

        if (wantsToGoBack && activeIndexRef.current > 0) {
          goToRef.current(activeIndexRef.current - 1);
        }
      },
    }),
  ).current;

  const handleNext = useCallback(() => {
    if (activeIndex < slides.length - 1) {
      goTo(activeIndex + 1);
      return;
    }

    onCreateAccount();
  }, [activeIndex, goTo, onCreateAccount]);
  const trackTranslateX = Animated.multiply(scrollX, -1);

  return (
    <View
      style={{ flex: 1, backgroundColor: palette.paper, overflow: 'hidden' }}
      {...panResponder.panHandlers}
    >
      <StatusBar style="dark" />
      <Animated.View
        style={{
          flex: 1,
          flexDirection: 'row',
          transform: [{ translateX: trackTranslateX }],
          width: width * slides.length,
        }}
      >
        {slides.map((slide, index) => (
          <OnboardingSlide
            activeIndex={activeIndex}
            height={height}
            index={index}
            onAlreadyHaveAccount={onAlreadyHaveAccount}
            onNext={handleNext}
            scrollX={scrollX}
            slide={slide}
            total={slides.length}
            width={width}
            key={slide.title}
          />
        ))}
      </Animated.View>
    </View>
  );
}

type OnboardingSlideProps = {
  activeIndex: number;
  height: number;
  index: number;
  onAlreadyHaveAccount: () => void;
  onNext: () => void;
  scrollX: Animated.Value;
  slide: Slide;
  total: number;
  width: number;
};

function OnboardingSlide({
  activeIndex,
  height,
  index,
  onAlreadyHaveAccount,
  onNext,
  scrollX,
  slide,
  total,
  width,
}: OnboardingSlideProps) {
  const isCompact = height < 760;
  const sidePadding = width < 380 ? 22 : 28;
  const isBrandSlide = !slide.image;
  const titleSize = width < 380 ? 33 : 37;
  const titleLineHeight = Math.round(titleSize * 0.93);
  const heroHeight = Math.min(Math.max(288, height * 0.43), 392);
  const imageSize = Math.min(width * (slide.imageScale ?? 1), heroHeight * 1.02);
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const progressRange = [0, Math.max(1, (total - 1) * width)];
  const progressBarWidth = width - sidePadding * 2;
  const progressScale = scrollX.interpolate({
    inputRange: progressRange,
    outputRange: [1 / total, 1],
    extrapolate: 'clamp',
  });
  const progressTranslateX = scrollX.interpolate({
    inputRange: progressRange,
    outputRange: [-(progressBarWidth * (1 - 1 / total)) / 2, 0],
    extrapolate: 'clamp',
  });
  const imageOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.2, 1, 0.2],
    extrapolate: 'clamp',
  });
  const imageScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.9, 1, 0.9],
    extrapolate: 'clamp',
  });
  const imageTranslateX = scrollX.interpolate({
    inputRange,
    outputRange: [width * 0.16, 0, -width * 0.16],
    extrapolate: 'clamp',
  });
  const copyOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const copyTranslateY = scrollX.interpolate({
    inputRange,
    outputRange: [24, 0, 24],
    extrapolate: 'clamp',
  });
  const ctaOpacity = activeIndex === index ? 1 : 0.58;

  if (isBrandSlide) {
    return (
      <View
        style={{
          width,
          flex: 1,
          backgroundColor: palette.green,
          paddingTop: 42,
        }}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: sidePadding,
            paddingBottom: isCompact ? 16 : 24,
          }}
        >
          <View style={{ height: 54 }} />
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              transform: [{ translateY: -height * 0.035 }],
            }}
          >
            <Text
              selectable
              style={{
                color: palette.ink,
                fontSize: width < 380 ? 48 : 56,
                fontWeight: '900',
                letterSpacing: -3,
                lineHeight: width < 380 ? 52 : 60,
                textAlign: 'center',
              }}
            >
              crewpay
            </Text>
            {slide.body ? (
              <Text
                selectable
                style={{
                  color: palette.greenDeep,
                  fontSize: 15,
                  fontWeight: '700',
                  letterSpacing: -0.2,
                  lineHeight: 20,
                  marginTop: 14,
                  maxWidth: 310,
                  textAlign: 'center',
                }}
              >
                {slide.body}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        width,
        flex: 1,
        backgroundColor: palette.paper,
        paddingTop: 42,
      }}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: sidePadding,
          paddingBottom: isCompact ? 16 : 24,
        }}
      >
        <View
          style={{
            minHeight: 54,
            justifyContent: 'center',
            paddingTop: 6,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
            }}
          >
            <View
              style={{
                backgroundColor: palette.rail,
                borderRadius: 999,
                flex: 1,
                height: 5,
                overflow: 'hidden',
              }}
            >
              <Animated.View
                style={{
                  backgroundColor: palette.greenDeep,
                  borderRadius: 999,
                  height: '100%',
                  transform: [
                    { translateX: progressTranslateX },
                    { scaleX: progressScale },
                  ],
                  width: '100%',
                }}
              />
            </View>
          </View>
        </View>

        <View
          style={{
            alignItems: 'center',
            height: heroHeight,
            justifyContent: 'center',
            overflow: 'visible',
          }}
        >
          <Animated.View
            style={{
              opacity: imageOpacity,
              transform: [
                { translateX: imageTranslateX },
                { scale: imageScale },
                { translateY: slide.imageOffsetY ?? 0 },
              ],
            }}
          >
            <ExpoImage
              cachePolicy="memory-disk"
              contentFit="contain"
              priority="high"
              source={slide.image}
              transition={0}
              style={{
                backgroundColor: 'transparent',
                height: imageSize,
                transform: [{ translateX: slide.imageOffsetX ?? 0 }],
                width: imageSize,
              }}
            />
          </Animated.View>
        </View>

        <Animated.View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'flex-start',
            opacity: copyOpacity,
            paddingTop: isCompact ? 10 : 16,
            transform: [{ translateY: copyTranslateY }],
          }}
        >
          <Text
            selectable
            style={{
              color: palette.greenDeep,
              fontSize: 13,
              fontWeight: '800',
              letterSpacing: 0.3,
              marginBottom: 10,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            {slide.eyebrow}
          </Text>
          <Text
            selectable
            style={{
              color: palette.ink,
              fontSize: titleSize,
              fontWeight: '900',
              letterSpacing: -1.55,
              lineHeight: titleLineHeight,
              maxWidth: width - sidePadding * 2,
              textAlign: 'center',
            }}
          >
            {slide.title}
          </Text>
          <Text
            selectable
            style={{
              color: palette.muted,
              fontSize: 15,
              fontWeight: '600',
              letterSpacing: -0.2,
              lineHeight: 20,
              marginTop: 14,
              maxWidth: Math.min(315, width - sidePadding * 2),
              textAlign: 'center',
            }}
          >
            {slide.body}
          </Text>
        </Animated.View>

        <View style={{ gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={onNext}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: palette.green,
              borderRadius: 999,
              minHeight: 58,
              opacity: ctaOpacity,
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <Text
              selectable
              style={{
                color: palette.ink,
                fontSize: 17,
                fontWeight: '800',
                letterSpacing: -0.35,
              }}
            >
              {slide.cta}
            </Text>
          </Pressable>
          {index === total - 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={onAlreadyHaveAccount}
              style={({ pressed }) => ({
                alignItems: 'center',
                borderRadius: 999,
                minHeight: 48,
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <Text
                selectable
                style={{
                  color: palette.ink,
                  fontSize: 16,
                  fontWeight: '800',
                  letterSpacing: -0.25,
                  textDecorationLine: 'underline',
                }}
              >
                I already have an account
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function EmailRegistrationFlow({
  authError,
  email,
  isSubmitting,
  mode,
  onClose,
  onSwitchMode,
  onSubmitEmail,
  onSubmitGoogle,
  onSubmitOtp,
  otpCode,
  setEmail,
  setOtpCode,
  setStep,
  step,
}: {
  authError: string;
  email: string;
  isSubmitting: boolean;
  mode: AuthMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSubmitEmail: () => void;
  onSubmitGoogle: () => void;
  onSubmitOtp: () => void;
  otpCode: string;
  setEmail: (value: string) => void;
  setOtpCode: (value: string) => void;
  setStep: (step: EmailStep) => void;
  step: EmailStep;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const transition = useRef(new Animated.Value(1)).current;
  const transitionDirection = useRef(1);

  useEffect(() => {
    prefetchImageSource(checkEmailImage);
  }, []);

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [step, transition]);

  const animatedStyle = Platform.OS === 'web' ? {} : {
    opacity: transition,
    transform: [
      {
        translateX: transition.interpolate({
          inputRange: [0, 1],
          outputRange: [transitionDirection.current * 22, 0],
        }),
      },
    ],
  };

  const common = {
    height,
    scale,
    width,
    x,
    y,
    s,
  };

  return (
    <View style={{ backgroundColor: '#ffffff', flex: 1 }}>
      <StatusBar style="dark" />
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {step === 'entry' ? (
          <EmailEntryScreen
            {...common}
            authError={authError}
            isSubmitting={isSubmitting}
            mode={mode}
            onClose={onClose}
            onGoogleAuth={onSubmitGoogle}
            onSwitchMode={onSwitchMode}
          />
        ) : (
          <EmailOtpScreen
            {...common}
            authError={authError}
            email={email}
            isSubmitting={isSubmitting}
            mode={mode}
            onClose={onClose}
            onEditEmail={() => {
              transitionDirection.current = -1;
              setStep('entry');
            }}
            onResend={onSubmitEmail}
            onSubmit={onSubmitOtp}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
          />
        )}
      </Animated.View>
    </View>
  );
}

function EmailEntryScreen({
  authError,
  isSubmitting,
  mode,
  onClose,
  onGoogleAuth,
  onSwitchMode,
  s,
  scale,
  x,
  y,
}: SetupMetrics & {
  authError: string;
  isSubmitting: boolean;
  mode: AuthMode;
  onClose: () => void;
  onGoogleAuth: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}) {
  const isCreate = mode === 'create';

  return (
    <SetupPage paddingBottom={y(42)} paddingTop={y(109)} x={x}>
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        <View style={{ flex: 1 }} />
        <CircleControl icon="close" onPress={onClose} s={s} scale={scale} />
      </View>
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 39),
          fontWeight: '800',
          letterSpacing: -Math.max(0.45, 0.8 * scale),
          lineHeight: s(50),
          marginTop: y(56),
        }}
      >
        {isCreate ? 'Create your CrewPay account' : 'Welcome back to CrewPay'}
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 21),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(31),
          marginTop: y(18),
        }}
      >
        {isCreate
          ? 'Sign up with Google to keep your account secure and ready for CrewPay.'
          : 'Use Google to continue into your existing CrewPay account.'}
      </Text>
      <SocialAuthButton
        disabled={isSubmitting}
        label={isSubmitting ? 'Opening Google' : 'Continue with Google'}
        provider="google"
        onPress={onGoogleAuth}
        s={s}
        style={{ marginTop: y(56) }}
        x={x}
        y={y}
      />
      {authError ? (
        <Text
          selectable
          style={{
            color: '#a33424',
            fontSize: appFontSize(s, 15),
            fontWeight: '600',
            lineHeight: s(21),
            marginTop: y(10),
          }}
        >
          {authError}
        </Text>
      ) : null}
      {isCreate ? (
        <Text
          selectable
          style={{
            color: '#555851',
            fontSize: appFontSize(s, 18),
            fontWeight: '400',
            letterSpacing: -Math.max(0.1, 0.12 * scale),
            lineHeight: s(28),
            marginTop: y(28),
            paddingHorizontal: x(20),
            textAlign: 'center',
          }}
        >
          By registering, you accept our{' '}
          <Text
            style={{
              color: palette.greenDeep,
              fontWeight: '800',
              textDecorationLine: 'underline',
            }}
          >
            Terms of Use
          </Text>{' '}
          and{' '}
          <Text
            style={{
              color: palette.greenDeep,
              fontWeight: '800',
              textDecorationLine: 'underline',
            }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      ) : null}
      <View style={{ flex: 1 }} />
      <Text
        selectable
        style={{
          color: '#8b8e86',
          fontSize: appFontSize(s, 16),
          fontWeight: '500',
          lineHeight: s(23),
          marginBottom: y(22),
          textAlign: 'center',
        }}
      >
        Email code sign-in is paused until CrewPay mail is configured.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => onSwitchMode(isCreate ? 'login' : 'create')}
        style={({ pressed }) => ({
          alignSelf: 'center',
          opacity: pressed ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <Text
          selectable
          style={{
            color: palette.greenDeep,
            fontSize: appFontSize(s, 20),
            fontWeight: '800',
            letterSpacing: -0.25,
          }}
        >
          {isCreate ? 'I already have an account' : 'Create a new account'}
        </Text>
      </Pressable>
    </SetupPage>
  );
}

function AuthDivider({
  s,
  x,
  y,
}: {
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: x(23),
        marginTop: y(39),
      }}
    >
      <View style={{ backgroundColor: '#e8e9e4', flex: 1, height: 1 }} />
      <Text
        selectable
        style={{
          color: '#777a73',
          fontSize: appFontSize(s, 21),
          fontWeight: '700',
        }}
      >
        or
      </Text>
      <View style={{ backgroundColor: '#e8e9e4', flex: 1, height: 1 }} />
    </View>
  );
}

function SocialAuthButton({
  disabled = false,
  label,
  onPress,
  provider,
  s,
  style,
  x,
  y,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  provider: 'apple' | 'google';
  s: (value: number) => number;
  style?: ViewStyle;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const isApple = provider === 'apple';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: isApple ? palette.ink : '#ffffff',
        borderColor: isApple ? palette.ink : '#e5e7e2',
        borderRadius: s(14),
        borderWidth: 1.2,
        flexDirection: 'row',
        height: y(70),
        justifyContent: 'center',
        marginTop: y(18),
        opacity: disabled ? 0.58 : pressed ? 0.76 : 1,
        paddingHorizontal: x(22),
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...style,
      })}
    >
      <View
        pointerEvents="none"
        style={{
          alignItems: 'center',
          height: s(32),
          justifyContent: 'center',
          left: x(25),
          position: 'absolute',
          width: s(32),
        }}
      >
        {isApple ? (
          <AppleLogo color="#ffffff" size={s(26)} />
        ) : (
          <GoogleLogo size={s(27)} />
        )}
      </View>
      <Text
        pointerEvents="none"
        selectable={false}
        style={{
          color: isApple ? '#ffffff' : palette.ink,
          fontSize: appFontSize(s, 22),
          fontWeight: '800',
          letterSpacing: -0.25,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function GoogleLogo({ size }: { size: number }) {
  return (
    <Svg height={size} viewBox="0 0 48 48" width={size}>
      <Path
        d="M44.5 20H24v8.5h11.8C34.7 34 30 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.3l6-6C34.8 4.8 29.7 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.1-2.7-.5-4z"
        fill="#4285F4"
      />
      <Path
        d="M6.1 14.1l7 5.1C15 14.4 19.2 11 24 11c3.3 0 6.3 1.2 8.6 3.3l6-6C34.8 4.8 29.7 3 24 3 16 3 9.1 7.5 6.1 14.1z"
        fill="#EA4335"
      />
      <Path
        d="M24 45c5.6 0 10.4-1.8 14.1-5l-6.7-5.5C29.3 36.1 26.8 37 24 37c-6 0-10.9-4-12.6-9.5l-7.2 5.5C7.3 40.1 14.4 45 24 45z"
        fill="#34A853"
      />
      <Path
        d="M11.4 27.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.2-5.5C2.8 16 2 19.4 2 23s.8 7 2.2 10l7.2-5.5z"
        fill="#FBBC05"
      />
    </Svg>
  );
}

function AppleLogo({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M16.7 13.2c0-2.4 2-3.6 2.1-3.7-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.3-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.3 1.3-2.6 1.3-2.7 0-.1-2.5-1-2.5-3.7zM14.3 6.1c.7-.8 1.1-1.9 1-3.1-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.9-1 3 1.1.1 2.2-.5 2.8-1.3z"
        fill={color}
      />
    </Svg>
  );
}

function EmailOtpScreen({
  authError,
  email,
  onClose,
  onEditEmail,
  onResend,
  onSubmit,
  isSubmitting,
  mode,
  otpCode,
  s,
  scale,
  setOtpCode,
  x,
  y,
}: SetupMetrics & {
  authError: string;
  email: string;
  onClose: () => void;
  onEditEmail: () => void;
  onResend: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  mode: AuthMode;
  otpCode: string;
  setOtpCode: (value: string) => void;
}) {
  const emailLabel = email.trim() || 'your email address';
  const inputRef = useRef<TextInput>(null);
  const [resendSeconds, setResendSeconds] = useState(60);
  const canResend = resendSeconds === 0;
  const canContinue = otpCode.length === 6 && !isSubmitting;

  useEffect(() => {
    setResendSeconds(60);
    const timeout = setTimeout(() => inputRef.current?.focus(), 250);

    return () => clearTimeout(timeout);
  }, [email]);

  useEffect(() => {
    if (resendSeconds === 0) {
      return undefined;
    }

    const timer = setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );

    return () => clearTimeout(timer);
  }, [resendSeconds]);

  return (
    <SetupPage paddingBottom={y(42)} paddingTop={y(109)} x={x}>
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        <CircleControl icon="back" onPress={onEditEmail} s={s} scale={scale} />
        <View style={{ flex: 1 }} />
        <CircleControl icon="close" onPress={onClose} s={s} scale={scale} />
      </View>
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 43),
          fontWeight: '800',
          letterSpacing: -Math.max(0.55, 1 * scale),
          lineHeight: s(54),
          marginTop: y(66),
        }}
      >
        Verify your email
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 22),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(34),
          marginTop: y(22),
        }}
      >
        A 6-digit code has been sent to{' '}
        <Text style={{ color: palette.ink, fontWeight: '700' }}>
          {emailLabel}
        </Text>
        . Enter it below to {mode === 'create' ? 'continue' : 'sign in'}.
      </Text>
      <Text
        selectable
        style={{
          color: '#777a73',
          fontSize: appFontSize(s, 20),
          fontWeight: '800',
          letterSpacing: -Math.max(0.1, 0.18 * scale),
          lineHeight: s(27),
          marginTop: y(53),
        }}
      >
        Verification Code
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => inputRef.current?.focus()}
        style={{
          flexDirection: 'row',
          gap: x(11),
          justifyContent: 'space-between',
          marginTop: y(17),
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => {
          const isActive = index === Math.min(otpCode.length, 5);

          return (
            <View
              key={`email-otp-box-${index}`}
              style={{
                alignItems: 'center',
                backgroundColor: '#f6f7f3',
                borderColor: isActive ? palette.greenDeep : '#eff0eb',
                borderRadius: s(13),
                borderWidth: isActive ? 2.3 : 1.1,
                height: y(64),
                justifyContent: 'center',
                width: x(73),
              }}
            >
              <Text
                selectable
                style={{
                  color: palette.ink,
                  fontSize: appFontSize(s, 25),
                  fontWeight: '800',
                }}
              >
                {otpCode[index] ?? ''}
              </Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(value) =>
          setOtpCode(value.replace(/\D/g, '').slice(0, 6))
        }
        ref={inputRef}
        style={{ height: 1, opacity: 0, width: 1 }}
        value={otpCode}
      />
      {authError ? (
        <Text
          selectable
          style={{
            color: '#a33424',
            fontSize: appFontSize(s, 15),
            fontWeight: '600',
            lineHeight: s(21),
            marginTop: y(13),
          }}
        >
          {authError}
        </Text>
      ) : null}
      <View style={{ marginTop: y(56) }}>
        <PrimaryPillButton
          disabled={!canContinue}
          label={isSubmitting ? 'Checking code' : 'Continue'}
          onPress={onSubmit}
          s={s}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!canResend}
          onPress={() => {
            setResendSeconds(60);
            onResend();
          }}
          style={({ pressed }) => ({
            alignItems: 'center',
            alignSelf: 'center',
            marginTop: y(34),
            justifyContent: 'center',
            opacity: pressed && canResend ? 0.82 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <Text
            selectable
            style={{
              color: canResend ? palette.greenDeep : '#a5a8a1',
              fontSize: appFontSize(s, 20),
              fontWeight: '800',
              letterSpacing: -0.25,
              textDecorationLine: canResend ? 'underline' : 'none',
            }}
          >
            {canResend ? 'Resend code' : `Resend code in ${resendSeconds}s`}
          </Text>
        </Pressable>
      </View>
    </SetupPage>
  );
}

function SetupFlow({
  email,
  initialStep,
  onComplete,
  onExit,
  role,
}: {
  email: string;
  initialStep: SetupStep;
  onComplete: () => void;
  onExit: () => void;
  role: AccountRole;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [step, setStep] = useState<SetupStep>(initialStep);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryOption>(defaultCountry);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [confirmPasswordShake, setConfirmPasswordShake] = useState(0);
  const [smsCode, setSmsCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [confirmPasscodeError, setConfirmPasscodeError] = useState('');
  const [confirmPasscodeShake, setConfirmPasscodeShake] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankQuery, setBankQuery] = useState('');
  const [savingBankAccount, setSavingBankAccount] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const transition = useRef(new Animated.Value(1)).current;
  const transitionDirection = useRef(1);
  const smsInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const goToStep = useCallback(
    (nextStep: SetupStep, direction = 1) => {
      transitionDirection.current = direction;
      setStep(nextStep);
    },
    [],
  );

  const currentSetupSteps =
    role === 'crewmate' ? crewMateSetupSteps : crewLeadSetupSteps;
  const stepIndex = currentSetupSteps.indexOf(step);
  const goNext = useCallback(() => {
    const nextStep = currentSetupSteps[stepIndex + 1];

    if (nextStep) {
      goToStep(nextStep, 1);
    }
  }, [currentSetupSteps, goToStep, stepIndex]);
  const goBack = useCallback(() => {
    const previousStep = currentSetupSteps[stepIndex - 1];

    if (previousStep) {
      if (step === 'confirmPasscode') {
        setPasscode('');
        setConfirmPasscode('');
        setConfirmPasscodeError('');
      }
      goToStep(previousStep, -1);
      return;
    }

    onExit();
  }, [currentSetupSteps, goToStep, onExit, step, stepIndex]);

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [step, transition]);

  useEffect(() => {
    if (step === 'sms') {
      const timeout = setTimeout(() => smsInputRef.current?.focus(), 300);
      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [step]);

  const addPasscodeDigit = useCallback(
    (digit: string) => {
      if (step === 'passcode') {
        const nextValue = `${passcode}${digit}`.slice(0, 4);
        setPasscode(nextValue);

        if (nextValue.length === 4) {
          setTimeout(() => goToStep('confirmPasscode', 1), 180);
        }

        return;
      }

      if (step === 'confirmPasscode') {
        setConfirmPasscodeError('');
        const nextValue = `${confirmPasscode}${digit}`.slice(0, 4);
        setConfirmPasscode(nextValue);

        if (nextValue.length === 4) {
          setTimeout(async () => {
            if (nextValue !== passcode) {
              setConfirmPasscodeError(
                'Passcodes do not match. Please try again.',
              );
              setConfirmPasscodeShake((value) => value + 1);
              setConfirmPasscode('');
              return;
            }

            setConfirmPasscodeError('');
            try {
              const user = await getCurrentUser();

              if (!user) {
                throw new Error('Please sign in again to save your passcode.');
              }

              await saveLocalPasscode(user.id, nextValue);
              goToStep('complete', 1);
            } catch (error) {
              Alert.alert('Could not save passcode', getErrorMessage(error));
              setConfirmPasscode('');
            }
          }, 180);
        }
      }
    },
    [confirmPasscode, goToStep, passcode, step],
  );

  const deletePasscodeDigit = useCallback(() => {
    if (step === 'passcode') {
      setPasscode((value) => value.slice(0, -1));
      return;
    }

    setConfirmPasscode((value) => value.slice(0, -1));
    setConfirmPasscodeError('');
  }, [step]);

  const continueFromPassword = useCallback(() => {
    if (!validatePassword(password)) {
      Alert.alert(
        'Password is too weak',
        'Use at least 9 characters with a letter and a number.',
      );
      return;
    }

    goNext();
  }, [goNext, password]);

  const continueFromConfirmPassword = useCallback(async () => {
    if (password !== confirmedPassword) {
      setConfirmPasswordError('Passwords do not match. Please try again.');
      setConfirmPasswordShake((value) => value + 1);
      return;
    }

    setConfirmPasswordError('');
    setSavingSetup(true);

    try {
      await setAccountPassword(password);
      goNext();
    } catch (error) {
      Alert.alert('Could not save password', getErrorMessage(error));
    } finally {
      setSavingSetup(false);
    }
  }, [confirmedPassword, goNext, password]);

  const getDateOfBirth = useCallback(() => {
    const monthIndex = months.indexOf(birthMonth);
    const day = Number(birthDay);
    const year = Number(birthYear);

    if (
      monthIndex < 0 ||
      !Number.isInteger(day) ||
      !Number.isInteger(year) ||
      day < 1 ||
      day > 31 ||
      year < 1900
    ) {
      return '';
    }

    const date = new Date(Date.UTC(year, monthIndex, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== monthIndex ||
      date.getUTCDate() !== day
    ) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }, [birthDay, birthMonth, birthYear]);

  const continueFromProfile = useCallback(async () => {
    const dateOfBirth = getDateOfBirth();

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      Alert.alert('Add your legal name', 'Enter your first and last name.');
      return;
    }

    if (!dateOfBirth) {
      Alert.alert('Add your date of birth', 'Enter a valid day, month, and year.');
      return;
    }

    setSavingSetup(true);

    try {
      await saveProfileDetails({
        countryCode: selectedCountry.code,
        countryName: selectedCountry.name,
        dateOfBirth,
        email: normalizeEmail(email),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      goNext();
    } catch (error) {
      Alert.alert('Could not save profile', getErrorMessage(error));
    } finally {
      setSavingSetup(false);
    }
  }, [
    email,
    firstName,
    getDateOfBirth,
    goNext,
    lastName,
    role,
    selectedCountry.code,
    selectedCountry.name,
  ]);

  const saveAddressAndContinue = useCallback(async () => {
    if (homeAddress.trim().length < 2 || city.trim().length < 2) {
      Alert.alert('Add your address', 'Enter your home address and city.');
      return;
    }

    setSavingSetup(true);

    try {
      await saveProfileAddress({
        city: city.trim(),
        countryCode: selectedCountry.code,
        countryName: selectedCountry.name,
        homeAddress: homeAddress.trim(),
        postcode: postcode.trim(),
        source: 'manual',
      });

      if (role === 'crewmate') {
        goNext();
        return;
      }

      await markOnboardingComplete();
      onComplete();
    } catch (error) {
      Alert.alert('Could not save address', getErrorMessage(error));
    } finally {
      setSavingSetup(false);
    }
  }, [
    city,
    goNext,
    homeAddress,
    onComplete,
    postcode,
    role,
    selectedCountry.code,
    selectedCountry.name,
  ]);

  const completeCrewMateBankDetails = useCallback(async () => {
    const cleanedAccountNumber = bankAccountNumber.replace(/\D/g, '');

    setSavingBankAccount(true);

    try {
      await saveBankAccount({
        accountName: bankAccountName.trim(),
        accountNumber: cleanedAccountNumber,
        bankCode,
        bankName: bankName.trim(),
      });
      await markOnboardingComplete();
      onComplete();
    } catch (error) {
      Alert.alert(
        'Could not save bank details',
        error instanceof Error ? error.message : 'Please check the details and try again.',
      );
    } finally {
      setSavingBankAccount(false);
    }
  }, [bankAccountName, bankAccountNumber, bankCode, bankName, onComplete]);

  const animatedStyle = Platform.OS === 'web' ? {} : {
    opacity: transition,
    transform: [
      {
        translateX: transition.interpolate({
          inputRange: [0, 1],
          outputRange: [transitionDirection.current * 24, 0],
        }),
      },
    ],
  };

  const common = {
    height,
    scale,
    width,
    x,
    y,
    s,
  };

  const isComplete = step === 'complete';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{
        backgroundColor: isComplete ? '#0d3d05' : '#ffffff',
        flex: 1,
      }}
    >
      <StatusBar style={isComplete ? 'light' : 'dark'} />
      {!isComplete ? <PasscodeSuccessImageWarmMount {...common} /> : null}
      <Animated.View style={[{ flex: 1, zIndex: 1 }, animatedStyle]}>
        {step === 'country' ? (
          <CountryStep
            {...common}
            country={selectedCountry}
            onBack={goBack}
            onContinue={goNext}
            onOpenCountryPicker={() => setCountryPickerOpen(true)}
          />
        ) : null}
        {step === 'phone' ? (
          <PhoneStep
            {...common}
            country={selectedCountry}
            onBack={goBack}
            onContinue={goNext}
            onOpenCountryPicker={() => setCountryPickerOpen(true)}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
          />
        ) : null}
        {step === 'password' ? (
          <PasswordStep
            {...common}
            label="Choose a password"
            onBack={goBack}
            onContinue={continueFromPassword}
            password={password}
            setPassword={setPassword}
            title="Create your password"
          />
        ) : null}
        {step === 'confirmPassword' ? (
          <PasswordStep
            {...common}
            label="Confirm password"
            errorText={confirmPasswordError}
            onBack={goBack}
            onContinue={continueFromConfirmPassword}
            password={confirmedPassword}
            setPassword={(value) => {
              setConfirmPasswordError('');
              setConfirmedPassword(value);
            }}
            shakeTrigger={confirmPasswordShake}
            title={savingSetup ? 'Saving your password' : 'Confirm your password'}
          />
        ) : null}
        {step === 'sms' ? (
          <SmsStep
            {...common}
            code={smsCode}
            inputRef={smsInputRef}
            onClose={goBack}
            onContinue={goNext}
            phoneNumber={phoneNumber}
            setCode={setSmsCode}
          />
        ) : null}
        {step === 'passcode' ? (
          <PasscodeStep
            {...common}
            mode="set"
            onClose={goBack}
            onDelete={deletePasscodeDigit}
            onDigit={addPasscodeDigit}
            value={passcode}
          />
        ) : null}
        {step === 'confirmPasscode' ? (
          <PasscodeStep
            {...common}
            errorText={confirmPasscodeError}
            mode="confirm"
            onClose={goBack}
            onDelete={deletePasscodeDigit}
            onDigit={addPasscodeDigit}
            shakeTrigger={confirmPasscodeShake}
            value={confirmPasscode}
          />
        ) : null}
        {step === 'complete' ? (
          <PasscodeCompleteStep {...common} onClose={goNext} />
        ) : null}
        {step === 'profile' ? (
          <ProfileDetailsStep
            {...common}
            birthDay={birthDay}
            birthMonth={birthMonth}
            birthYear={birthYear}
            country={selectedCountry}
            firstName={firstName}
            lastName={lastName}
            onClose={onExit}
            onContinue={continueFromProfile}
            onOpenCountryPicker={() => setCountryPickerOpen(true)}
            onOpenMonthPicker={() => setMonthPickerOpen(true)}
            setBirthDay={setBirthDay}
            setBirthYear={setBirthYear}
            setFirstName={setFirstName}
            setLastName={setLastName}
          />
        ) : null}
        {step === 'address' ? (
          <ConfirmAddressStep
            {...common}
            city={city}
            homeAddress={homeAddress}
            onBack={goBack}
            onContinue={saveAddressAndContinue}
            postcode={postcode}
            setCity={setCity}
            setHomeAddress={setHomeAddress}
            setPostcode={setPostcode}
            title="Enter your address"
          />
        ) : null}
        {step === 'bankDetails' ? (
          <BankDetailsStep
            {...common}
            accountName={bankAccountName}
            accountNumber={bankAccountNumber}
            bankCode={bankCode}
            bankName={bankName}
            bankQuery={bankQuery}
            isSaving={savingBankAccount}
            onBack={goBack}
            onContinue={completeCrewMateBankDetails}
            setAccountName={setBankAccountName}
            setAccountNumber={setBankAccountNumber}
            setBankQuery={setBankQuery}
            setSelectedBank={(bank) => {
              setBankName(bank.name);
              setBankCode(bank.code);
              setBankQuery(bank.name);
            }}
          />
        ) : null}
      </Animated.View>
      <CountryPickerModal
        countries={countries}
        onClose={() => setCountryPickerOpen(false)}
        onSelect={(country) => {
          setSelectedCountry(country);
          setCountryPickerOpen(false);
        }}
        selectedCountry={selectedCountry}
        visible={countryPickerOpen}
      />
      <MonthPickerModal
        months={months}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={(month) => {
          setBirthMonth(month);
          setMonthPickerOpen(false);
        }}
        selectedMonth={birthMonth}
        visible={monthPickerOpen}
      />
    </KeyboardAvoidingView>
  );
}

type SetupMetrics = {
  height: number;
  s: (value: number) => number;
  scale: number;
  width: number;
  x: (value: number) => number;
  y: (value: number) => number;
};

function CountryStep({
  country,
  onBack,
  onContinue,
  onOpenCountryPicker,
  s,
  scale,
  x,
  y,
}: SetupMetrics & {
  country: CountryOption;
  onBack: () => void;
  onContinue: () => void;
  onOpenCountryPicker: () => void;
}) {
  return (
    <SetupPage paddingBottom={y(42)} paddingTop={y(109)} x={x}>
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 45),
          fontWeight: '800',
          letterSpacing: -Math.max(0.6, 1.1 * scale),
          lineHeight: s(58),
          marginTop: y(65),
        }}
      >
        Where do you live most of the time?
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 25),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(38),
          marginTop: y(23),
        }}
      >
        By law, we may need to ask for proof of your address.
      </Text>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 21),
          fontWeight: '800',
          letterSpacing: -Math.max(0.1, 0.2 * scale),
          lineHeight: s(28),
          marginTop: y(43),
        }}
      >
        Country or region
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenCountryPicker}
        style={({ pressed }) => ({
          alignItems: 'center',
          borderColor: '#878883',
          borderRadius: s(13),
          borderWidth: 1.35,
          flexDirection: 'row',
          height: y(72),
          marginTop: y(8),
          paddingHorizontal: x(25),
          transform: [{ scale: pressed ? 0.993 : 1 }],
        })}
      >
        <Text style={{ fontSize: appFontSize(s, 31), marginRight: x(17) }}>
          {country.flag}
        </Text>
        <Text
          selectable
          style={{
            color: palette.ink,
            flex: 1,
            fontSize: appFontSize(s, 26),
            fontWeight: '400',
            letterSpacing: -Math.max(0.1, 0.3 * scale),
          }}
        >
          {country.name}
        </Text>
        <ChevronDownIcon scale={scale} />
      </Pressable>
      <View style={{ flex: 1 }} />
      <PrimaryPillButton label="Continue" onPress={onContinue} s={s} />
    </SetupPage>
  );
}

function ProfileDetailsStep({
  birthDay,
  birthMonth,
  birthYear,
  country,
  firstName,
  lastName,
  onClose,
  onContinue,
  onOpenCountryPicker,
  onOpenMonthPicker,
  s,
  scale,
  setBirthDay,
  setBirthYear,
  setFirstName,
  setLastName,
  x,
  y,
}: SetupMetrics & {
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  country: CountryOption;
  firstName: string;
  lastName: string;
  onClose: () => void;
  onContinue: () => void;
  onOpenCountryPicker: () => void;
  onOpenMonthPicker: () => void;
  setBirthDay: (value: string) => void;
  setBirthYear: (value: string) => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
}) {
  return (
    <SetupPage paddingBottom={y(42)} paddingTop={y(109)} x={x}>
      <CircleControl icon="close" onPress={onClose} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 39),
          fontWeight: '800',
          letterSpacing: -Math.max(0.45, 0.85 * scale),
          lineHeight: s(49),
          marginTop: y(39),
        }}
      >
        Tell us about yourself
      </Text>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 18),
          fontWeight: '800',
          letterSpacing: -Math.max(0.1, 0.16 * scale),
          lineHeight: s(25),
          marginTop: y(26),
        }}
      >
        Country of residence
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenCountryPicker}
        style={({ pressed }) => ({
          alignItems: 'center',
          borderColor: '#a3a49f',
          borderRadius: s(10),
          borderWidth: 1.25,
          flexDirection: 'row',
          height: y(61),
          marginTop: y(8),
          paddingHorizontal: x(20),
          transform: [{ scale: pressed ? 0.992 : 1 }],
        })}
      >
        <Text
          selectable
          style={{
            color: palette.ink,
            flex: 1,
            fontSize: appFontSize(s, 21),
            fontWeight: '400',
            letterSpacing: -Math.max(0.1, 0.2 * scale),
          }}
        >
          {country.name}
        </Text>
        <ChevronDownIcon scale={scale} />
      </Pressable>
      <WiseTextInput
        label="Full legal first and middle name(s)"
        onChangeText={setFirstName}
        s={s}
        scale={scale}
        value={firstName}
        x={x}
        y={y}
      />
      <WiseTextInput
        label="Full legal last name(s)"
        onChangeText={setLastName}
        s={s}
        scale={scale}
        value={lastName}
        x={x}
        y={y}
      />
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 18),
          fontWeight: '800',
          letterSpacing: -Math.max(0.1, 0.16 * scale),
          lineHeight: s(25),
          marginTop: y(23),
        }}
      >
        Date of birth
      </Text>
      <View
        style={{
          flexDirection: 'row',
          gap: x(14),
        }}
      >
        <DateTextInput
          label="Day"
          maxLength={2}
          onChangeText={setBirthDay}
          s={s}
          scale={scale}
          value={birthDay}
          width={x(118)}
          y={y}
        />
        <DatePickerButton
          label="Month"
          onPress={onOpenMonthPicker}
          placeholder="Select"
          s={s}
          scale={scale}
          value={birthMonth}
          width={x(262)}
          y={y}
        />
        <DateTextInput
          label="Year"
          maxLength={4}
          onChangeText={setBirthYear}
          s={s}
          scale={scale}
          value={birthYear}
          width={x(120)}
          y={y}
        />
      </View>
      <View style={{ flex: 1 }} />
      <PrimaryPillButton label="Continue" onPress={onContinue} s={s} />
    </SetupPage>
  );
}

function ConfirmAddressStep({
  city,
  homeAddress,
  onBack,
  onContinue,
  postcode,
  s,
  scale,
  setCity,
  setHomeAddress,
  setPostcode,
  title = 'Confirm your address',
  x,
  y,
}: SetupMetrics & {
  city: string;
  homeAddress: string;
  onBack: () => void;
  onContinue: () => void;
  postcode: string;
  setCity: (value: string) => void;
  setHomeAddress: (value: string) => void;
  setPostcode: (value: string) => void;
  title?: string;
}) {
  return (
    <SetupPage paddingBottom={y(42)} paddingTop={y(109)} x={x}>
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 39),
          fontWeight: '800',
          letterSpacing: -Math.max(0.45, 0.85 * scale),
          lineHeight: s(49),
          marginTop: y(39),
        }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 22),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(31),
          marginTop: y(8),
        }}
      >
        You may need to provide proof of this.
      </Text>
      <WiseTextInput
        label="Home address"
        onChangeText={setHomeAddress}
        s={s}
        scale={scale}
        value={homeAddress}
        x={x}
        y={y}
      />
      <WiseTextInput
        label="City"
        onChangeText={setCity}
        s={s}
        scale={scale}
        value={city}
        x={x}
        y={y}
      />
      <WiseTextInput
        keyboardType="number-pad"
        label="Postcode"
        onChangeText={setPostcode}
        s={s}
        scale={scale}
        value={postcode}
        x={x}
        y={y}
      />
      <View style={{ flex: 1 }} />
      <PrimaryPillButton
        label="Continue"
        onPress={onContinue}
        s={s}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => ({
          alignSelf: 'center',
          marginTop: y(31),
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text
          selectable
          style={{
            color: palette.greenDeep,
            fontSize: appFontSize(s, 18),
            fontWeight: '800',
            textDecorationLine: 'underline',
          }}
        >
          Go back
        </Text>
      </Pressable>
    </SetupPage>
  );
}

function BankDetailsStep({
  accountName,
  accountNumber,
  bankCode,
  bankName,
  bankQuery,
  isSaving,
  onBack,
  onContinue,
  s,
  scale,
  setAccountName,
  setAccountNumber,
  setBankQuery,
  setSelectedBank,
  x,
  y,
}: SetupMetrics & {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  bankQuery: string;
  isSaving: boolean;
  onBack: () => void;
  onContinue: () => void;
  setAccountName: (value: string) => void;
  setAccountNumber: (value: string) => void;
  setBankQuery: (value: string) => void;
  setSelectedBank: (bank: NigerianBank) => void;
}) {
  const [bankFieldFocused, setBankFieldFocused] = useState(false);
  const [accountNumberFocused, setAccountNumberFocused] = useState(false);
  const [accountNameFocused, setAccountNameFocused] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const bankBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedBankQuery = bankQuery.trim().toLowerCase();
  const bankMatches = useMemo(() => {
    if (!normalizedBankQuery) {
      return nigerianBanks.slice(0, 7);
    }

    return nigerianBanks
      .filter((bank) =>
        bank.name.toLowerCase().includes(normalizedBankQuery),
      )
      .slice(0, 7);
  }, [normalizedBankQuery]);
  const cleanAccountNumber = accountNumber.replace(/\D/g, '').slice(0, 10);
  const canContinue =
    Boolean(bankCode) &&
    cleanAccountNumber.length === 10 &&
    accountName.trim().length >= 2;
  const buttonEnabled = canContinue && !isSaving;
  const bankScrollRef = useRef<ScrollView | null>(null);
  const scrollToFormPosition = useCallback(
    (offset: number) => {
      if (Platform.OS === 'web') {
        return;
      }

      setTimeout(() => {
        bankScrollRef.current?.scrollTo({
          animated: true,
          y: Math.max(0, y(offset)),
        });
      }, 120);
    },
    [y],
  );
  const clearBankBlurTimer = useCallback(() => {
    if (bankBlurTimerRef.current) {
      clearTimeout(bankBlurTimerRef.current);
      bankBlurTimerRef.current = null;
    }
  }, []);
  const closeBankPickerAfterTap = useCallback(() => {
    clearBankBlurTimer();
    bankBlurTimerRef.current = setTimeout(() => {
      setBankFieldFocused(false);
      bankBlurTimerRef.current = null;
    }, 140);
  }, [clearBankBlurTimer]);
  const chooseBank = useCallback(
    (bank: NigerianBank) => {
      clearBankBlurTimer();
      setSelectedBank(bank);
      setBankFieldFocused(false);
      Keyboard.dismiss();
    },
    [clearBankBlurTimer, setSelectedBank],
  );

  useEffect(() => clearBankBlurTimer, [clearBankBlurTimer]);

  useEffect(() => {
    const cleanNum = accountNumber.replace(/\D/g, '').slice(0, 10);

    if (cleanNum.length !== 10 || !bankCode) {
      setVerifyError('');
      return;
    }

    setVerifying(true);
    setVerifyError('');

    const controller = new AbortController();

    const baseUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';

    fetch(
      `${baseUrl}/api/verify-bank?account_number=${encodeURIComponent(
        cleanNum,
      )}&bank_code=${encodeURIComponent(bankCode)}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error('Could not verify account');
        }

        return res.json();
      })
      .then((data: { account_name?: string }) => {
        if (data?.account_name) {
          setAccountName(data.account_name);
          setVerifyError('');
        } else {
          setVerifyError('Account not found — please check your details.');
        }
      })
      .catch((err: Error) => {
        if (err?.name !== 'AbortError') {
          setVerifyError(
            'Could not auto-verify. You can enter the account name manually.',
          );
        }
      })
      .finally(() => {
        setVerifying(false);
      });

    return () => controller.abort();
  }, [accountNumber, bankCode, setAccountName]);

  const pageContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <ScrollView
          ref={bankScrollRef}
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'web' ? y(54) : y(230),
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
            <View style={{ width: s(58) }} />
          </View>

          <Text
            selectable
            style={{
              color: '#090a08',
              fontSize: appFontSize(s, 31),
              fontWeight: '900',
              letterSpacing: -0.75,
              lineHeight: s(38),
              marginTop: y(28),
            }}
          >
            Where should we send your money?
          </Text>
          <Text
            selectable
            style={{
              color: '#5d625a',
              fontSize: appFontSize(s, 19),
              fontWeight: '400',
              lineHeight: s(28),
              marginTop: y(10),
            }}
          >
            CrewLead admins will use this payout account when an approved task
            is ready to be paid.
          </Text>

          <BankPreviewCard
            accountName={accountName}
            accountNumber={cleanAccountNumber}
            bankName={bankName}
            s={s}
            x={x}
            y={y}
          />

          <View style={{ marginTop: y(30) }}>
            <Text
              selectable
              style={{
                color: palette.ink,
                fontSize: appFontSize(s, 18),
                fontWeight: '800',
                lineHeight: s(25),
              }}
            >
              Bank name
            </Text>
            <TextInput
              onBlur={closeBankPickerAfterTap}
              onChangeText={(value) => {
                setBankQuery(value);

                if (value !== bankName) {
                  setSelectedBank({ code: '', name: value });
                }
              }}
              onFocus={() => {
                clearBankBlurTimer();
                setBankFieldFocused(true);
                scrollToFormPosition(315);
              }}
              placeholder="Search Nigerian banks"
              placeholderTextColor="#aeb1a8"
              autoCapitalize="words"
              autoCorrect={false}
              style={{
                borderColor:
                  bankFieldFocused || bankQuery ? palette.greenDeep : '#a3a49f',
                borderRadius: s(14),
                borderWidth: bankFieldFocused || bankQuery ? 2.2 : 1.25,
                color: palette.ink,
                fontSize: appFontSize(s, 19),
                fontWeight: '400',
                height: y(62),
                marginTop: y(8),
                minWidth: 0,
                paddingHorizontal: x(18),
              }}
              value={bankQuery}
            />
            {(bankFieldFocused || bankQuery.length > 0) && bankMatches.length > 0 ? (
              <View
                style={{
                  backgroundColor: '#fbfcf8',
                  borderColor: '#eceee7',
                  borderRadius: s(20),
                  borderWidth: 1,
                  marginTop: y(10),
                  overflow: 'hidden',
                }}
              >
                {bankMatches.map((bank) => (
                  <Pressable
                    accessibilityRole="button"
                    key={bank.code}
                    onPressIn={() => chooseBank(bank)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor:
                        bank.code === bankCode ? '#f1fce9' : '#fbfcf8',
                      borderBottomColor: '#edf0e8',
                      borderBottomWidth: 1,
                      flexDirection: 'row',
                      minHeight: y(55),
                      opacity: pressed ? 0.68 : 1,
                      paddingHorizontal: x(16),
                    })}
                  >
                    <Text
                      selectable
                      style={{
                        color: '#11130f',
                        flex: 1,
                        fontSize: appFontSize(s, 16),
                        fontWeight: bank.code === bankCode ? '900' : '600',
                        lineHeight: s(22),
                      }}
                    >
                      {bank.name}
                    </Text>
                    <Text
                      selectable
                      style={{
                        color: '#8c9188',
                        fontSize: appFontSize(s, 12),
                        fontWeight: '800',
                      }}
                    >
                      {bank.code}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <BankPayoutInput
            focused={accountNumberFocused}
            keyboardType="number-pad"
            label="Bank account number"
            onBlur={() => setAccountNumberFocused(false)}
            onChangeText={(value) =>
              setAccountNumber(value.replace(/\D/g, '').slice(0, 10))
            }
            onFocus={() => {
              setAccountNumberFocused(true);
              scrollToFormPosition(470);
            }}
            placeholder="0123456789"
            s={s}
            value={cleanAccountNumber}
            x={x}
            y={y}
          />
          <BankPayoutInput
            focused={accountNameFocused}
            label="Account name"
            onBlur={() => setAccountNameFocused(false)}
            onChangeText={setAccountName}
            onFocus={() => {
              setAccountNameFocused(true);
              scrollToFormPosition(565);
            }}
            placeholder="Name on bank account"
            s={s}
            value={accountName}
            x={x}
            y={y}
          />
          {verifying ? (
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: x(8),
                marginTop: y(10),
              }}
            >
              <ActivityIndicator color={palette.greenDeep} size="small" />
              <Text
                selectable
                style={{
                  color: palette.greenDeep,
                  fontSize: appFontSize(s, 13),
                  fontWeight: '600',
                }}
              >
                Verifying account…
              </Text>
            </View>
          ) : verifyError ? (
            <Text
              selectable
              style={{
                color: '#c0392b',
                fontSize: appFontSize(s, 13),
                fontWeight: '500',
                lineHeight: s(20),
                marginTop: y(10),
              }}
            >
              {verifyError}
            </Text>
          ) : accountName.trim().length >= 2 && bankCode ? (
            <Text
              selectable
              style={{
                color: palette.greenDeep,
                fontSize: appFontSize(s, 13),
                fontWeight: '700',
                lineHeight: s(20),
                marginTop: y(10),
              }}
            >
              ✓ Account verified
            </Text>
          ) : (
            <Text
              selectable
              style={{
                color: '#8c9188',
                fontSize: appFontSize(s, 13),
                fontWeight: '500',
                lineHeight: s(20),
                marginTop: y(10),
              }}
            >
              Enter a 10-digit account number with a bank selected to
              auto-verify.
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={!buttonEnabled}
            onPress={onContinue}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: buttonEnabled ? palette.green : '#dce5d6',
              borderRadius: 999,
              height: s(66),
              justifyContent: 'center',
              marginTop: y(26),
              opacity: pressed && buttonEnabled ? 0.82 : 1,
              transform: [{ scale: pressed && buttonEnabled ? 0.985 : 1 }],
            })}
          >
            <Text
              selectable
              style={{
                color: buttonEnabled ? palette.ink : '#8d9488',
                fontSize: appFontSize(s, 20),
                fontWeight: '900',
                letterSpacing: -0.2,
              }}
            >
              {isSaving ? 'Saving payout account' : 'Continue'}
            </Text>
          </Pressable>
        </ScrollView>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === 'web') {
    return pageContent;
  }

  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      {pageContent}
    </TouchableWithoutFeedback>
  );
}

function BankPreviewCard({
  accountName,
  accountNumber,
  bankName,
  s,
  x,
  y,
}: {
  accountName: string;
  accountNumber: string;
  bankName: string;
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const displayBank = bankName.trim() || 'BANK NAME';
  const displayName = accountName.trim() || 'CARDHOLDER NAME';

  return (
    <View
      style={{
        backgroundColor: '#111111',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: s(18),
        borderWidth: 1,
        boxShadow: '0 22px 35px rgba(0,0,0,0.22)',
        height: x(315),
        marginTop: y(28),
        overflow: 'hidden',
        paddingHorizontal: x(33),
        paddingVertical: x(25),
      }}
    >
      <BankCardPattern s={s} x={x} y={y} />
      <Text
        selectable
        numberOfLines={1}
        style={{
          color: '#f5f5f5',
          fontSize: appFontSize(s, 20),
          fontWeight: '900',
          letterSpacing: -0.25,
          maxWidth: x(285),
          position: 'absolute',
          right: x(31),
          textAlign: 'right',
          textTransform: 'uppercase',
          top: x(30),
        }}
      >
        {displayBank}
      </Text>

      <CardChip s={s} x={x} y={y} />

      <Text
        selectable
        style={{
          color: '#f0f0f0',
          fontSize: appFontSize(s, 21),
          fontWeight: '500',
          letterSpacing: 1.7,
          lineHeight: s(28),
          left: x(33),
          position: 'absolute',
          textShadowColor: 'rgba(255,255,255,0.24)',
          textShadowOffset: { height: 1, width: 0 },
          textShadowRadius: 1,
          top: x(160),
        }}
      >
        {formatBankAccountNumber(accountNumber)}
      </Text>

      <View
        style={{
          left: x(250),
          position: 'absolute',
          top: x(199),
        }}
      >
        <Text
          selectable
          style={{
            color: 'rgba(255,255,255,0.74)',
            fontSize: appFontSize(s, 8),
            fontWeight: '800',
            letterSpacing: 0.2,
            lineHeight: s(10),
            textTransform: 'uppercase',
          }}
        >
          Month/Year
        </Text>
        <Text
          selectable
          style={{
            color: 'rgba(255,255,255,0.74)',
            fontSize: appFontSize(s, 10),
            fontWeight: '700',
            lineHeight: s(12),
          }}
        >
          EXP  00-00
        </Text>
      </View>

      <Text
        selectable
        numberOfLines={1}
        style={{
          bottom: x(28),
          color: 'rgba(255,255,255,0.82)',
          fontSize: appFontSize(s, 16),
          fontWeight: '800',
          left: x(33),
          letterSpacing: -0.1,
          maxWidth: x(310),
          position: 'absolute',
          textTransform: 'uppercase',
        }}
      >
        {displayName}
      </Text>

      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#e9e9e9',
          borderColor: '#bdbdbd',
          borderRadius: s(6),
          borderWidth: 1,
          bottom: x(21),
          height: x(45),
          justifyContent: 'center',
          position: 'absolute',
          right: x(31),
          width: x(84),
        }}
      >
        <Text
          selectable
          style={{
            color: palette.greenDeep,
            fontSize: appFontSize(s, 14),
            fontWeight: '900',
            letterSpacing: -0.15,
            textTransform: 'lowercase',
          }}
        >
          crewpay
        </Text>
      </View>
    </View>
  );
}

function BankCardPattern({
  s,
  x,
  y,
}: {
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        bottom: 0,
        left: 0,
        opacity: 0.62,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 30,
      }}
    >
      {Array.from({ length: 48 }).map((_, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;

        return (
          <View
            key={`bank-card-cell-${index}`}
            style={{
              height: x(52),
              left: x(-26 + col * 72 + (row % 2 === 0 ? 0 : 36)),
              position: 'absolute',
              top: x(-22 + row * 43),
              width: x(72),
            }}
          >
            <View
              style={{
                backgroundColor: '#282828',
                borderRadius: 999,
                height: Math.max(2, s(4)),
                left: x(6),
                position: 'absolute',
                top: y(18),
                transform: [{ rotate: '31deg' }],
                width: x(62),
              }}
            />
            <View
              style={{
                backgroundColor: '#2f2f2f',
                borderRadius: 999,
                height: Math.max(2, s(4)),
                left: x(8),
                position: 'absolute',
                top: y(30),
                transform: [{ rotate: '-31deg' }],
                width: x(62),
              }}
            />
            <View
              style={{
                backgroundColor: '#202020',
                borderRadius: 999,
                height: Math.max(2, s(4)),
                left: x(5),
                position: 'absolute',
                top: y(42),
                transform: [{ rotate: '31deg' }],
                width: x(54),
              }}
            />
          </View>
        );
      })}
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
    </View>
  );
}

function CardChip({
  s,
  x,
  y,
}: {
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: '#d39b3d',
        borderColor: '#a66d23',
        borderRadius: s(6),
        borderWidth: 1,
        height: x(48),
        left: x(33),
        overflow: 'hidden',
        position: 'absolute',
        top: x(103),
        width: x(59),
      }}
    >
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.22)',
          height: y(1),
          left: 0,
          position: 'absolute',
          right: 0,
          top: '50%',
        }}
      />
      <View
        style={{
          backgroundColor: 'rgba(0,0,0,0.24)',
          bottom: 0,
          left: '50%',
          position: 'absolute',
          top: 0,
          width: x(1),
        }}
      />
      <View
        style={{
          borderColor: 'rgba(0,0,0,0.26)',
          borderRadius: s(5),
          borderWidth: 1,
          bottom: y(8),
          left: x(8),
          position: 'absolute',
          right: x(8),
          top: y(8),
        }}
      />
    </View>
  );
}

function BankPayoutInput({
  focused,
  keyboardType = 'default',
  label,
  onBlur,
  onChangeText,
  onFocus,
  placeholder,
  s,
  value,
  x,
  y,
}: {
  focused: boolean;
  keyboardType?: 'default' | 'number-pad';
  label: string;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  placeholder: string;
  s: (value: number) => number;
  value: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const active = focused || value.length > 0;

  return (
    <View style={{ marginTop: y(24) }}>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 18),
          fontWeight: '800',
          lineHeight: s(25),
        }}
      >
        {label}
      </Text>
      <TextInput
        autoCapitalize={keyboardType === 'number-pad' ? 'none' : 'words'}
        autoCorrect={false}
        keyboardType={keyboardType}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor="#aeb1a8"
        style={{
          borderColor: active ? palette.greenDeep : '#a3a49f',
          borderRadius: s(14),
          borderWidth: active ? 2.2 : 1.25,
          color: palette.ink,
          fontSize: appFontSize(s, 19),
          fontWeight: '400',
          height: y(62),
          marginTop: y(8),
          minWidth: 0,
          paddingHorizontal: x(18),
        }}
        value={value}
      />
    </View>
  );
}

function formatBankAccountNumber(value: string) {
  const digits = value.padEnd(10, '0').slice(0, 10);

  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
}

function PhoneStep({
  country,
  onBack,
  onContinue,
  onOpenCountryPicker,
  phoneNumber,
  s,
  scale,
  setPhoneNumber,
  x,
  y,
}: SetupMetrics & {
  country: CountryOption;
  onBack: () => void;
  onContinue: () => void;
  onOpenCountryPicker: () => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
}) {
  return (
    <SetupPage paddingBottom={y(42)} paddingTop={y(109)} x={x}>
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: palette.green,
            borderRadius: 999,
            height: y(48),
            justifyContent: 'center',
            paddingHorizontal: x(23),
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text
            selectable
            style={{
              color: palette.greenDeep,
              fontSize: appFontSize(s, 21),
              fontWeight: '800',
              letterSpacing: -Math.max(0.1, 0.2 * scale),
            }}
          >
            Help
          </Text>
        </Pressable>
      </View>
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 44),
          fontWeight: '800',
          letterSpacing: -Math.max(0.6, 1.05 * scale),
          lineHeight: s(55),
          marginTop: y(63),
        }}
      >
        Verify your phone number with a code
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 25),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(37),
          marginTop: y(24),
        }}
      >
        We'll send you a code - it helps us keep your account secure.
      </Text>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 21),
          fontWeight: '800',
          letterSpacing: -Math.max(0.1, 0.2 * scale),
          lineHeight: s(28),
          marginTop: y(42),
        }}
      >
        Your phone number
      </Text>
      <View
        style={{
          flexDirection: 'row',
          gap: x(19),
          marginTop: y(10),
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onOpenCountryPicker}
          style={({ pressed }) => ({
            alignItems: 'center',
            borderColor: '#878883',
            borderRadius: s(13),
            borderWidth: 1.35,
            flexDirection: 'row',
            height: y(70),
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.99 : 1 }],
            width: x(132),
          })}
        >
          <Text
            selectable
            style={{
              color: palette.ink,
              fontSize: appFontSize(s, 25),
              fontWeight: '400',
              marginRight: x(15),
            }}
          >
            {country.dialCode}
          </Text>
          <ChevronDownIcon scale={scale} />
        </Pressable>
        <TextInput
          keyboardType="phone-pad"
          onChangeText={setPhoneNumber}
          style={{
            borderColor: phoneNumber ? palette.greenDeep : '#878883',
            borderRadius: s(13),
            borderWidth: phoneNumber ? 2.4 : 1.35,
            color: palette.ink,
            flex: 1,
            fontSize: appFontSize(s, 25),
            fontWeight: '400',
            height: y(70),
            paddingHorizontal: x(22),
          }}
          value={phoneNumber}
        />
      </View>
      <View style={{ flex: 1 }} />
      <PrimaryPillButton label="Send code" onPress={onContinue} s={s} />
    </SetupPage>
  );
}

function PasswordStep({
  errorText = '',
  label,
  onBack,
  onContinue,
  password,
  s,
  scale,
  setPassword,
  shakeTrigger = 0,
  title,
  x,
  y,
}: SetupMetrics & {
  errorText?: string;
  label: string;
  onBack: () => void;
  onContinue: () => void;
  password: string;
  setPassword: (value: string) => void;
  shakeTrigger?: number;
  title: string;
}) {
  const hasPassword = password.length > 0;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const eyePulse = useRef(new Animated.Value(0)).current;
  const inputShake = useRef(new Animated.Value(0)).current;
  const hasError = errorText.length > 0;

  useEffect(() => {
    if (shakeTrigger <= 0) {
      return;
    }

    Vibration.vibrate(35);
    inputShake.stopAnimation();
    inputShake.setValue(0);
    Animated.sequence([
      Animated.timing(inputShake, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
        toValue: -8,
        useNativeDriver: true,
      }),
      Animated.timing(inputShake, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
        toValue: 8,
        useNativeDriver: true,
      }),
      Animated.timing(inputShake, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
        toValue: -6,
        useNativeDriver: true,
      }),
      Animated.timing(inputShake, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
        toValue: 6,
        useNativeDriver: true,
      }),
      Animated.spring(inputShake, {
        damping: 11,
        mass: 0.45,
        stiffness: 260,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [inputShake, shakeTrigger]);

  const togglePasswordVisibility = useCallback(() => {
    setPasswordVisible((visible) => !visible);
    eyePulse.setValue(0);
    Animated.sequence([
      Animated.timing(eyePulse, {
        duration: 90,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(eyePulse, {
        damping: 9,
        mass: 0.55,
        stiffness: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [eyePulse]);

  return (
    <SetupPage paddingBottom={y(42)} paddingTop={y(109)} x={x}>
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 45),
          fontWeight: '800',
          letterSpacing: -Math.max(0.6, 1.1 * scale),
          lineHeight: s(58),
          marginTop: y(65),
        }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 21),
          fontWeight: '800',
          letterSpacing: -Math.max(0.1, 0.2 * scale),
          lineHeight: s(28),
          marginTop: y(33),
        }}
      >
        {label}
      </Text>
      <Animated.View
        style={{
          alignItems: 'center',
          backgroundColor: hasError ? '#fff8f6' : '#ffffff',
          borderColor: hasError ? '#bd2f20' : palette.greenDeep,
          borderRadius: s(13),
          borderWidth: 2.8,
          flexDirection: 'row',
          height: y(72),
          marginTop: y(9),
          paddingHorizontal: x(20),
          transform: [{ translateX: inputShake }],
        }}
      >
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor="#8f928a"
          secureTextEntry={!passwordVisible}
          spellCheck={false}
          style={{
            color: palette.ink,
            flex: 1,
            fontSize: appFontSize(s, 24),
            fontWeight: '400',
            height: '100%',
            minWidth: 0,
            padding: 0,
          }}
          textContentType="password"
          value={password}
        />
        <Pressable
          accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          accessibilityRole="button"
          onPress={togglePasswordVisibility}
          style={({ pressed }) => ({
            alignItems: 'center',
            height: '100%',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.94 : 1 }],
            width: x(50),
          })}
        >
          <EyeIcon pulse={eyePulse} scale={scale} visible={passwordVisible} />
        </Pressable>
      </Animated.View>
      {hasError ? (
        <Text
          selectable
          style={{
            color: '#bd2f20',
            fontSize: appFontSize(s, 16),
            fontWeight: '700',
            lineHeight: s(23),
            marginTop: y(10),
          }}
        >
          {errorText}
        </Text>
      ) : null}
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 22),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(31),
          marginTop: y(12),
        }}
      >
        {hasPassword ? (
          <>
            At least{' '}
            <Text style={{ color: palette.ink, fontWeight: '800' }}>
              9 characters
            </Text>
            , containing{' '}
            <Text style={{ color: palette.ink, fontWeight: '800' }}>
              a letter and a number
            </Text>
          </>
        ) : (
          "That's your password sorted."
        )}
      </Text>
      <View style={{ flex: 1 }} />
      <PrimaryPillButton label="Done" onPress={onContinue} s={s} />
    </SetupPage>
  );
}

function SmsStep({
  code,
  inputRef,
  onClose,
  onContinue,
  phoneNumber,
  s,
  scale,
  setCode,
  x,
  y,
}: SetupMetrics & {
  code: string;
  inputRef: RefObject<TextInput | null>;
  onClose: () => void;
  onContinue: () => void;
  phoneNumber: string;
  setCode: (value: string) => void;
}) {
  return (
    <SetupPage paddingBottom={y(42)} paddingTop={y(109)} x={x}>
      <CircleControl icon="close" onPress={onClose} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 43),
          fontWeight: '800',
          letterSpacing: -Math.max(0.6, 1.05 * scale),
          lineHeight: s(55),
          marginTop: y(65),
        }}
      >
        We just sent you an SMS
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 25),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(37),
          marginTop: y(22),
        }}
      >
        Enter the security code we sent to {formatSmsRecipient(phoneNumber)}.
      </Text>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={{
          flexDirection: 'row',
          gap: x(13),
          justifyContent: 'space-between',
          marginTop: y(34),
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => {
          const isActive = index === Math.min(code.length, 5);
          return (
            <View
              key={`sms-code-box-${index}`}
              style={{
                alignItems: 'center',
                borderColor: isActive ? palette.greenDeep : '#777874',
                borderRadius: s(12),
                borderWidth: isActive ? 2.6 : 1.3,
                height: y(70),
                justifyContent: 'center',
                width: x(80),
              }}
            >
              <Text
                selectable
                style={{
                  color: '#555851',
                  fontSize: appFontSize(s, 26),
                  fontWeight: '400',
                }}
              >
                {code[index] ?? ''}
              </Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        ref={inputRef}
        style={{ height: 1, opacity: 0, width: 1 }}
        value={code}
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignSelf: 'center',
          marginTop: y(42),
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text
          selectable
          style={{
            color: palette.greenDeep,
            fontSize: appFontSize(s, 23),
            fontWeight: '800',
            letterSpacing: -Math.max(0.1, 0.2 * scale),
            textDecorationLine: 'underline',
          }}
        >
          Try another way.
        </Text>
      </Pressable>
      <View style={{ flex: 1 }} />
      <PrimaryPillButton label="Done" onPress={onContinue} s={s} />
    </SetupPage>
  );
}

function formatSmsRecipient(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');

  if (!digits) {
    return 'your phone number';
  }

  if (digits.length <= 4) {
    return digits;
  }

  return `${'*'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

function PasscodeStep({
  errorText = '',
  mode,
  onClose,
  onDelete,
  onDigit,
  s,
  scale,
  shakeTrigger = 0,
  value,
  x,
  y,
}: SetupMetrics & {
  errorText?: string;
  mode: 'set' | 'confirm';
  onClose: () => void;
  onDelete: () => void;
  onDigit: (digit: string) => void;
  shakeTrigger?: number;
  value: string;
}) {
  const isConfirm = mode === 'confirm';
  const dotShake = useRef(new Animated.Value(0)).current;
  const hasError = errorText.length > 0;

  useEffect(() => {
    if (shakeTrigger <= 0) {
      return;
    }

    Vibration.vibrate(35);
    dotShake.stopAnimation();
    dotShake.setValue(0);
    Animated.sequence([
      Animated.timing(dotShake, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
        toValue: -8,
        useNativeDriver: true,
      }),
      Animated.timing(dotShake, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
        toValue: 8,
        useNativeDriver: true,
      }),
      Animated.timing(dotShake, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
        toValue: -6,
        useNativeDriver: true,
      }),
      Animated.timing(dotShake, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
        toValue: 6,
        useNativeDriver: true,
      }),
      Animated.spring(dotShake, {
        damping: 11,
        mass: 0.45,
        stiffness: 260,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dotShake, shakeTrigger]);

  return (
    <SetupPage paddingBottom={y(34)} paddingTop={y(109)} x={x}>
      <CircleControl
        icon={isConfirm ? 'back' : 'close'}
        onPress={onClose}
        s={s}
        scale={scale}
      />
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 45),
          fontWeight: '800',
          letterSpacing: -Math.max(0.6, 1.1 * scale),
          lineHeight: s(58),
          marginTop: y(65),
        }}
      >
        {isConfirm ? 'Confirm Passcode' : 'Set Passcode'}
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 25),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(37),
          marginTop: y(20),
        }}
      >
        For unlocking this app when you haven't used it for 5 minutes.
      </Text>
      {isConfirm ? (
        <Text
          selectable
          style={{
            color: '#555851',
            fontSize: appFontSize(s, 25),
            fontWeight: '400',
            letterSpacing: -Math.max(0.1, 0.15 * scale),
            lineHeight: s(37),
            marginTop: y(21),
          }}
        >
          Re-enter your passcode.
        </Text>
      ) : null}
      <PasscodeDots
        count={value.length}
        error={hasError}
        marginTop={isConfirm ? y(80) : y(98)}
        s={s}
        scale={scale}
        shake={dotShake}
      />
      {hasError ? (
        <Text
          selectable
          style={{
            color: '#a33424',
            fontSize: appFontSize(s, 16),
            fontWeight: '700',
            lineHeight: s(22),
            marginTop: y(18),
            textAlign: 'center',
          }}
        >
          {errorText}
        </Text>
      ) : null}
      <PasscodeKeypad
        onDelete={onDelete}
        onDigit={onDigit}
        s={s}
        scale={scale}
        x={x}
        y={y}
      />
    </SetupPage>
  );
}

function PasscodeUnlockScreen({
  error,
  onBack,
  onDelete,
  onDigit,
  shakeTrigger = 0,
  value,
}: {
  error: string;
  onBack: () => void;
  onDelete: () => void;
  onDigit: (digit: string) => void;
  shakeTrigger?: number;
  value: string;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (input: number) => Math.round(input * widthScale);
  const y = (input: number) => Math.round(input * heightScale);
  const s = (input: number) => Math.round(input * scale);
  const dotShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shakeTrigger <= 0) {
      return;
    }

    Vibration.vibrate(35);
    dotShake.stopAnimation();
    dotShake.setValue(0);
    Animated.sequence([
      Animated.timing(dotShake, { duration: 45, easing: Easing.out(Easing.cubic), toValue: -8, useNativeDriver: true }),
      Animated.timing(dotShake, { duration: 45, easing: Easing.out(Easing.cubic), toValue: 8, useNativeDriver: true }),
      Animated.timing(dotShake, { duration: 45, easing: Easing.out(Easing.cubic), toValue: -6, useNativeDriver: true }),
      Animated.timing(dotShake, { duration: 45, easing: Easing.out(Easing.cubic), toValue: 6, useNativeDriver: true }),
      Animated.spring(dotShake, { damping: 11, mass: 0.45, stiffness: 260, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [dotShake, shakeTrigger]);

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingBottom: y(34),
        paddingHorizontal: x(25),
        paddingTop: y(109),
      }}
    >
      <StatusBar style="dark" />
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 45),
          fontWeight: '800',
          letterSpacing: -Math.max(0.6, 1.1 * scale),
          lineHeight: s(58),
          marginTop: y(65),
        }}
      >
        Enter your passcode
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 25),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(37),
          marginTop: y(20),
        }}
      >
        Unlock CrewPay to continue where you left off.
      </Text>
      <PasscodeDots
        count={value.length}
        error={error.length > 0}
        marginTop={y(error ? 66 : 88)}
        s={s}
        scale={scale}
        shake={dotShake}
      />
      {error ? (
        <Text
          selectable
          style={{
            color: '#a33424',
            fontSize: appFontSize(s, 16),
            fontWeight: '700',
            lineHeight: s(22),
            marginTop: y(18),
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
      ) : null}
      <PasscodeKeypad
        onDelete={onDelete}
        onDigit={onDigit}
        s={s}
        scale={scale}
        x={x}
        y={y}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => ({
          alignSelf: 'center',
          marginTop: y(24),
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text
          selectable
          style={{
            color: palette.greenDeep,
            fontSize: appFontSize(s, 18),
            fontWeight: '800',
            textDecorationLine: 'underline',
          }}
        >
          Use email instead
        </Text>
      </Pressable>
    </View>
  );
}

function PasscodeSuccessImageWarmMount({
  width,
  x,
  y,
}: SetupMetrics) {
  const imageWidth = x(395);

  return (
    <View
      collapsable={false}
      pointerEvents="none"
      style={{
        bottom: 0,
        left: 0,
        opacity: 0.01,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 0,
      }}
    >
      <ExpoImage
        cachePolicy="memory-disk"
        contentFit="contain"
        priority="high"
        source={passcodeSecuredImage}
        transition={0}
        style={{
          backgroundColor: 'transparent',
          height: y(265),
          left: (width - imageWidth) / 2,
          position: 'absolute',
          top: y(288),
          width: imageWidth,
        }}
      />
    </View>
  );
}

function PasscodeCompleteStep({
  onClose,
  s,
  scale,
  x,
  y,
}: SetupMetrics & { onClose: () => void }) {
  return (
    <View
      style={{
        backgroundColor: '#0d3d05',
        flex: 1,
        paddingBottom: y(42),
        paddingHorizontal: x(25),
        paddingTop: y(288),
      }}
    >
      <ExpoImage
        cachePolicy="memory-disk"
        contentFit="contain"
        priority="high"
        source={passcodeSecuredImage}
        transition={0}
        style={{
          alignSelf: 'center',
          backgroundColor: 'transparent',
          height: y(265),
          width: x(395),
        }}
      />
      <Text
        selectable
        style={{
          color: palette.green,
          fontSize: appFontSize(s, 55),
          fontWeight: '900',
          letterSpacing: -Math.max(0.7, 1.3 * scale),
          lineHeight: s(62),
          marginTop: y(46),
          textAlign: 'center',
        }}
      >
        PASSCODE SET
      </Text>
      <Text
        selectable
        style={{
          color: '#d5ead0',
          fontSize: appFontSize(s, 25),
          fontWeight: '400',
          letterSpacing: -Math.max(0.1, 0.15 * scale),
          lineHeight: s(37),
          marginTop: y(30),
          paddingHorizontal: x(20),
          textAlign: 'center',
        }}
      >
        Use your passcode the next time you need to unlock this app.
      </Text>
      <View style={{ flex: 1 }} />
      <PrimaryPillButton label="Close" onPress={onClose} s={s} />
    </View>
  );
}

function PendingInvitePrompt({
  invite,
  onCancel,
  onJoin,
}: {
  invite: PendingInvite;
  onCancel: () => void;
  onJoin: () => Promise<Awaited<ReturnType<typeof joinTeamWithInvite>>>;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof joinTeamWithInvite>
  > | null>(null);
  const displayName = invite.teamName?.trim() || result?.team_name || 'CrewPay team';

  const submitJoin = useCallback(async () => {
    if (result) {
      onCancel();
      return;
    }

    setJoining(true);
    setErrorMessage('');

    try {
      const joinResult = await onJoin();
      setResult(joinResult);
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setJoining(false);
    }
  }, [onCancel, onJoin, result]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <View
        style={{
        backgroundColor: 'transparent',
        bottom: 0,
        flex: 1,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
      }}
    >
      <BlurView
        pointerEvents="none"
        intensity={34}
        tint="light"
        style={{
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: 'rgba(255,255,255,0.24)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="auto"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#edf0e8',
          borderRadius: s(34),
          borderWidth: 1,
          bottom: Math.max(y(72), 84),
          elevation: 90,
          left: x(24),
          paddingHorizontal: x(24),
          paddingVertical: y(24),
          position: 'absolute',
          right: x(24),
          shadowColor: '#11130f',
          shadowOffset: { height: 22, width: 0 },
          shadowOpacity: 0.14,
          shadowRadius: 34,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: x(14),
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.green,
              borderRadius: 999,
              height: s(58),
              justifyContent: 'center',
              width: s(58),
            }}
          >
            <Users color="#11130f" size={s(25)} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              selectable
              style={{
                color: '#9ba096',
                fontSize: appFontSize(s, 13),
                fontWeight: '800',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              Team invite
            </Text>
            <Text
              selectable
              numberOfLines={1}
              style={{
                color: '#050505',
                fontSize: appFontSize(s, 25),
                fontWeight: '900',
                letterSpacing: -0.6,
                lineHeight: s(31),
                marginTop: y(2),
              }}
            >
              {displayName}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close team invite"
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => ({
              alignItems: 'center',
              height: s(40),
              justifyContent: 'center',
              opacity: pressed ? 0.58 : 1,
              width: s(40),
            })}
          >
            <X color="#8c9188" size={s(24)} strokeWidth={2.4} />
          </Pressable>
        </View>

        <Text
          selectable
          style={{
            color: '#666a62',
            fontSize: appFontSize(s, 16),
            fontWeight: '500',
            lineHeight: s(24),
            marginTop: y(18),
          }}
        >
          {result
            ? result.join_status === 'joined'
              ? 'You are now in this team. Tasks assigned to it will show in your CrewMate workspace.'
              : 'Your request has been sent. The CrewLead admin needs to approve you before tasks appear.'
            : 'Join this team as a CrewMate. If approval is required, the CrewLead will review your request first.'}
        </Text>

        {errorMessage ? (
          <Text
            selectable
            style={{
              color: '#b3322a',
              fontSize: appFontSize(s, 14),
              fontWeight: '700',
              lineHeight: s(21),
              marginTop: y(14),
            }}
          >
            {errorMessage}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: x(10), marginTop: y(22) }}>
          {!result ? (
            <Pressable
              accessibilityLabel="Cancel team invite"
              accessibilityRole="button"
              disabled={joining}
              onPress={onCancel}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: '#f0f1eb',
                borderRadius: 999,
                flex: 1,
                height: s(58),
                justifyContent: 'center',
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <Text
                style={{
                  color: '#11130f',
                  fontSize: appFontSize(s, 16),
                  fontWeight: '900',
                  letterSpacing: -0.15,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={result ? 'Go to CrewPay home' : 'Join team'}
            accessibilityRole="button"
            disabled={joining}
            onPress={submitJoin}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: palette.green,
              borderRadius: 999,
              flex: 1,
              height: s(58),
              justifyContent: 'center',
              opacity: pressed && !joining ? 0.76 : 1,
              transform: [{ scale: pressed && !joining ? 0.985 : 1 }],
            })}
          >
            <Text
              style={{
                color: '#11130f',
                fontSize: appFontSize(s, 16),
                fontWeight: '900',
                letterSpacing: -0.15,
              }}
            >
              {result ? 'Go home' : joining ? 'Joining' : 'Join team'}
            </Text>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
  );
}

function JoinTeamSkeleton() {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const pulse = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.82,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.42,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const block = (
    blockWidth: number | `${number}%`,
    blockHeight: number,
    radius = 12,
  ) => (
    <Animated.View
      style={{
        backgroundColor: '#e9ede5',
        borderRadius: s(radius),
        height: y(blockHeight),
        opacity: pulse,
        width: blockWidth,
      }}
    />
  );

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      {block(s(58), 58, 999)}
      <View style={{ gap: y(13), marginTop: y(62) }}>
        {block('68%', 42, 10)}
        {block('88%', 23, 8)}
      </View>
      <View style={{ gap: y(10), marginTop: y(54) }}>
        {block('26%', 20, 7)}
        {block('100%', 64, 15)}
        {block('52%', 22, 8)}
      </View>
      <View style={{ gap: y(10), marginTop: y(34) }}>
        {block('35%', 20, 7)}
        {block('100%', 98, 15)}
      </View>
      <View style={{ marginTop: y(42) }}>{block('100%', 66, 999)}</View>
    </View>
  );
}

function JoinTeamScreen({
  initialInviteValue,
  initialTeamName,
  onBack,
  onJoined,
}: {
  initialInviteValue?: string;
  initialTeamName?: string;
  onBack: () => void;
  onJoined: (
    result: Awaited<ReturnType<typeof joinTeamWithInvite>>,
  ) => void | Promise<void>;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [inviteValue, setInviteValue] = useState(initialInviteValue ?? '');
  const [message, setMessage] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(Boolean(initialInviteValue));
  const [joinResult, setJoinResult] = useState<Awaited<
    ReturnType<typeof joinTeamWithInvite>
  > | null>(null);
  const inviteToken = extractInviteToken(inviteValue);
  const canJoin = inviteToken.length >= 8 && !isJoining;

  useEffect(() => {
    if (initialInviteValue) {
      setInviteValue(initialInviteValue);
      setJoinResult(null);
      setErrorMessage('');
      setShowSkeleton(true);

      const timer = setTimeout(() => setShowSkeleton(false), 560);
      return () => clearTimeout(timer);
    }

    setShowSkeleton(false);
  }, [initialInviteValue]);

  const submitInvite = useCallback(async () => {
    if (!canJoin) {
      return;
    }

    Keyboard.dismiss();
    setErrorMessage('');
    setIsJoining(true);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Joining took too long. Please try again.')),
          20000,
        );
      });
      const result = await Promise.race([
        joinTeamWithInvite(inviteToken, message.trim() || undefined),
        timeout,
      ]);

      setJoinResult(result);
      await onJoined(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Please check the invite code and try again.';

      setErrorMessage(
        /invite link is invalid or expired/i.test(message)
          ? 'Invite code is invalid or expired. Ask your CrewLead for a new code.'
          : message,
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsJoining(false);
    }
  }, [canJoin, inviteToken, message, onJoined]);

  if (showSkeleton) {
    return <JoinTeamSkeleton />;
  }

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={{ paddingBottom: y(48) }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />

          <Text
            selectable
            style={{
              color: '#090a08',
              fontSize: appFontSize(s, 43),
              fontWeight: '900',
              letterSpacing: -1.2,
              lineHeight: s(50),
              marginTop: y(62),
            }}
          >
            Join a team
          </Text>
          <Text
            selectable
            style={{
              color: '#5d625a',
              fontSize: appFontSize(s, 20),
              fontWeight: '400',
              lineHeight: s(29),
              marginTop: y(12),
            }}
          >
            Paste the invite code or the complete invite message your CrewLead
            sent you. CrewPay will find the code automatically.
          </Text>

          <View style={{ marginTop: y(42) }}>
            <Text
              selectable
              style={{
                color: palette.ink,
                fontSize: appFontSize(s, 18),
                fontWeight: '800',
                lineHeight: s(25),
              }}
            >
              Invite code
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => {
                setInviteValue(value);
                setErrorMessage('');
                setJoinResult(null);
              }}
              placeholder="Enter invite code"
              placeholderTextColor="#aeb1a8"
              style={{
                borderColor: inviteValue ? palette.greenDeep : '#a3a49f',
                borderRadius: s(15),
                borderWidth: inviteValue ? 2.2 : 1.25,
                color: palette.ink,
                fontSize: Math.max(appFontSize(s, 18), 16),
                fontWeight: '500',
                height: y(64),
                marginTop: y(9),
                paddingHorizontal: x(18),
              }}
              value={inviteValue}
            />
            {initialTeamName?.trim() ? (
              <Text
                selectable
                style={{
                  color: palette.greenDeep,
                  fontSize: appFontSize(s, 17),
                  fontWeight: '900',
                  letterSpacing: -0.18,
                  lineHeight: s(24),
                  marginTop: y(11),
                }}
              >
                {initialTeamName.trim()}
              </Text>
            ) : null}
          </View>

          <View style={{ marginTop: y(24) }}>
            <Text
              selectable
              style={{
                color: palette.ink,
                fontSize: appFontSize(s, 18),
                fontWeight: '800',
                lineHeight: s(25),
              }}
            >
              Note for the admin
            </Text>
            <TextInput
              multiline
              onChangeText={setMessage}
              placeholder="Optional message"
              placeholderTextColor="#aeb1a8"
              style={{
                borderColor: '#a3a49f',
                borderRadius: s(15),
                borderWidth: 1.25,
                color: palette.ink,
                fontSize: Math.max(appFontSize(s, 17), 16),
                fontWeight: '400',
                lineHeight: s(23),
                marginTop: y(9),
                minHeight: y(98),
                paddingHorizontal: x(18),
                paddingTop: y(15),
                textAlignVertical: 'top',
              }}
              value={message}
            />
          </View>

          {inviteToken ? (
            <View
              style={{
                backgroundColor: '#f5f8f0',
                borderRadius: s(18),
                marginTop: y(18),
                paddingHorizontal: x(18),
                paddingVertical: y(14),
              }}
            >
              <Text
                selectable
                style={{
                  color: '#5f6659',
                  fontSize: appFontSize(s, 13),
                  fontWeight: '700',
                  lineHeight: s(18),
                }}
              >
                Invite token
              </Text>
              <Text
                selectable
                numberOfLines={1}
                style={{
                  color: palette.ink,
                  fontSize: appFontSize(s, 15),
                  fontWeight: '800',
                  lineHeight: s(22),
                  marginTop: y(2),
                }}
              >
                {inviteToken}
              </Text>
            </View>
          ) : null}

          {joinResult ? (
            <View
              style={{
                backgroundColor:
                  joinResult.join_status === 'joined' ? '#edffe3' : '#fff7df',
                borderRadius: s(24),
                marginTop: y(26),
                paddingHorizontal: x(22),
                paddingVertical: y(20),
              }}
            >
              <Text
                selectable
                style={{
                  color: palette.ink,
                  fontSize: appFontSize(s, 21),
                  fontWeight: '900',
                  letterSpacing: -0.25,
                  lineHeight: s(28),
                }}
              >
                {joinResult.join_status === 'joined'
                  ? `You joined ${joinResult.team_name}`
                  : `Request sent to ${joinResult.team_name}`}
              </Text>
              <Text
                selectable
                style={{
                  color: '#5f6659',
                  fontSize: appFontSize(s, 16),
                  fontWeight: '500',
                  lineHeight: s(23),
                  marginTop: y(7),
                }}
              >
                {joinResult.join_status === 'joined'
                  ? 'This team will now appear in your CrewPay teams.'
                  : 'The CrewLead admin needs to approve you before tasks appear.'}
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <Text
              selectable
              style={{
                color: '#b3322a',
                fontSize: appFontSize(s, 15),
                fontWeight: '700',
                lineHeight: s(22),
                marginTop: y(18),
              }}
            >
              {errorMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!joinResult && !canJoin}
            onPress={submitInvite}
            style={({ pressed }) => {
              const enabled = Boolean(joinResult) || canJoin;

              return {
                alignItems: 'center',
                backgroundColor: enabled ? palette.green : '#dce5d6',
                borderRadius: 999,
                height: s(66),
                justifyContent: 'center',
                marginTop: y(34),
                opacity: pressed && enabled ? 0.82 : 1,
                transform: [{ scale: pressed && enabled ? 0.985 : 1 }],
              };
            }}
          >
            <Text
              selectable
              style={{
                color: joinResult || canJoin ? palette.ink : '#8d9488',
                fontSize: appFontSize(s, 20),
                fontWeight: '900',
                letterSpacing: -0.2,
              }}
            >
              {joinResult
                ? 'Go home'
                : isJoining
                  ? 'Joining team'
                  : 'Join team'}
            </Text>
          </Pressable>
        </ScrollView>
    </View>
  );
}

function JoinRequestsScreen({
  onApprove,
  onApproveAll,
  onBack,
  onRefresh,
  onReject,
  requests,
}: {
  onApprove: (requestId: string) => Promise<void>;
  onApproveAll: (requestIds: string[]) => Promise<void>;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  requests: TeamJoinRequest[];
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestIds = useMemo(
    () => requests.map((request) => request.request_id),
    [requests],
  );

  const handleAction = useCallback(
    async (requestId: string, action: 'approve' | 'reject') => {
      setBusyRequestId(requestId);

      try {
        if (action === 'approve') {
          await onApprove(requestId);
        } else {
          await onReject(requestId);
        }
      } finally {
        setBusyRequestId(null);
      }
    },
    [onApprove, onReject],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const approveAll = useCallback(async () => {
    if (requestIds.length === 0) {
      return;
    }

    setApprovingAll(true);

    try {
      await onApproveAll(requestIds);
    } finally {
      setApprovingAll(false);
    }
  }, [onApproveAll, requestIds]);

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
        <Pressable
          accessibilityRole="button"
          onPress={refresh}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: '#f4f5f1',
            borderRadius: 999,
            height: s(48),
            justifyContent: 'center',
            opacity: pressed ? 0.65 : 1,
            paddingHorizontal: x(18),
          })}
        >
          <Text
            selectable
            style={{
              color: palette.greenDeep,
              fontSize: appFontSize(s, 15),
              fontWeight: '900',
              letterSpacing: -0.15,
            }}
          >
            {refreshing ? 'Refreshing' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 44),
          fontWeight: '900',
          letterSpacing: -1.25,
          lineHeight: s(50),
          marginTop: y(54),
        }}
      >
        Requests
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 20),
          fontWeight: '400',
          lineHeight: s(29),
          marginTop: y(10),
        }}
      >
        Approve crewmates who asked to join your teams.
      </Text>

      {requests.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          disabled={approvingAll}
          onPress={approveAll}
          style={({ pressed }) => ({
            alignItems: 'center',
            alignSelf: 'flex-start',
            backgroundColor: palette.green,
            borderRadius: 999,
            flexDirection: 'row',
            gap: x(8),
            height: s(48),
            justifyContent: 'center',
            marginTop: y(18),
            opacity: pressed && !approvingAll ? 0.82 : 1,
            paddingHorizontal: x(18),
            transform: [{ scale: pressed && !approvingAll ? 0.98 : 1 }],
          })}
        >
          <Check color={palette.ink} size={s(17)} strokeWidth={4} />
          <Text
            selectable
            style={{
              color: palette.ink,
              fontSize: appFontSize(s, 15),
              fontWeight: '900',
              letterSpacing: -0.15,
            }}
          >
            {approvingAll
              ? 'Approving all'
              : `Approve all (${requests.length})`}
          </Text>
        </Pressable>
      ) : null}

      {requests.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingBottom: y(110),
          }}
        >
          <UserPlus color="rgba(5,5,5,0.18)" size={s(54)} strokeWidth={2.4} />
          <Text
            selectable
            style={{
              color: 'rgba(5,5,5,0.5)',
              fontSize: appFontSize(s, 18),
              fontWeight: '700',
              letterSpacing: -0.25,
              lineHeight: s(25),
              marginTop: y(18),
              textAlign: 'center',
            }}
          >
            No pending requests
          </Text>
          <Text
            selectable
            style={{
              color: 'rgba(5,5,5,0.35)',
              fontSize: appFontSize(s, 15),
              fontWeight: '400',
              lineHeight: s(22),
              marginTop: y(8),
              maxWidth: x(360),
              textAlign: 'center',
            }}
          >
            When someone joins by request, they will show here for approval.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            gap: y(14),
            paddingBottom: y(70),
            paddingTop: y(32),
          }}
          showsVerticalScrollIndicator={false}
        >
          {requests.map((request) => {
            const busy = approvingAll || busyRequestId === request.request_id;

            return (
              <View
                key={request.request_id}
                style={{
                  backgroundColor: '#f8faf5',
                  borderColor: '#eceee7',
                  borderRadius: s(26),
                  borderWidth: 1,
                  padding: s(18),
                }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: x(13),
                  }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: palette.green,
                      borderRadius: 999,
                      height: s(48),
                      justifyContent: 'center',
                      width: s(48),
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        color: palette.ink,
                        fontSize: appFontSize(s, 17),
                        fontWeight: '900',
                      }}
                    >
                      {getTeamInitials(request.requester_name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      selectable
                      numberOfLines={1}
                      style={{
                        color: '#11130f',
                        fontSize: appFontSize(s, 20),
                        fontWeight: '900',
                        letterSpacing: -0.3,
                        lineHeight: s(25),
                      }}
                    >
                      {request.requester_name}
                    </Text>
                    <Text
                      selectable
                      numberOfLines={1}
                      style={{
                        color: '#7d8378',
                        fontSize: appFontSize(s, 14),
                        fontWeight: '600',
                        lineHeight: s(20),
                        marginTop: y(2),
                      }}
                    >
                      Wants to join {request.team_name}
                    </Text>
                  </View>
                </View>

                {request.request_message ? (
                  <Text
                    selectable
                    style={{
                      color: '#555b52',
                      fontSize: appFontSize(s, 15),
                      fontWeight: '500',
                      lineHeight: s(22),
                      marginTop: y(14),
                    }}
                  >
                    {request.request_message}
                  </Text>
                ) : null}

                <Text
                  selectable
                  style={{
                    color: '#a0a59d',
                    fontSize: appFontSize(s, 12),
                    fontWeight: '700',
                    lineHeight: s(18),
                    marginTop: y(10),
                  }}
                >
                  {formatRequestTime(request.requested_at)}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    gap: x(10),
                    marginTop: y(17),
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => handleAction(request.request_id, 'approve')}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: palette.green,
                      borderRadius: 999,
                      flex: 1,
                      height: s(50),
                      justifyContent: 'center',
                      opacity: pressed && !busy ? 0.82 : 1,
                    })}
                  >
                    <Text
                      selectable
                      style={{
                        color: palette.ink,
                        fontSize: appFontSize(s, 16),
                        fontWeight: '900',
                        letterSpacing: -0.15,
                      }}
                    >
                      {busy ? 'Working' : 'Approve'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => handleAction(request.request_id, 'reject')}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      borderColor: '#dfe2dc',
                      borderRadius: 999,
                      borderWidth: 1,
                      flex: 1,
                      height: s(50),
                      justifyContent: 'center',
                      opacity: pressed && !busy ? 0.72 : 1,
                    })}
                  >
                    <Text
                      selectable
                      style={{
                        color: '#52574f',
                        fontSize: appFontSize(s, 16),
                        fontWeight: '900',
                        letterSpacing: -0.15,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function CrewMateNotificationsScreen({
  appNotifications,
  joinNotifications,
  onBack,
  onRefresh,
}: {
  appNotifications: AppNotification[];
  joinNotifications: MyJoinRequestStatus[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);
  const hasNotifications =
    appNotifications.length > 0 || joinNotifications.length > 0;

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
        <Pressable
          accessibilityRole="button"
          onPress={refresh}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: '#f4f5f1',
            borderRadius: 999,
            height: s(48),
            justifyContent: 'center',
            opacity: pressed ? 0.65 : 1,
            paddingHorizontal: x(18),
          })}
        >
          <Text
            selectable
            style={{
              color: palette.greenDeep,
              fontSize: appFontSize(s, 15),
              fontWeight: '900',
              letterSpacing: -0.15,
            }}
          >
            {refreshing ? 'Refreshing' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 44),
          fontWeight: '900',
          letterSpacing: -1.25,
          lineHeight: s(50),
          marginTop: y(54),
        }}
      >
        Notifications
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 20),
          fontWeight: '400',
          lineHeight: s(29),
          marginTop: y(10),
        }}
      >
        Track your team join requests and approvals.
      </Text>

      {!hasNotifications ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingBottom: y(110),
          }}
        >
          <Bell color="rgba(5,5,5,0.18)" size={s(54)} strokeWidth={2.4} />
          <Text
            selectable
            style={{
              color: 'rgba(5,5,5,0.5)',
              fontSize: appFontSize(s, 18),
              fontWeight: '700',
              letterSpacing: -0.25,
              lineHeight: s(25),
              marginTop: y(18),
              textAlign: 'center',
            }}
          >
            No notifications yet
          </Text>
          <Text
            selectable
            style={{
              color: 'rgba(5,5,5,0.35)',
              fontSize: appFontSize(s, 15),
              fontWeight: '400',
              lineHeight: s(22),
              marginTop: y(8),
              maxWidth: x(360),
              textAlign: 'center',
            }}
          >
            Join a team by invite and your request status will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            gap: y(13),
            paddingBottom: y(70),
            paddingTop: y(32),
          }}
          showsVerticalScrollIndicator={false}
        >
          {appNotifications.map((notification) => (
            <View
              key={notification.notification_key}
              style={{
                backgroundColor: notification.read_at ? '#f8faf5' : '#efffe6',
                borderColor: notification.read_at ? '#eceee7' : palette.green,
                borderRadius: s(24),
                borderWidth: 1,
                padding: s(18),
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  selectable
                  style={{
                    color: '#11130f',
                    flex: 1,
                    fontSize: appFontSize(s, 19),
                    fontWeight: '900',
                    letterSpacing: -0.25,
                    lineHeight: s(25),
                  }}
                >
                  {notification.title}
                </Text>
                {!notification.read_at ? (
                  <View
                    style={{
                      backgroundColor: palette.green,
                      borderRadius: 999,
                      height: s(10),
                      width: s(10),
                    }}
                  />
                ) : null}
              </View>
              <Text
                selectable
                style={{
                  color: '#747a70',
                  fontSize: appFontSize(s, 15),
                  fontWeight: '500',
                  lineHeight: s(22),
                  marginTop: y(9),
                }}
              >
                {notification.body}
              </Text>
              <Text
                selectable
                style={{
                  color: '#a0a59d',
                  fontSize: appFontSize(s, 12),
                  fontWeight: '700',
                  lineHeight: s(18),
                  marginTop: y(9),
                }}
              >
                {formatRequestTime(notification.created_at)}
              </Text>
            </View>
          ))}
          {joinNotifications.map((notification) => (
            <View
              key={notification.request_id}
              style={{
                backgroundColor: '#f8faf5',
                borderColor: '#eceee7',
                borderRadius: s(24),
                borderWidth: 1,
                padding: s(18),
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  selectable
                  style={{
                    color: '#11130f',
                    flex: 1,
                    fontSize: appFontSize(s, 19),
                    fontWeight: '900',
                    letterSpacing: -0.25,
                    lineHeight: s(25),
                  }}
                >
                  {notification.team_name}
                </Text>
                <View
                  style={{
                    backgroundColor:
                      notification.request_status === 'approved'
                        ? palette.green
                        : notification.request_status === 'rejected'
                          ? '#ffe8e2'
                          : '#fff4d7',
                    borderRadius: 999,
                    paddingHorizontal: x(12),
                    paddingVertical: y(6),
                  }}
                >
                  <Text
                    selectable
                    style={{
                      color: palette.ink,
                      fontSize: appFontSize(s, 12),
                      fontWeight: '900',
                      textTransform: 'capitalize',
                    }}
                  >
                    {notification.request_status}
                  </Text>
                </View>
              </View>
              <Text
                selectable
                style={{
                  color: '#747a70',
                  fontSize: appFontSize(s, 15),
                  fontWeight: '500',
                  lineHeight: s(22),
                  marginTop: y(9),
                }}
              >
                {notification.request_status === 'approved'
                  ? 'Decision: Approved. You are now a member of this team.'
                  : notification.request_status === 'rejected'
                    ? 'Decision: Cancelled. The CrewLead declined this request.'
                    : 'Status: Pending. Waiting for the CrewLead admin to approve you.'}
              </Text>
              <Text
                selectable
                style={{
                  color: '#a0a59d',
                  fontSize: appFontSize(s, 12),
                  fontWeight: '700',
                  lineHeight: s(18),
                  marginTop: y(9),
                }}
              >
                {formatRequestTime(notification.requested_at)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function HomeScreen({
  email,
  hasTeam,
  onBulkTransfer,
  onCreateTeam,
  onCreateTask,
  onJoinTeam,
  onLogout,
  onOpenChat,
  onOpenNotifications,
  onOpenPayoutHistory,
  onOpenRequests,
  onOpenSubmissions,
  onRetrySync,
  onEditPayoutInfo,
  onSwitchRole,
  onViewTask,
  onViewTeam,
  pendingRequestCount,
  role,
  submissionCount,
  syncError,
  syncStatus,
  taskCount,
  teamCount,
}: {
  email: string;
  hasTeam: boolean;
  onBulkTransfer: () => void;
  onCreateTeam: () => void;
  onCreateTask: () => void;
  onEditPayoutInfo: () => void;
  onJoinTeam: () => void;
  onLogout: () => void;
  onOpenPayoutHistory: () => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
  onOpenRequests: () => void;
  onOpenSubmissions: () => void;
  onRetrySync: () => void;
  onSwitchRole: () => void;
  onViewTask: () => void;
  onViewTeam: () => void;
  pendingRequestCount: number;
  role: AccountRole;
  submissionCount: number;
  syncError: string;
  syncStatus: SyncStatus;
  taskCount: number;
  teamCount: number;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 624;
  const heightScale = height / 1239;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [activeTab, setActiveTab] = useState<HomeTab>('home');
  const [promoVisible, setPromoVisible] = useState(true);
  const [walletSlideIndex, setWalletSlideIndex] = useState(0);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpStep, setTopUpStep] = useState<'amount' | 'passcode' | 'review'>(
    'amount',
  );
  const [topUpPasscode, setTopUpPasscode] = useState('');
  const [topUpPasscodeError, setTopUpPasscodeError] = useState('');
  const [topUpPasscodeShake, setTopUpPasscodeShake] = useState(0);
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletBaseline, setWalletBaseline] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(
    [],
  );
  const [walletError, setWalletError] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [lastAction, setLastAction] = useState<{
    action: HomeAction;
    id: number;
  } | null>(null);
  const isCrewMate = role === 'crewmate';
  const actionToastOpacity = useRef(new Animated.Value(0)).current;
  const cardGap = x(16);
  const gridLeft = x(56);
  const gridWidth = width - x(112);
  const cardWidth = Math.round((gridWidth - cardGap) / 2);
  const cardHeight = y(176);
  const activeActions = isCrewMate ? crewMateHomeActions : crewLeadHomeActions;
  const actionRows = [activeActions.slice(0, 2), activeActions.slice(2, 4)];
  const activeSlides = isCrewMate ? crewMateSlides : walletSlides;
  const activeWalletSlide = activeSlides[walletSlideIndex % activeSlides.length];
  const showSyncBanner = syncStatus === 'loading' || Boolean(syncError);
  const walletHealthPercent =
    walletBaseline > 0
      ? Math.max(0, Math.min(100, Math.round((walletBalance / walletBaseline) * 100)))
      : 0;
  const walletHealthColor = getWalletHealthColor(walletHealthPercent);
  const walletBalanceParts = formatNaira(walletBalance).split('.');
  const topUpAmountValue = parseMoneyAmount(topUpAmount);
  const homeChromeHidden =
    quickActionsOpen || addMoneyOpen || topUpOpen || transactionsOpen;
  const showActionToast = useCallback(
    (action: HomeAction) => {
      actionToastOpacity.stopAnimation();
      actionToastOpacity.setValue(1);
      setLastAction({ action, id: Date.now() });
    },
    [actionToastOpacity],
  );
  const openAction = useCallback(
    (action: HomeAction) => {
      if (action === 'create-task') {
        onCreateTask();
        return;
      }

      if (action === 'create-team') {
        onCreateTeam();
        return;
      }

      if (action === 'view-team') {
        onViewTeam();
        return;
      }

      if (action === 'view-task') {
        onViewTask();
        return;
      }

      if (action === 'join-team') {
        onJoinTeam();
        return;
      }

      if (action === 'requests') {
        onOpenRequests();
        return;
      }

      if (action === 'submitted-work' || action === 'submit-proof') {
        onOpenSubmissions();
        return;
      }

      showActionToast(action);
      setQuickActionsOpen(false);
    },
    [
      onCreateTask,
      onCreateTeam,
      onJoinTeam,
      onOpenRequests,
      onOpenSubmissions,
      onViewTask,
      onViewTeam,
      showActionToast,
    ],
  );

  const closeTopUpFlow = useCallback(() => {
    setTopUpOpen(false);
    setTopUpStep('amount');
    setTopUpPasscode('');
    setTopUpPasscodeError('');
    setTopUpSubmitting(false);
  }, []);

  const refreshWallet = useCallback(async () => {
    if (isCrewMate) {
      return;
    }

    setWalletLoading(true);
    setWalletError('');

    try {
      const [summary, transactions] = await Promise.all([
        getWalletSummary(),
        listWalletTransactions(),
      ]);

      setWalletBalance(summary.availableBalanceNaira);
      setWalletBaseline(summary.latestFundingBaselineNaira);
      setWalletTransactions(transactions);
    } catch (error) {
      setWalletError(getErrorMessage(error));
    } finally {
      setWalletLoading(false);
    }
  }, [isCrewMate]);

  const handleWalletDepositReturn = useCallback(
    async (url: string) => {
      if (isCrewMate || !isWalletDepositReturnUrl(url)) {
        return;
      }

      try {
        setWalletError('');
        const fallbackTxRef = await AsyncStorage.getItem(
          pendingWalletDepositStorageKey,
        );
        const verification = await verifyWalletDepositReturnUrl(url, fallbackTxRef);

        if (
          verification &&
          ['cancelled', 'failed', 'succeeded'].includes(
            String(verification.status),
          )
        ) {
          await AsyncStorage.removeItem(pendingWalletDepositStorageKey);
        }

        await refreshWallet();
      } catch (error) {
        setWalletError(getErrorMessage(error));
        await refreshWallet();
      } finally {
        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          isWalletDepositReturnUrl(window.location.href)
        ) {
          window.history.replaceState({}, '', window.location.origin);
        }
      }
    },
    [isCrewMate, refreshWallet],
  );

  const addTopUpPasscodeDigit = useCallback(
    (digit: string) => {
      if (topUpSubmitting) {
        return;
      }

      setTopUpPasscodeError('');
      const nextCode = `${topUpPasscode}${digit}`.slice(0, 4);
      setTopUpPasscode(nextCode);

      if (nextCode.length !== 4) {
        return;
      }

      setTimeout(async () => {
        try {
          setTopUpSubmitting(true);
          const user = await getCurrentUser();

          if (!user) {
            throw new Error('Please sign in again to continue.');
          }

          const result = await verifyLocalPasscode(user.id, nextCode);

          if (!result.ok) {
            setTopUpPasscode('');
            setTopUpPasscodeShake((value) => value + 1);

            if (result.lockedUntil) {
              const unlockTime = new Date(result.lockedUntil).toLocaleTimeString(
                [],
                {
                  hour: 'numeric',
                  minute: '2-digit',
                },
              );
              setTopUpPasscodeError(`Too many tries. Try again after ${unlockTime}.`);
              return;
            }

            setTopUpPasscodeError(
              `${result.attemptsRemaining} ${
                result.attemptsRemaining === 1 ? 'try' : 'tries'
              } left.`,
            );
            return;
          }

          if (topUpAmountValue <= 0) {
            throw new Error('Enter an amount to add.');
          }

          const deposit = await createWalletDeposit({
            amountNaira: topUpAmountValue,
          });

          await AsyncStorage.setItem(
            pendingWalletDepositStorageKey,
            deposit.txRef,
          );

          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.assign(deposit.checkoutUrl);
            return;
          }

          await Linking.openURL(deposit.checkoutUrl);
          setTopUpAmount('');
          closeTopUpFlow();
          setAddMoneyOpen(false);
          await refreshWallet();
        } catch (error) {
          setTopUpPasscode('');
          setTopUpPasscodeShake((value) => value + 1);
          setTopUpPasscodeError(getErrorMessage(error));
        } finally {
          setTopUpSubmitting(false);
        }
      }, 140);
    },
    [
      closeTopUpFlow,
      refreshWallet,
      topUpAmountValue,
      topUpPasscode,
      topUpSubmitting,
    ],
  );

  const deleteTopUpPasscodeDigit = useCallback(() => {
    if (topUpSubmitting) {
      return;
    }

    setTopUpPasscode((value) => value.slice(0, -1));
    setTopUpPasscodeError('');
  }, [topUpSubmitting]);

  useEffect(() => {
    if (!lastAction) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      Animated.timing(actionToastOpacity, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setLastAction(null);
        }
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [actionToastOpacity, lastAction]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (isCrewMate) {
      return undefined;
    }

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      isWalletDepositReturnUrl(window.location.href)
    ) {
      void handleWalletDepositReturn(window.location.href);
    }

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshWallet();
      }
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      if (
        isWalletDepositReturnUrl(url)
      ) {
        void handleWalletDepositReturn(url);
      }
    });

    return () => {
      appStateSubscription.remove();
      linkSubscription.remove();
    };
  }, [handleWalletDepositReturn, isCrewMate, refreshWallet]);

  return (
    <View style={{ backgroundColor: '#ffffff', flex: 1, overflow: 'hidden' }}>
      <StatusBar style="dark" />
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 24),
          fontWeight: '800',
          left: x(63),
          letterSpacing: -0.35,
          lineHeight: s(30),
          position: 'absolute',
          top: y(86),
        }}
      >
        {isCrewMate ? 'CrewMate' : 'CrewLead'}
      </Text>
      <Pressable
        accessibilityLabel={`Switch to ${isCrewMate ? 'CrewLead' : 'CrewMate'}`}
        accessibilityRole="button"
        onPress={onSwitchRole}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: '#f4f5f1',
          borderRadius: 999,
          height: s(42),
          justifyContent: 'center',
          opacity: pressed ? 0.55 : 1,
          position: 'absolute',
          right: x(108),
          top: y(82),
          transform: [{ scale: pressed ? 0.96 : 1 }],
          width: s(42),
        })}
      >
        <ArrowLeftRight color="#050505" size={s(22)} strokeWidth={3} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenNotifications}
        style={({ pressed }) => ({
          alignItems: 'center',
          height: s(42),
          justifyContent: 'center',
          opacity: pressed ? 0.55 : 1,
          position: 'absolute',
          right: x(58),
          top: y(82),
          width: s(42),
        })}
      >
        <Bell color="#050505" size={s(25)} strokeWidth={3} />
        {pendingRequestCount > 0 ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.green,
              borderColor: '#ffffff',
              borderRadius: 999,
              borderWidth: 2,
              height: s(19),
              justifyContent: 'center',
              position: 'absolute',
              right: s(0),
              top: s(0),
              width: s(19),
            }}
          >
            <Text
              selectable
              style={{
                color: palette.ink,
                fontSize: appFontSize(s, 10),
                fontWeight: '900',
                lineHeight: s(13),
              }}
            >
              {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {showSyncBanner ? (
        <Pressable
          accessibilityRole={syncError ? 'button' : undefined}
          disabled={!syncError}
          onPress={syncError ? onRetrySync : undefined}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: syncError ? '#fff7df' : '#f4f5f1',
            borderColor: syncError ? '#efd99a' : '#eceee7',
            borderRadius: 999,
            borderWidth: 1,
            flexDirection: 'row',
            left: x(63),
            minHeight: s(36),
            opacity: pressed ? 0.72 : 1,
            paddingHorizontal: x(12),
            position: 'absolute',
            right: x(63),
            top: y(122),
            zIndex: 3,
          })}
        >
          <View
            style={{
              backgroundColor: syncError ? '#d7a600' : palette.green,
              borderRadius: 999,
              height: s(8),
              marginRight: x(8),
              width: s(8),
            }}
          />
          <Text
            selectable
            numberOfLines={1}
            style={{
              color: syncError ? '#6f5500' : '#747a70',
              flex: 1,
              fontSize: appFontSize(s, 12),
              fontWeight: '800',
              letterSpacing: -0.05,
              lineHeight: s(16),
            }}
          >
            {syncError || 'Syncing latest workspace...'}
          </Text>
          {syncError ? (
            <Text
              selectable
              style={{
                color: palette.greenDeep,
                fontSize: appFontSize(s, 12),
                fontWeight: '900',
                lineHeight: s(16),
                marginLeft: x(8),
              }}
            >
              Retry
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: x(8),
          left: x(63),
          position: 'absolute',
          top: y(160),
        }}
      >
        <Text
          selectable
          style={{
            color: '#b5b7b9',
            fontSize: appFontSize(s, 20),
            fontWeight: '700',
            lineHeight: s(25),
          }}
        >
          {isCrewMate ? 'Task workspace' : 'Total Balance'}
        </Text>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: walletHealthColor,
            borderRadius: s(4),
            display: isCrewMate ? 'none' : 'flex',
            height: s(18),
            justifyContent: 'center',
            width: s(18),
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderBottomWidth: Math.max(1.6, s(2)),
              borderColor: '#ffffff',
              borderRightWidth: Math.max(1.6, s(2)),
              height: s(7),
              transform: [{ rotate: '-45deg' }],
              width: s(7),
            }}
          />
        </View>
        <Text
          selectable
          style={{
            color: isCrewMate ? '#b5b7b9' : walletHealthColor,
            fontSize: appFontSize(s, 18),
            fontWeight: '800',
            lineHeight: s(23),
          }}
        >
          {isCrewMate ? 'Ready' : `${walletHealthPercent}%`}
        </Text>
      </View>

      <View
        style={{
          alignItems: 'flex-end',
          display: isCrewMate ? 'none' : 'flex',
          flexDirection: 'row',
          left: x(63),
          position: 'absolute',
          top: y(193),
        }}
      >
        <Text
          selectable
          style={{
            color: '#000000',
            fontSize: appFontSize(s, 61),
            fontWeight: '900',
            letterSpacing: -2.4,
            lineHeight: s(70),
          }}
        >
          {nairaSymbol}
          {formatNairaWhole(walletBalance)}
        </Text>
        <Text
          selectable
          style={{
            color: '#b9bbbd',
            fontSize: appFontSize(s, 61),
            fontWeight: '900',
            letterSpacing: -2.4,
            lineHeight: s(70),
          }}
        >
          .{walletBalanceParts[1] ?? '00'}
        </Text>
      </View>

      <View
        style={{
          alignItems: 'flex-end',
          display: 'none',
          flexDirection: 'row',
          left: x(63),
          position: 'absolute',
          top: y(193),
        }}
      >
        <Text
          selectable
          style={{
            color: '#000000',
            fontSize: appFontSize(s, 61),
            fontWeight: '900',
            letterSpacing: -2.4,
            lineHeight: s(70),
          }}
        >
          ₦0
        </Text>
        <Text
          selectable
          style={{
            color: '#b9bbbd',
            fontSize: appFontSize(s, 61),
            fontWeight: '900',
            letterSpacing: -2.4,
            lineHeight: s(70),
          }}
        >
          .00
        </Text>
      </View>

      <View
        style={{
          alignItems: 'center',
          left: x(108),
          position: 'absolute',
          right: x(108),
          top: y(isCrewMate ? 211 : 292),
        }}
      >
        <Text
          selectable
          style={{
            color: '#050505',
            fontSize: appFontSize(s, 22),
            fontWeight: '900',
            letterSpacing: -0.25,
            lineHeight: s(28),
            textAlign: 'center',
          }}
        >
          {isCrewMate ? 'No active tasks yet' : 'There is nothing here yet'}
        </Text>
        <Text
          selectable
          style={{
            color: '#b5b7b9',
            fontSize: appFontSize(s, 19),
            fontWeight: '700',
            lineHeight: s(24),
            marginTop: y(6),
            textAlign: 'center',
          }}
        >
          {isCrewMate
            ? 'Join a team to see assigned tasks and submit proof for approval'
            : 'Create tasks, build teams, and review work from your CrewPay wallet'}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          isCrewMate ? openAction('join-team') : setAddMoneyOpen(true)
        }
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: palette.green,
          borderRadius: 999,
          flexDirection: 'row',
          gap: x(11),
          height: y(54),
          justifyContent: 'center',
          left: Math.round((width - s(188)) / 2),
          opacity: pressed ? 0.84 : 1,
          position: 'absolute',
          top: y(392),
          transform: [{ scale: pressed ? 0.97 : 1 }],
          width: s(188),
        })}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: 999,
            height: s(23),
            justifyContent: 'center',
            width: s(23),
          }}
        >
          <ArrowDown color="#000000" size={s(15)} strokeWidth={4} />
        </View>
        <Text
          selectable
          style={{
            color: palette.ink,
            fontSize: appFontSize(s, 18),
            fontWeight: '800',
            letterSpacing: -0.15,
          }}
        >
          {isCrewMate ? 'Join team' : 'Add money'}
        </Text>
      </Pressable>

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          left: gridLeft,
          position: 'absolute',
          top: y(462),
          width: gridWidth,
        }}
      >
        <HomeCountLink
          count={teamCount}
          label={teamCount === 1 ? 'Team' : 'Teams'}
          onPress={onViewTeam}
          s={s}
          x={x}
        />
        <HomeCountDivider s={s} x={x} />
        <HomeCountLink
          count={taskCount}
          label={taskCount === 1 ? 'Task' : 'Tasks'}
          onPress={onViewTask}
          s={s}
          x={x}
        />
        <HomeCountDivider s={s} x={x} />
        <HomeCountLink
          count={submissionCount}
          label={isCrewMate ? 'Submitted' : 'Reviews'}
          onPress={onOpenSubmissions}
          s={s}
          x={x}
        />
      </View>

      <View
        style={{
          gap: y(17),
          left: gridLeft,
          position: 'absolute',
          top: y(500),
          width: gridWidth,
        }}
      >
        {actionRows.map((row, rowIndex) => (
          <View
            key={`home-action-row-${rowIndex}`}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: gridWidth,
            }}
          >
            {row.map((action) => (
              <HomeActionCard
                action={action}
                height={cardHeight}
                key={action.id}
                onPress={() => openAction(action.id)}
                s={s}
                scale={scale}
                width={cardWidth}
                x={x}
                y={y}
              />
            ))}
          </View>
        ))}
      </View>

      {!isCrewMate ? (
        <HomeTransactionSection
          loading={walletLoading}
          onRefresh={refreshWallet}
          onSeeAll={() => setTransactionsOpen(true)}
          s={s}
          transactions={walletTransactions.slice(0, 3)}
          walletError={walletError}
          x={x}
          y={y}
        />
      ) : null}

      {promoVisible && isCrewMate ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            setWalletSlideIndex((index) => (index + 1) % activeSlides.length)
          }
          style={{
            alignItems: 'center',
            borderColor: '#eceff1',
            borderRadius: s(25),
            borderWidth: 1,
            bottom: y(132),
            flexDirection: 'row',
            height: y(109),
            left: gridLeft,
            overflow: 'hidden',
            paddingHorizontal: x(26),
            position: 'absolute',
            width: gridWidth,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#eaf3ff',
              borderRadius: s(16),
              height: s(49),
              justifyContent: 'center',
              marginRight: x(18),
              width: s(49),
            }}
          >
            <HomeActionIcon scale={scale} tone={activeWalletSlide.tone} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              selectable
              style={{
                color: '#050505',
                fontSize: appFontSize(s, 20),
                fontWeight: '900',
                letterSpacing: -0.3,
                lineHeight: s(25),
            }}
          >
              {activeWalletSlide.title}
            </Text>
            <Text
              selectable
              style={{
                color: '#aeb1b3',
                fontSize: appFontSize(s, 16),
                fontWeight: '700',
                lineHeight: s(21),
                marginTop: y(3),
            }}
          >
              {activeWalletSlide.subtitle}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPromoVisible(false)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.5 : 1,
              padding: s(8),
            })}
          >
            <CloseMiniIcon color="#b6b8ba" scale={scale} />
          </Pressable>
          <View
            style={{
              alignItems: 'center',
              bottom: y(16),
              flexDirection: 'row',
              gap: x(5),
              position: 'absolute',
              right: x(28),
            }}
          >
            {activeSlides.map((_, dot) => (
              <View
                key={`promo-dot-${dot}`}
                style={{
                  backgroundColor:
                    dot === walletSlideIndex ? '#050505' : '#e0e2e4',
                  borderRadius: 999,
                  height: s(dot === 0 ? 5 : 6),
                  width: s(dot === 0 ? 5 : 6),
                }}
              />
            ))}
          </View>
        </Pressable>
      ) : null}

      {lastAction ? (
        <Animated.View
          pointerEvents="none"
          style={{
            alignItems: 'center',
            alignSelf: 'center',
            backgroundColor: '#111111',
            borderRadius: 999,
            bottom: y(105),
            opacity: actionToastOpacity,
            paddingHorizontal: x(18),
            paddingVertical: y(9),
            position: 'absolute',
          }}
        >
          <Text
            selectable
            style={{
              color: '#ffffff',
              fontSize: appFontSize(s, 14),
              fontWeight: '800',
            }}
          >
            {homeActionLabels[lastAction.action]} selected
          </Text>
        </Animated.View>
      ) : null}

      {activeTab === 'activity' ? (
        <View
          style={{
            backgroundColor: palette.paper,
            bottom: y(114),
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        >
          <ScrollView
            contentContainerStyle={{
              paddingBottom: y(40),
              paddingHorizontal: x(24),
              paddingTop: y(52),
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              selectable
              style={{
                color: palette.ink,
                fontSize: s(28),
                fontWeight: '900',
                letterSpacing: -0.7,
                lineHeight: s(34),
              }}
            >
              Activity
            </Text>
            <Text
              selectable
              style={{
                color: '#747a70',
                fontSize: s(14),
                fontWeight: '500',
                lineHeight: s(20),
                marginTop: y(5),
              }}
            >
              {isCrewMate ? 'Your recent task submissions and team updates.' : 'Payouts, wallet activity, and team messages.'}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={onOpenChat}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? '#e8ead3' : palette.green,
                borderRadius: s(18),
                flexDirection: 'row',
                gap: x(12),
                marginTop: y(22),
                paddingHorizontal: x(16),
                paddingVertical: y(14),
              })}
            >
              <View style={{ alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 999, height: s(36), justifyContent: 'center', width: s(36) }}>
                <Text style={{ fontSize: s(18) }}>💬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text selectable style={{ color: palette.ink, fontSize: s(16), fontWeight: '900' }}>Open chats</Text>
                <Text selectable style={{ color: '#5a5f54', fontSize: s(12), fontWeight: '500', marginTop: 2 }}>Team rooms and direct messages</Text>
              </View>
              <ChevronRight color={palette.ink} size={s(18)} strokeWidth={2.5} />
            </Pressable>

            {!isCrewMate ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenPayoutHistory}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: pressed ? '#f0f1ea' : '#f5f6f0',
                    borderColor: '#e2e4db',
                    borderRadius: s(18),
                    borderWidth: 1,
                    flexDirection: 'row',
                    gap: x(12),
                    marginTop: y(12),
                    paddingHorizontal: x(16),
                    paddingVertical: y(14),
                  })}
                >
                  <View style={{ alignItems: 'center', backgroundColor: palette.ink, borderRadius: 999, height: s(36), justifyContent: 'center', width: s(36) }}>
                    <Text style={{ fontSize: s(18) }}>₦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text selectable style={{ color: palette.ink, fontSize: s(16), fontWeight: '900' }}>Payout history</Text>
                    <Text selectable style={{ color: '#747a70', fontSize: s(12), fontWeight: '500', marginTop: 2 }}>All wallet transactions and payout records</Text>
                  </View>
                  <ChevronRight color="#a0a59d" size={s(18)} strokeWidth={2.5} />
                </Pressable>

                {walletTransactions.length > 0 ? (
                  <View style={{ gap: y(8), marginTop: y(20) }}>
                    <Text selectable style={{ color: '#a0a59d', fontSize: s(12), fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                      Recent payouts
                    </Text>
                    {walletTransactions
                      .filter((t) => t.direction === 'reserve' || t.direction === 'debit')
                      .slice(0, 5)
                      .map((t) => (
                        <View
                          key={t.id}
                          style={{
                            backgroundColor: '#f8f9f3',
                            borderColor: '#eceee7',
                            borderRadius: s(14),
                            borderWidth: 1,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingHorizontal: x(14),
                            paddingVertical: y(12),
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text selectable style={{ color: palette.ink, fontSize: s(14), fontWeight: '800' }}>{t.title}</Text>
                            <Text selectable style={{ color: '#747a70', fontSize: s(12), fontWeight: '500', marginTop: 2 }}>{t.subtitle}</Text>
                          </View>
                          <Text selectable style={{ color: '#e05252', fontSize: s(14), fontWeight: '900' }}>
                            -{'\u20a6'}{Number(t.amountNaira || 0).toLocaleString()}
                          </Text>
                        </View>
                      ))}
                  </View>
                ) : walletLoading ? (
                  <View style={{ alignItems: 'center', paddingVertical: y(32) }}>
                    <ActivityIndicator color={palette.greenDeep} />
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: y(32) }}>
                    <Text selectable style={{ color: '#a0a59d', fontSize: s(14), fontWeight: '600', textAlign: 'center' }}>No payouts yet. Process your first bulk transfer.</Text>
                  </View>
                )}
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={onOpenSubmissions}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: pressed ? '#f0f1ea' : '#f5f6f0',
                  borderColor: '#e2e4db',
                  borderRadius: s(18),
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: x(12),
                  marginTop: y(12),
                  paddingHorizontal: x(16),
                  paddingVertical: y(14),
                })}
              >
                <View style={{ alignItems: 'center', backgroundColor: palette.green, borderRadius: 999, height: s(36), justifyContent: 'center', width: s(36) }}>
                  <Text style={{ fontSize: s(18) }}>📋</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text selectable style={{ color: palette.ink, fontSize: s(16), fontWeight: '900' }}>My submissions</Text>
                  <Text selectable style={{ color: '#747a70', fontSize: s(12), fontWeight: '500', marginTop: 2 }}>View your submitted work and approval status</Text>
                </View>
                <ChevronRight color="#a0a59d" size={s(18)} strokeWidth={2.5} />
              </Pressable>
            )}
          </ScrollView>
        </View>
      ) : null}

      {activeTab === 'settings' ? (
        <HomeSettingsPanel
          email={email}
          onEditPayoutInfo={onEditPayoutInfo}
          onLogout={onLogout}
          onSwitchRole={onSwitchRole}
          role={role}
          s={s}
          x={x}
          y={y}
        />
      ) : null}

      {transactionsOpen ? (
        <WalletTransactionsScreen
          loading={walletLoading}
          onBack={() => setTransactionsOpen(false)}
          onRefresh={refreshWallet}
          s={s}
          transactions={walletTransactions}
          walletError={walletError}
          x={x}
          y={y}
        />
      ) : null}

      {!homeChromeHidden ? (
        <>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderTopColor: 'transparent',
              borderTopWidth: 0,
              bottom: y(-10),
              flexDirection: 'row',
              gap: x(54),
              height: y(114),
              justifyContent: 'flex-start',
              left: 0,
              paddingLeft: x(72),
              paddingRight: x(142),
              position: 'absolute',
              right: 0,
              zIndex: 8,
            }}
          >
            <HomeTabButton
              active={activeTab === 'home'}
              icon="home"
              onPress={() => setActiveTab('home')}
              scale={scale}
            />
            <HomeTabButton
              active={false}
              icon="activity"
              onPress={onOpenChat}
              scale={scale}
            />
            <HomeTabButton
              active={activeTab === 'settings'}
              icon="settings"
              onPress={() => setActiveTab('settings')}
              scale={scale}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setQuickActionsOpen((value) => !value)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: '#000000',
              borderRadius: 999,
              bottom: y(16),
              height: s(68),
              justifyContent: 'center',
              opacity: pressed ? 0.86 : 1,
              position: 'absolute',
              right: x(46),
              transform: [{ scale: pressed ? 0.96 : 1 }],
              width: s(68),
              zIndex: 9,
            })}
          >
            <PlusIcon color="#ffffff" scale={scale} />
          </Pressable>
        </>
      ) : null}

      {quickActionsOpen ? (
        <HomeQuickActionOverlay
          onClose={() => setQuickActionsOpen(false)}
          onSelect={(action) => {
            if (action) {
              openAction(action);
            } else {
              onBulkTransfer();
            }
            setQuickActionsOpen(false);
          }}
          role={role}
          requestCount={pendingRequestCount}
          s={s}
          x={x}
          y={y}
        />
      ) : null}

      {addMoneyOpen ? (
        <AddMoneySheet
          onCashDeposit={() => {
            showActionToast('create-task');
            setAddMoneyOpen(false);
          }}
          onClose={() => setAddMoneyOpen(false)}
          onTopUp={() => {
            setAddMoneyOpen(false);
            setTopUpStep('amount');
            setTopUpOpen(true);
          }}
          s={s}
          x={x}
          y={y}
        />
      ) : null}

      {topUpOpen && topUpStep === 'amount' ? (
        <TopUpAmountScreen
          amount={topUpAmount}
          onBack={() => {
            closeTopUpFlow();
            setAddMoneyOpen(true);
          }}
          onChangeAmount={setTopUpAmount}
          onReview={() => setTopUpStep('review')}
          s={s}
          width={width}
          x={x}
          y={y}
        />
      ) : null}
      {topUpOpen && topUpStep === 'review' ? (
        <TopUpReviewScreen
          amount={topUpAmount}
          onBack={() => setTopUpStep('amount')}
          onContinue={() => {
            setTopUpPasscode('');
            setTopUpPasscodeError('');
            setTopUpStep('passcode');
          }}
          s={s}
          x={x}
          y={y}
        />
      ) : null}
      {topUpOpen && topUpStep === 'passcode' ? (
        <TopUpPasscodeScreen
          amount={topUpAmount}
          error={topUpPasscodeError}
          onBack={() => {
            setTopUpPasscode('');
            setTopUpPasscodeError('');
            setTopUpStep('review');
          }}
          onDelete={deleteTopUpPasscodeDigit}
          onDigit={addTopUpPasscodeDigit}
          s={s}
          scale={scale}
          shakeTrigger={topUpPasscodeShake}
          submitting={topUpSubmitting}
          value={topUpPasscode}
          x={x}
          y={y}
        />
      ) : null}
    </View>
  );
}

function HomeCountLink({
  count,
  label,
  onPress,
  s,
  x,
}: {
  count: number;
  label: string;
  onPress: () => void;
  s: (value: number) => number;
  x: (value: number) => number;
}) {
  return (
    <Pressable
      accessibilityLabel={`${count} ${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: x(5),
        opacity: pressed ? 0.5 : 1,
        paddingHorizontal: x(9),
        paddingVertical: s(4),
      })}
    >
      <Text
        selectable
        style={{
          color: palette.greenDeep,
          fontSize: appFontSize(s, 14),
          fontWeight: '900',
          lineHeight: s(18),
        }}
      >
        {count}
      </Text>
      <Text
        selectable
        style={{
          color: '#747a70',
          fontSize: appFontSize(s, 13),
          fontWeight: '700',
          lineHeight: s(18),
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function HomeCountDivider({
  s,
  x,
}: {
  s: (value: number) => number;
  x: (value: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: '#dfe2da',
        borderRadius: 999,
        height: s(4),
        marginHorizontal: x(2),
        width: s(4),
      }}
    />
  );
}

function formatTransactionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  });
}

function transactionAmountPrefix(transaction: WalletTransaction) {
  if (transaction.direction === 'credit' || transaction.direction === 'release') {
    return '+';
  }

  return '-';
}

function transactionStatusColor(status: string) {
  if (status === 'succeeded' || status === 'posted') {
    return palette.greenDeep;
  }

  if (status === 'failed' || status === 'cancelled') {
    return '#a33424';
  }

  return '#a77900';
}

function HomeTransactionSection({
  loading,
  onRefresh,
  onSeeAll,
  s,
  transactions,
  walletError,
  x,
  y,
}: {
  loading: boolean;
  onRefresh: () => void;
  onSeeAll: () => void;
  s: (value: number) => number;
  transactions: WalletTransaction[];
  walletError: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View
      style={{
        left: x(56),
        position: 'absolute',
        right: x(56),
        top: y(870),
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: y(10),
        }}
      >
        <Text
          selectable
          style={{
            color: '#050505',
            fontSize: appFontSize(s, 20),
            fontWeight: '900',
            letterSpacing: -0.35,
            lineHeight: s(25),
          }}
        >
          Transactions
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={transactions.length > 0 ? onSeeAll : onRefresh}
          style={({ pressed }) => ({
            opacity: pressed ? 0.55 : 1,
            paddingHorizontal: x(8),
            paddingVertical: y(5),
          })}
        >
          <Text
            selectable
            style={{
              color: palette.greenDeep,
              fontSize: appFontSize(s, 14),
              fontWeight: '900',
              letterSpacing: -0.1,
            }}
          >
            {transactions.length > 0 ? 'See all' : loading ? 'Loading' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          borderColor: '#edf0eb',
          borderRadius: s(24),
          borderWidth: 1,
          minHeight: y(74),
          overflow: 'hidden',
          paddingHorizontal: x(15),
          paddingVertical: y(10),
        }}
      >
        {walletError ? (
          <Text
            selectable
            numberOfLines={2}
            style={{
              color: '#a33424',
              fontSize: appFontSize(s, 13),
              fontWeight: '700',
              lineHeight: s(18),
              paddingVertical: y(10),
            }}
          >
            {walletError}
          </Text>
        ) : transactions.length === 0 ? (
          <Text
            selectable
            style={{
              color: '#aeb1b3',
              fontSize: appFontSize(s, 14),
              fontWeight: '700',
              lineHeight: s(20),
              paddingVertical: y(12),
              textAlign: 'center',
            }}
          >
            {loading ? 'Loading wallet activity...' : 'Your first top up will appear here.'}
          </Text>
        ) : (
          transactions.map((transaction) => (
            <WalletTransactionRow
              compact
              key={transaction.id}
              s={s}
              transaction={transaction}
              x={x}
              y={y}
            />
          ))
        )}
      </View>
    </View>
  );
}

function WalletTransactionsScreen({
  loading,
  onBack,
  onRefresh,
  s,
  transactions,
  walletError,
  x,
  y,
}: {
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  s: (value: number) => number;
  transactions: WalletTransaction[];
  walletError: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        bottom: 0,
        left: 0,
        paddingHorizontal: x(38),
        paddingTop: y(74),
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 20,
      }}
    >
      <StatusBar style="dark" />
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: '#f3f4ef',
          borderRadius: 999,
          height: s(58),
          justifyContent: 'center',
          opacity: pressed ? 0.55 : 1,
          width: s(58),
        })}
      >
        <ArrowLeftIcon scale={s(1) * 0.78} />
      </Pressable>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: y(44),
        }}
      >
        <Text
          selectable
          style={{
            color: '#050505',
            fontSize: appFontSize(s, 41),
            fontWeight: '900',
            letterSpacing: -1,
            lineHeight: s(50),
          }}
        >
          Transactions
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          style={({ pressed }) => ({
            opacity: pressed ? 0.55 : 1,
            paddingHorizontal: x(10),
            paddingVertical: y(8),
          })}
        >
          <Text
            selectable
            style={{
              color: palette.greenDeep,
              fontSize: appFontSize(s, 15),
              fontWeight: '900',
            }}
          >
            {loading ? 'Syncing' : 'Refresh'}
          </Text>
        </Pressable>
      </View>
      {walletError ? (
        <Text
          selectable
          style={{
            color: '#a33424',
            fontSize: appFontSize(s, 15),
            fontWeight: '700',
            lineHeight: s(22),
            marginTop: y(16),
          }}
        >
          {walletError}
        </Text>
      ) : null}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: y(52),
          paddingTop: y(24),
        }}
        showsVerticalScrollIndicator={false}
      >
        {transactions.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              borderColor: '#edf0eb',
              borderRadius: s(28),
              borderWidth: 1,
              minHeight: y(150),
              justifyContent: 'center',
              paddingHorizontal: x(24),
            }}
          >
            <Text
              selectable
              style={{
                color: '#050505',
                fontSize: appFontSize(s, 18),
                fontWeight: '900',
                lineHeight: s(24),
                textAlign: 'center',
              }}
            >
              No transactions yet
            </Text>
            <Text
              selectable
              style={{
                color: '#aeb1b3',
                fontSize: appFontSize(s, 15),
                fontWeight: '700',
                lineHeight: s(22),
                marginTop: y(6),
                textAlign: 'center',
              }}
            >
              Top ups, reserves, payouts, and reversals will show here.
            </Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <WalletTransactionRow
              key={transaction.id}
              s={s}
              transaction={transaction}
              x={x}
              y={y}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function WalletTransactionRow({
  compact,
  s,
  transaction,
  x,
  y,
}: {
  compact?: boolean;
  s: (value: number) => number;
  transaction: WalletTransaction;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const isPositive =
    transaction.direction === 'credit' || transaction.direction === 'release';
  const iconColor = isPositive ? palette.greenDeep : '#050505';
  const statusColor = transactionStatusColor(transaction.status);

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: '#f0f1ee',
        borderBottomWidth: compact ? 0 : 1,
        flexDirection: 'row',
        minHeight: compact ? y(35) : y(66),
        paddingVertical: compact ? y(4) : y(10),
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: isPositive ? '#eef8e9' : '#f4f5f1',
          borderRadius: 999,
          height: compact ? s(28) : s(42),
          justifyContent: 'center',
          marginRight: x(11),
          width: compact ? s(28) : s(42),
        }}
      >
        {isPositive ? (
          <ArrowDown color={iconColor} size={compact ? s(15) : s(20)} strokeWidth={3} />
        ) : (
          <ArrowDown
            color={iconColor}
            size={compact ? s(15) : s(20)}
            strokeWidth={3}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          selectable
          numberOfLines={1}
          style={{
            color: '#050505',
            fontSize: compact ? s(14) : s(17),
            fontWeight: '900',
            letterSpacing: -0.2,
            lineHeight: compact ? s(18) : s(23),
          }}
        >
          {transaction.title}
        </Text>
        <Text
          selectable
          numberOfLines={1}
          style={{
            color: compact ? '#aeb1b3' : statusColor,
            fontSize: compact ? s(11) : s(13),
            fontWeight: compact ? '700' : '800',
            lineHeight: compact ? s(15) : s(18),
            marginTop: y(1),
          }}
        >
          {compact
            ? `${formatTransactionDate(transaction.createdAt)} · ${transaction.status}`
            : transaction.subtitle}
        </Text>
      </View>
      <Text
        selectable
        numberOfLines={1}
        style={{
          color: isPositive ? palette.greenDeep : '#050505',
          fontSize: compact ? s(14) : s(17),
          fontWeight: '900',
          letterSpacing: -0.25,
          marginLeft: x(8),
        }}
      >
        {transactionAmountPrefix(transaction)}
        {nairaSymbol}
        {formatNaira(transaction.amountNaira)}
      </Text>
    </View>
  );
}

function HomeSettingsPanel({
  email,
  onEditPayoutInfo,
  onLogout,
  onSwitchRole,
  role,
  s,
  x,
  y,
}: {
  email: string;
  onEditPayoutInfo: () => void;
  onLogout: () => void;
  onSwitchRole: () => void;
  role: AccountRole;
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const isCrewMate = role === 'crewmate';
  const initials = email
    ? email.split('@')[0].slice(0, 2).toUpperCase()
    : 'CP';

  return (
    <View
      style={{
        backgroundColor: '#f8f9f4',
        bottom: y(104),
        left: 0,
        paddingHorizontal: x(24),
        paddingTop: y(20),
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 4,
      }}
    >
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 28),
          fontWeight: '900',
          letterSpacing: -0.7,
          lineHeight: s(34),
          marginTop: y(52),
        }}
      >
        Settings
      </Text>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: s(24),
          marginTop: y(20),
          padding: s(20),
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row' }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.green,
              borderRadius: 999,
              height: s(56),
              justifyContent: 'center',
              marginRight: x(14),
              width: s(56),
            }}
          >
            <Text
              selectable
              style={{
                color: palette.ink,
                fontSize: appFontSize(s, 18),
                fontWeight: '900',
              }}
            >
              {initials}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              selectable
              numberOfLines={1}
              style={{
                color: '#050505',
                fontSize: appFontSize(s, 19),
                fontWeight: '900',
                letterSpacing: -0.25,
                lineHeight: s(24),
              }}
            >
              {isCrewMate ? 'CrewMate account' : 'CrewLead account'}
            </Text>
            <Text
              selectable
              numberOfLines={1}
              style={{
                color: '#a8aba5',
                fontSize: appFontSize(s, 14),
                fontWeight: '700',
                lineHeight: s(20),
                marginTop: y(2),
              }}
            >
              {email || 'Google account connected'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ gap: y(14), marginTop: y(22) }}>
        {isCrewMate ? (
          <SettingsRow
            description="Update your bank account for receiving payouts."
            icon={<CreditCard color="#050505" size={s(22)} strokeWidth={2.8} />}
            onPress={onEditPayoutInfo}
            s={s}
            title="Edit payout info"
            x={x}
            y={y}
          />
        ) : null}
        <SettingsRow
          description={`Switch to ${
            isCrewMate ? 'CrewLead' : 'CrewMate'
          } on this account.`}
          icon={<ArrowLeftRight color="#050505" size={s(22)} strokeWidth={2.8} />}
          onPress={onSwitchRole}
          s={s}
          title={`Use ${isCrewMate ? 'CrewLead' : 'CrewMate'} mode`}
          x={x}
          y={y}
        />
        <SettingsRow
          danger
          description="Sign out of this device and return to the welcome screen."
          icon={<X color="#b12a1c" size={s(23)} strokeWidth={3} />}
          onPress={onLogout}
          s={s}
          title="Log out"
          x={x}
          y={y}
        />
      </View>
    </View>
  );
}

function SettingsRow({
  danger = false,
  description,
  icon,
  onPress,
  s,
  title,
  x,
  y,
}: {
  danger?: boolean;
  description: string;
  icon: ReactNode;
  onPress?: () => void;
  s: (value: number) => number;
  title: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderColor: '#eef0ea',
        borderRadius: s(23),
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: y(82),
        opacity: pressed ? 0.68 : 1,
        paddingHorizontal: x(18),
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: danger ? '#fff4f1' : '#f5f6f2',
          borderRadius: 999,
          height: s(42),
          justifyContent: 'center',
          marginRight: x(14),
          width: s(42),
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          selectable
          style={{
            color: danger ? '#b12a1c' : '#050505',
            fontSize: appFontSize(s, 17),
            fontWeight: '900',
            letterSpacing: -0.2,
            lineHeight: s(22),
          }}
        >
          {title}
        </Text>
        <Text
          selectable
          numberOfLines={2}
          style={{
            color: '#9ca09a',
            fontSize: appFontSize(s, 13),
            fontWeight: '700',
            lineHeight: s(18),
            marginTop: y(3),
          }}
        >
          {description}
        </Text>
      </View>
      {onPress ? <ChevronRightIcon scale={s(1) * 0.52} /> : null}
    </Pressable>
  );
}

function EditBankScreen({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (v: number) => Math.round(v * widthScale);
  const y = (v: number) => Math.round(v * heightScale);
  const s = (v: number) => Math.round(v * scale);
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankQuery, setBankQuery] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [savingBankAccount, setSavingBankAccount] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyBankAccount()
      .then((record) => {
        if (record) {
          setBankName(record.bank_name);
          setBankCode(record.bank_code ?? '');
          setBankQuery(record.bank_name);
          setBankAccountNumber(record.account_number);
          setBankAccountName(record.account_name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSavingBankAccount(true);

    try {
      await saveBankAccount({
        accountName: bankAccountName,
        accountNumber: bankAccountNumber,
        bankCode,
        bankName,
      });
      onSaved();
    } catch (error) {
      Alert.alert('Could not save', getErrorMessage(error));
    } finally {
      setSavingBankAccount(false);
    }
  }, [bankAccountName, bankAccountNumber, bankCode, bankName, onSaved]);

  if (loading) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#ffffff',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={palette.greenDeep} size="large" />
      </View>
    );
  }

  return (
    <BankDetailsStep
      accountName={bankAccountName}
      accountNumber={bankAccountNumber}
      bankCode={bankCode}
      bankName={bankName}
      bankQuery={bankQuery}
      height={height}
      isSaving={savingBankAccount}
      onBack={onBack}
      onContinue={handleSave}
      s={s}
      scale={scale}
      setAccountName={setBankAccountName}
      setAccountNumber={setBankAccountNumber}
      setBankQuery={setBankQuery}
      setSelectedBank={(bank) => {
        setBankName(bank.name);
        setBankCode(bank.code);
      }}
      width={width}
      x={x}
      y={y}
    />
  );
}

function getWalletHealthColor(percent: number) {
  if (percent >= 75) {
    return '#2fcf69';
  }

  if (percent >= 40) {
    return '#79c865';
  }

  if (percent > 0) {
    return '#a9b29f';
  }

  return '#b9bbbd';
}

function AddMoneySheet({
  onCashDeposit,
  onClose,
  onTopUp,
  s,
  x,
  y,
}: {
  onCashDeposit: () => void;
  onClose: () => void;
  onTopUp: () => void;
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <Pressable
      onPress={onClose}
      style={{
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 30,
      }}
    >
      <BlurView
        intensity={46}
        tint="light"
        style={{
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: 'rgba(0,0,0,0.10)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <Pressable
        onPress={() => undefined}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: s(36),
          bottom: y(24),
          left: x(24),
          minHeight: y(414),
          paddingBottom: y(42),
          paddingHorizontal: x(42),
          paddingTop: y(54),
          position: 'absolute',
          right: x(24),
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
            padding: s(8),
            position: 'absolute',
            right: x(24),
            top: y(32),
          })}
        >
          <CloseMiniIcon color="#b8b8b8" scale={s(1)} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <ArrowDown color={palette.green} size={s(44)} strokeWidth={4.5} />
          <Text
            selectable
            style={{
              color: '#050505',
              fontSize: appFontSize(s, 26),
              fontWeight: '900',
              letterSpacing: -0.6,
              lineHeight: s(34),
              marginTop: y(21),
              textAlign: 'center',
            }}
          >
            Add money
          </Text>
          <Text
            selectable
            style={{
              color: '#b8babc',
              fontSize: appFontSize(s, 20),
              fontWeight: '700',
              lineHeight: s(26),
              marginTop: y(7),
              maxWidth: x(350),
              textAlign: 'center',
            }}
          >
            Choose one of the options below to fund your CrewPay wallet
          </Text>
        </View>
        <View style={{ gap: y(41), marginTop: y(58) }}>
          <AddMoneyOptionRow
            description="Add funds with cash deposit"
            icon="cash"
            onPress={onCashDeposit}
            s={s}
            title="Cash deposit"
          />
          <AddMoneyOptionRow
            description="Add funds from your bank card"
            icon="topup"
            onPress={onTopUp}
            s={s}
            title="Top up"
          />
        </View>
      </Pressable>
    </Pressable>
  );
}

function AddMoneyOptionRow({
  description,
  icon,
  onPress,
  s,
  title,
}: {
  description: string;
  icon: 'cash' | 'topup';
  onPress: () => void;
  s: (value: number) => number;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        opacity: pressed ? 0.62 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View
        style={{
          alignItems: 'center',
          height: s(48),
          justifyContent: 'center',
          marginRight: s(25),
          width: s(48),
        }}
      >
        {icon === 'cash' ? (
          <BankMiniIcon scale={s(1) * 0.9} />
        ) : (
          <NairaBadge size={s(44)} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          selectable
          style={{
            color: '#050505',
            fontSize: appFontSize(s, 23),
            fontWeight: '800',
            letterSpacing: -0.35,
            lineHeight: s(29),
          }}
        >
          {title}
        </Text>
        <Text
          selectable
          style={{
            color: '#b6b8ba',
            fontSize: appFontSize(s, 18),
            fontWeight: '700',
            lineHeight: s(24),
            marginTop: s(4),
          }}
        >
          {description}
        </Text>
      </View>
      <ChevronRightIcon scale={s(1) * 0.65} />
    </Pressable>
  );
}

function CreateTaskEmptyScreen({ onBack }: { onBack: () => void }) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#ffffff',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          left: x(25),
          position: 'absolute',
          top: y(88),
        }}
      >
        <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      </View>
      <Text
        selectable
        style={{
          color: 'rgba(5,5,5,0.5)',
          fontSize: appFontSize(s, 18),
          fontWeight: '500',
          letterSpacing: -0.35,
          lineHeight: s(25),
          textAlign: 'center',
        }}
      >
        No team has been created yet
      </Text>
      <Text
        selectable
        style={{
          color: 'rgba(5,5,5,0.35)',
          fontSize: appFontSize(s, 15),
          fontWeight: '400',
          lineHeight: s(22),
          marginTop: y(8),
          maxWidth: x(360),
          textAlign: 'center',
        }}
      >
        Create a team first, then you can start adding tasks for that crew.
      </Text>
    </View>
  );
}

function CreateTaskFlow({
  onBack,
  onComplete,
  teams,
}: {
  onBack: () => void;
  onComplete: (task: CreateTaskInput) => void | Promise<void>;
  teams: TeamDraft[];
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const selectableTeams = teams.filter(
    (team): team is TeamDraft & { id: string } =>
      typeof team.id === 'string' && team.id.length > 0,
  );
  const [step, setStep] = useState<TaskCreationStep>('basics');
  const [draft, setDraft] = useState<CreateTaskInput>({
    approvalMode: 'Manual approval',
    assignmentMode: 'team_claim',
    category: 'General task',
    description: '',
    dueAt: null,
    instructions: '',
    locationNote: '',
    locationType: 'remote',
    payoutAmountNaira: 0,
    peopleNeeded: 0,
    proofType: 'text',
    proofTypes: ['text'],
    successCriteria: '',
    teamIds: [],
    title: '',
  });
  const transition = useRef(new Animated.Value(1)).current;
  const transitionDirection = useRef(1);
  const [payoutDecidedLater, setPayoutDecidedLater] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const stepIndex = taskCreationSteps.indexOf(step);

  const updateDraft = useCallback((patch: Partial<CreateTaskInput>) => {
    setDraft((value) => ({ ...value, ...patch }));
  }, []);

  const goToStep = useCallback((nextStep: TaskCreationStep, direction = 1) => {
    transitionDirection.current = direction;
    setStep(nextStep);
  }, []);

  const goNext = useCallback(async () => {
    if (submitting) {
      return;
    }

    const nextStep = taskCreationSteps[stepIndex + 1];

    if (nextStep) {
      goToStep(nextStep, 1);
      return;
    }

    setSubmitting(true);

    try {
      await onComplete({
        ...draft,
        category: draft.category.trim(),
        description: draft.description.trim(),
        instructions: draft.instructions.trim(),
        locationNote: draft.locationNote.trim(),
        successCriteria: draft.successCriteria.trim(),
        payoutAmountNaira: payoutDecidedLater ? 0 : draft.payoutAmountNaira,
        peopleNeeded: Math.max(1, draft.peopleNeeded),
        proofType: draft.proofTypes[0] ?? 'text',
        title: draft.title.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }, [draft, goToStep, onComplete, payoutDecidedLater, stepIndex, submitting]);

  const goBack = useCallback(() => {
    const previousStep = taskCreationSteps[stepIndex - 1];

    if (previousStep) {
      goToStep(previousStep, -1);
      return;
    }

    onBack();
  }, [goToStep, onBack, stepIndex]);

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [step, transition]);

  const canContinue =
    step === 'basics'
      ? draft.title.trim().length >= 3 &&
        draft.description.trim().length >= 10
      : step === 'teams'
        ? draft.teamIds.length > 0
        : step === 'instructions'
          ? draft.instructions.trim().length >= 10 &&
            draft.successCriteria.trim().length >= 5
          : step === 'location'
            ? draft.locationType === 'remote' ||
              draft.locationNote.trim().length >= 3
            : step === 'payout'
              ? (payoutDecidedLater || draft.payoutAmountNaira > 0) &&
                draft.peopleNeeded > 0
              : step === 'proof'
                ? draft.proofTypes.length > 0
                : true;

  const animatedStyle = Platform.OS === 'web' ? {} : {
    opacity: transition,
    transform: [
      {
        translateX: transition.interpolate({
          inputRange: [0, 1],
          outputRange: [transitionDirection.current * 24, 0],
        }),
      },
    ],
  };

  const common = {
    height,
    s,
    scale,
    totalSteps: taskCreationSteps.length,
    width,
    x,
    y,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ backgroundColor: '#ffffff', flex: 1 }}
    >
      <StatusBar style="dark" />
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {step === 'basics' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Start with a clear job title and a short brief people will understand fast."
            title="What task do you need done?"
          >
            <TeamTextField
              label="Task title"
              onChangeText={(title) => updateDraft({ title })}
              placeholder="Pack 40 event gift bags"
              s={s}
              value={draft.title}
              x={x}
              y={y}
            />
            <TaskTextArea
              label="Short description"
              minLength={10}
              onChangeText={(description) => updateDraft({ description })}
              placeholder="Explain the task in one clean paragraph."
              s={s}
              value={draft.description}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}

        {step === 'teams' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Assign this task to one or more teams. Members will see it from their team."
            title="Which team is this task for?"
          >
            <TaskTeamSelector
              selectedTeamIds={draft.teamIds}
              setSelectedTeamIds={(teamIds) => updateDraft({ teamIds })}
              s={s}
              teams={selectableTeams}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}

        {step === 'instructions' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="This is where CrewPay becomes useful: clear instructions reduce disputes before payouts."
            title="How should the task be completed?"
          >
            <TaskTextArea
              label="Instructions"
              onChangeText={(instructions) => updateDraft({ instructions })}
              placeholder="List the exact steps the member should follow."
              s={s}
              value={draft.instructions}
              x={x}
              y={y}
            />
            <TaskTextArea
              label="What counts as done?"
              onChangeText={(successCriteria) =>
                updateDraft({ successCriteria })
              }
              placeholder="Describe the quality check before approval."
              s={s}
              value={draft.successCriteria}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}

        {step === 'location' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Remote tasks stay simple. Physical tasks need a meeting point or address."
            title="Where will this happen?"
          >
            <TaskValueOptionList
              options={taskLocationOptions}
              s={s}
              selected={draft.locationType}
              setSelected={(locationType) => updateDraft({ locationType })}
              x={x}
              y={y}
            />
            {draft.locationType !== 'remote' ? (
              <TeamTextField
                label="Location note"
                onChangeText={(locationNote) => updateDraft({ locationNote })}
                placeholder="Lekki Phase 1, Lagos"
                s={s}
                value={draft.locationNote}
                x={x}
                y={y}
              />
            ) : null}
          </TeamQuestionPage>
        ) : null}

        {step === 'payout' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Set the reward and how many people can complete the task."
            title="How much should this pay?"
          >
            <TaskNumberField
              label="Amount per person"
              onChangeNumber={(payoutAmountNaira) =>
                updateDraft({ payoutAmountNaira })
              }
              disabled={payoutDecidedLater}
              prefix="₦"
              s={s}
              value={draft.payoutAmountNaira}
              x={x}
              y={y}
            />
            <TaskCheckOption
              label="Decide payout per member in the team page"
              onToggle={() => setPayoutDecidedLater((value) => !value)}
              s={s}
              selected={payoutDecidedLater}
              x={x}
              y={y}
            />
            <TaskNumberField
              label="People needed"
              onChangeNumber={(peopleNeeded) =>
                updateDraft({ peopleNeeded })
              }
              s={s}
              value={draft.peopleNeeded}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}

        {step === 'proof' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Pick the proof needed before a task can move to payment approval."
            title="What proof should they submit?"
          >
            <TaskMultiValueOptionList
              options={taskProofOptions}
              s={s}
              selected={draft.proofTypes}
              setSelected={(proofTypes) =>
                updateDraft({
                  proofType: proofTypes[0] ?? 'text',
                  proofTypes,
                })
              }
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}

        {step === 'assignment' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Review task"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Choose how members get the task and how payment approval should behave."
            title="How should this task be assigned?"
          >
            <TaskValueOptionList
              options={taskAssignmentOptions}
              s={s}
              selected={draft.assignmentMode}
              setSelected={(assignmentMode) => updateDraft({ assignmentMode })}
              x={x}
              y={y}
            />
            <TeamOptionList
              options={taskApprovalOptions}
              s={s}
              selected={draft.approvalMode}
              setSelected={(approvalMode) => updateDraft({ approvalMode })}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}

        {step === 'review' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel={submitting ? 'Publishing task...' : 'Publish task'}
            canContinue={!submitting}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Review the task before it becomes available to the selected team."
            title="Ready to publish?"
          >
            <View style={{ gap: y(12), marginTop: y(30) }}>
              <TeamReviewRow label="Task" s={s} value={draft.title} />
              <TeamReviewRow
                label="Teams"
                s={s}
                value={`${draft.teamIds.length} selected`}
              />
              <TeamReviewRow
                label="Payout"
                s={s}
                value={`${
                  payoutDecidedLater
                    ? 'Decide per member'
                    : `₦${draft.payoutAmountNaira.toLocaleString()}`
                } • ${draft.peopleNeeded} people`}
              />
              <TeamReviewRow
                label="Proof"
                s={s}
                value={formatTaskProofs(draft.proofTypes)}
              />
              <TeamReviewRow
                label="Approval"
                s={s}
                value={draft.approvalMode}
              />
            </View>
          </TeamQuestionPage>
        ) : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function TaskTeamSelector({
  selectedTeamIds,
  setSelectedTeamIds,
  s,
  teams,
  x,
  y,
}: {
  selectedTeamIds: string[];
  setSelectedTeamIds: (teamIds: string[]) => void;
  s: (value: number) => number;
  teams: Array<TeamDraft & { id: string }>;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const allSelected = teams.length > 0 && selectedTeamIds.length === teams.length;

  const toggleAll = () => {
    setSelectedTeamIds(allSelected ? [] : teams.map((team) => team.id));
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(
      selectedTeamIds.includes(teamId)
        ? selectedTeamIds.filter((id) => id !== teamId)
        : [...selectedTeamIds, teamId],
    );
  };

  return (
    <View style={{ marginTop: y(36) }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: y(14),
        }}
      >
        <Text
          selectable
          style={{
            color: '#8c9188',
            fontSize: appFontSize(s, 15),
            fontWeight: '700',
            lineHeight: s(21),
          }}
        >
          {selectedTeamIds.length === 0
            ? 'No team selected'
            : `${selectedTeamIds.length} selected`}
        </Text>
        <Pressable accessibilityRole="button" onPress={toggleAll}>
          <Text
            selectable
            style={{
              color: selectedTeamIds.length > 0 ? palette.greenDeep : '#a8aca3',
              fontSize: appFontSize(s, 15),
              fontWeight: '900',
              lineHeight: s(21),
            }}
          >
            {selectedTeamIds.length > 0
              ? `${selectedTeamIds.length} selected`
              : 'Select all'}
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: y(12) }}>
        {teams.map((team) => {
          const selected = selectedTeamIds.includes(team.id);

          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={team.id}
              onPress={() => toggleTeam(team.id)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? '#f1fce9' : '#f7f8f4',
                borderColor: selected ? palette.greenDeep : '#eceee7',
                borderRadius: 999,
                borderWidth: selected ? 2 : 1,
                flexDirection: 'row',
                minHeight: y(82),
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: x(12),
                paddingVertical: y(10),
              })}
            >
              <TeamAvatar initials={getTeamInitials(team.name)} s={s} size={54} />
              <View style={{ flex: 1, marginLeft: x(14) }}>
                <Text
                  selectable
                  style={{
                    color: '#11130f',
                    fontSize: appFontSize(s, 18),
                    fontWeight: '800',
                    letterSpacing: -0.25,
                    lineHeight: s(24),
                  }}
                >
                  {team.name}
                </Text>
                <Text
                  selectable
                  style={{
                    color: '#8c9188',
                    fontSize: appFontSize(s, 14),
                    fontWeight: '500',
                    lineHeight: s(20),
                    marginTop: y(1),
                  }}
                >
                  1 member • 0 active tasks
                </Text>
              </View>
              <TaskCheckBox s={s} selected={selected} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TaskCheckBox({
  s,
  selected,
}: {
  s: (value: number) => number;
  selected: boolean;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: selected ? palette.green : '#ffffff',
        borderColor: selected ? palette.greenDeep : '#c9ccc4',
        borderRadius: s(9),
        borderWidth: selected ? 2 : 1.4,
        height: s(30),
        justifyContent: 'center',
        width: s(30),
      }}
    >
      {selected ? (
        <Check color="#11130f" size={s(18)} strokeWidth={3.2} />
      ) : null}
    </View>
  );
}

function TaskTextArea({
  label,
  minLength,
  onChangeText,
  placeholder,
  s,
  value,
  x,
  y,
}: {
  label: string;
  minLength?: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  s: (value: number) => number;
  value: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  const hasReachedMinimum = minLength ? value.trim().length >= minLength : true;

  return (
    <View style={{ marginTop: y(24) }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text
          selectable
          style={{
            color: palette.ink,
            flex: 1,
            fontSize: appFontSize(s, 18),
            fontWeight: '800',
            lineHeight: s(25),
          }}
        >
          {label}
        </Text>
        {minLength ? (
          <Text
            selectable
            style={{
              color: hasReachedMinimum ? palette.greenDeep : '#a8aca3',
              fontSize: appFontSize(s, 13),
              fontWeight: '800',
              lineHeight: s(18),
              marginLeft: x(12),
            }}
          >
            {value.trim().length}/{minLength}
          </Text>
        ) : null}
      </View>
      <TextInput
        multiline
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor="#aeb1a8"
        style={{
          borderColor: active ? palette.greenDeep : '#a3a49f',
          borderRadius: s(14),
          borderWidth: active ? 2.2 : 1.25,
          color: palette.ink,
          fontSize: appFontSize(s, 19),
          fontWeight: '400',
          lineHeight: s(26),
          marginTop: y(8),
          minHeight: y(112),
          paddingHorizontal: x(18),
          paddingTop: y(14),
          textAlignVertical: 'top',
        }}
        value={value}
      />
    </View>
  );
}

function TaskNumberField({
  disabled = false,
  label,
  onChangeNumber,
  prefix = '',
  s,
  value,
  x,
  y,
}: {
  disabled?: boolean;
  label: string;
  onChangeNumber: (value: number) => void;
  prefix?: string;
  s: (value: number) => number;
  value: number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View style={{ marginTop: y(34) }}>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 18),
          fontWeight: '800',
          lineHeight: s(25),
        }}
      >
        {label}
      </Text>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: disabled ? '#f5f6f2' : '#ffffff',
          borderColor: value > 0 && !disabled ? palette.greenDeep : '#a3a49f',
          borderRadius: s(12),
          borderWidth: value > 0 ? 2.2 : 1.25,
          flexDirection: 'row',
          height: y(66),
          marginTop: y(8),
          paddingHorizontal: x(18),
        }}
      >
        {prefix ? (
          <Text
            selectable
            style={{
              color: palette.ink,
              fontSize: appFontSize(s, 22),
              fontWeight: '800',
              marginRight: x(4),
            }}
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          keyboardType="number-pad"
          editable={!disabled}
          onChangeText={(text) => {
            const numericValue = Number(text.replace(/[^\d]/g, ''));
            onChangeNumber(Number.isFinite(numericValue) ? numericValue : 0);
          }}
          placeholder="0"
          placeholderTextColor="#aeb1a8"
          style={{
            color: palette.ink,
            flex: 1,
            fontSize: appFontSize(s, 22),
            fontWeight: '400',
          }}
          value={disabled ? '' : value > 0 ? String(value) : ''}
        />
      </View>
    </View>
  );
}

function TaskCheckOption({
  label,
  onToggle,
  s,
  selected,
  x,
  y,
}: {
  label: string;
  onToggle: () => void;
  s: (value: number) => number;
  selected: boolean;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onToggle}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: y(14),
        opacity: pressed ? 0.7 : 1,
        paddingVertical: y(8),
      })}
    >
      <TaskCheckBox s={s} selected={selected} />
      <Text
        selectable
        style={{
          color: selected ? palette.greenDeep : '#777b73',
          flex: 1,
          fontSize: appFontSize(s, 15),
          fontWeight: '700',
          lineHeight: s(21),
          marginLeft: x(12),
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TaskValueOptionList<TValue extends string>({
  options,
  s,
  selected,
  setSelected,
  x,
  y,
}: {
  options: Array<{ label: string; value: TValue }>;
  s: (value: number) => number;
  selected: TValue;
  setSelected: (value: TValue) => void;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View style={{ gap: y(12), marginTop: y(36) }}>
      {options.map((option) => (
        <Pressable
          accessibilityRole="button"
          key={option.value}
          onPress={() => setSelected(option.value)}
          style={({ pressed }) => {
            const isSelected = selected === option.value;

            return {
              alignItems: 'center',
              backgroundColor: isSelected ? '#f1fce9' : '#ffffff',
              borderColor: isSelected ? palette.greenDeep : '#d4d6d0',
              borderRadius: s(18),
              borderWidth: isSelected ? 2 : 1.2,
              flexDirection: 'row',
              minHeight: y(64),
              opacity: pressed ? 0.72 : 1,
              paddingHorizontal: x(18),
            };
          }}
        >
          <View
            style={{
              alignItems: 'center',
              borderColor:
                selected === option.value ? palette.greenDeep : '#b7bab2',
              borderRadius: 999,
              borderWidth: 1.6,
              height: s(22),
              justifyContent: 'center',
              marginRight: x(14),
              width: s(22),
            }}
          >
            {selected === option.value ? (
              <View
                style={{
                  backgroundColor: palette.greenDeep,
                  borderRadius: 999,
                  height: s(10),
                  width: s(10),
                }}
              />
            ) : null}
          </View>
          <Text
            selectable
            style={{
              color: '#10110f',
              fontSize: appFontSize(s, 18),
              fontWeight: selected === option.value ? '800' : '600',
              letterSpacing: -0.18,
              lineHeight: s(24),
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TaskMultiValueOptionList<TValue extends string>({
  options,
  s,
  selected,
  setSelected,
  x,
  y,
}: {
  options: Array<{ label: string; value: TValue }>;
  s: (value: number) => number;
  selected: TValue[];
  setSelected: (value: TValue[]) => void;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const toggleValue = (value: TValue) => {
    if (value === 'none') {
      setSelected(selected.includes(value) ? [] : [value]);
      return;
    }

    const withoutNone = selected.filter((item) => item !== 'none');

    setSelected(
      withoutNone.includes(value)
        ? withoutNone.filter((item) => item !== value)
        : [...withoutNone, value],
    );
  };

  return (
    <View style={{ gap: y(12), marginTop: y(36) }}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);

        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            key={option.value}
            onPress={() => toggleValue(option.value)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: isSelected ? '#f1fce9' : '#ffffff',
              borderColor: isSelected ? palette.greenDeep : '#d4d6d0',
              borderRadius: s(18),
              borderWidth: isSelected ? 2 : 1.2,
              flexDirection: 'row',
              minHeight: y(64),
              opacity: pressed ? 0.72 : 1,
              paddingHorizontal: x(18),
            })}
          >
            <TaskCheckBox s={s} selected={isSelected} />
            <Text
              selectable
              style={{
                color: '#10110f',
                fontSize: appFontSize(s, 18),
                fontWeight: isSelected ? '800' : '600',
                letterSpacing: -0.18,
                lineHeight: s(24),
                marginLeft: x(14),
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatTaskProof(proofType: CreateTaskInput['proofType']) {
  return (
    taskProofOptions.find((option) => option.value === proofType)?.label ??
    'Text confirmation'
  );
}

function formatTaskProofs(proofTypes: CreateTaskInput['proofTypes']) {
  if (proofTypes.length === 0) {
    return 'No proof selected';
  }

  return proofTypes.map(formatTaskProof).join(', ');
}

function formatTaskAssignmentMode(mode: CreateTaskInput['assignmentMode']) {
  return (
    taskAssignmentOptions.find((option) => option.value === mode)?.label ??
    'Anyone in team can claim'
  );
}

function formatTaskLocationType(type: CreateTaskInput['locationType']) {
  return (
    taskLocationOptions.find((option) => option.value === type)?.label ??
    'Remote'
  );
}

function ViewTeamsScreen({
  initialTeamId,
  membersByTeamId,
  mySubmissions,
  onBack,
  onJoinTeam,
  onInitialTeamOpened,
  onRefreshMembers,
  onRefreshMySubmissions,
  onRefreshTasks,
  onRefreshTeamSubmissions,
  onSubmitTask,
  onTeamUpdated,
  role,
  tasks,
  teamSubmissionsByTeamId,
  teams,
}: {
  initialTeamId?: string;
  membersByTeamId: Record<string, TeamMemberListItem[]>;
  mySubmissions: MyTaskSubmission[];
  onBack: () => void;
  onJoinTeam: () => void;
  onInitialTeamOpened?: () => void;
  onRefreshMembers: (teamId?: string) => void;
  onRefreshMySubmissions: () => void;
  onRefreshTasks: () => void;
  onRefreshTeamSubmissions: (teamId?: string) => void;
  onSubmitTask: (task: TaskWithTeams, team: TeamDraft) => void;
  onTeamUpdated: (team: TeamDraft) => void;
  role: AccountRole;
  tasks: TaskWithTeams[];
  teamSubmissionsByTeamId: Record<string, TeamTaskSubmission[]>;
  teams: TeamDraft[];
}) {
  const [selectedTeam, setSelectedTeam] = useState<TeamDraft | null>(null);

  useEffect(() => {
    if (!initialTeamId) {
      return;
    }

    const teamToOpen = teams.find((team) => team.id === initialTeamId);

    if (!teamToOpen) {
      return;
    }

    setSelectedTeam(teamToOpen);
    onInitialTeamOpened?.();
  }, [initialTeamId, onInitialTeamOpened, teams]);

  useEffect(() => {
    if (
      selectedTeam &&
      selectedTeam.id &&
      !teams.some((team) => team.id === selectedTeam.id)
    ) {
      setSelectedTeam(null);
    }
  }, [selectedTeam, teams]);

  useEffect(() => {
    if (!selectedTeam?.id) {
      return;
    }

    onRefreshMembers(selectedTeam.id);
    if (role === 'crewlead') {
      onRefreshTeamSubmissions(selectedTeam.id);
      return;
    }

    onRefreshMySubmissions();
  }, [
    onRefreshMembers,
    onRefreshMySubmissions,
    onRefreshTeamSubmissions,
    role,
    selectedTeam?.id,
  ]);

  if (teams.length === 0) {
    const isCrewMate = role === 'crewmate';

    return (
      <TeamEmptyStateScreen
        actionLabel={isCrewMate ? 'Join a team' : undefined}
        body={
          isCrewMate
            ? 'Use an invite code from a CrewLead. Once you join, your crew and assigned work will appear here.'
            : 'Create a team first, then you will be able to view members, task rules, and team activity here.'
        }
        onAction={isCrewMate ? onJoinTeam : undefined}
        onBack={onBack}
        title={isCrewMate ? 'You have not joined a team yet' : 'No team has been created yet'}
      />
    );
  }

  if (selectedTeam) {
    const selectedTeamMembers = selectedTeam.id
      ? membersByTeamId[selectedTeam.id] ?? []
      : [];
    const selectedTeamSubmissions = selectedTeam.id
      ? teamSubmissionsByTeamId[selectedTeam.id] ?? []
      : [];

    return (
      <TeamDetailScreen
        onBack={() => setSelectedTeam(null)}
        members={selectedTeamMembers}
        mySubmissions={mySubmissions}
        onRefreshMembers={onRefreshMembers}
        onRefreshMySubmissions={onRefreshMySubmissions}
        onRefreshTeamSubmissions={onRefreshTeamSubmissions}
        onSubmitTask={onSubmitTask}
        onTeamUpdated={(team) => {
          setSelectedTeam(team);
          onTeamUpdated(team);
        }}
        role={role}
        tasks={getTasksForTeam(tasks, selectedTeam.id)}
        team={selectedTeam}
        teamSubmissions={selectedTeamSubmissions}
      />
    );
  }

  return (
      <TeamListScreen
        onBack={onBack}
        onOpenTeam={(team) => {
          setSelectedTeam(team);
          onRefreshMembers(team.id);
          onRefreshTasks();
          if (role === 'crewlead') {
            onRefreshTeamSubmissions(team.id);
          } else {
            onRefreshMySubmissions();
          }
        }}
        teams={teams}
      />
  );
}

function TeamEmptyStateScreen({
  actionLabel,
  body,
  onAction,
  onBack,
  title,
}: {
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  onBack: () => void;
  title: string;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#ffffff',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: x(42),
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          left: x(25),
          position: 'absolute',
          top: y(88),
        }}
      >
        <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      </View>
      <Text
        selectable
        style={{
          color: 'rgba(5,5,5,0.5)',
          fontSize: appFontSize(s, 18),
          fontWeight: '500',
          letterSpacing: -0.35,
          lineHeight: s(25),
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: 'rgba(5,5,5,0.35)',
          fontSize: appFontSize(s, 15),
          fontWeight: '400',
          lineHeight: s(22),
          marginTop: y(8),
          textAlign: 'center',
        }}
      >
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: palette.green,
            borderRadius: 999,
            height: s(54),
            justifyContent: 'center',
            marginTop: y(24),
            opacity: pressed ? 0.82 : 1,
            paddingHorizontal: x(28),
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text
            selectable
            style={{
              color: palette.ink,
              fontSize: appFontSize(s, 17),
              fontWeight: '900',
              letterSpacing: -0.15,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TeamListScreen({
  onBack,
  onOpenTeam,
  teams,
}: {
  onBack: () => void;
  onOpenTeam: (team: TeamDraft) => void;
  teams: TeamDraft[];
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 46),
          fontWeight: '900',
          letterSpacing: -1.5,
          lineHeight: s(52),
          marginTop: y(58),
        }}
      >
        Teams
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 22),
          fontWeight: '400',
          lineHeight: s(31),
          marginTop: y(12),
        }}
      >
        View your teams, members, task rules, and activity.
      </Text>
      <ScrollView
        contentContainerStyle={{
          gap: y(14),
          paddingBottom: y(42),
          paddingTop: y(48),
        }}
        showsVerticalScrollIndicator={false}
      >
        {teams.map((team, index) => (
      <Pressable
        accessibilityRole="button"
        key={team.id || `${team.name}-${index}`}
        onPress={() => onOpenTeam(team)}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: '#f7f8f4',
          borderRadius: 999,
          flexDirection: 'row',
          minHeight: y(82),
          opacity: pressed ? 0.78 : 1,
          paddingHorizontal: x(12),
          paddingVertical: y(10),
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <TeamAvatar initials={getTeamInitials(team.name)} s={s} size={58} />
        <View style={{ flex: 1, marginLeft: x(16) }}>
          <Text
            selectable
            style={{
              color: '#050505',
              fontSize: appFontSize(s, 21),
              fontWeight: '800',
              letterSpacing: -0.35,
              lineHeight: s(27),
            }}
          >
            {team.name}
          </Text>
          <Text
            selectable
            style={{
              color: '#8d9188',
              fontSize: appFontSize(s, 15),
              fontWeight: '500',
              lineHeight: s(22),
              marginTop: y(2),
            }}
          >
            {team.category} • {team.location}
          </Text>
        </View>
        <ChevronRightIcon scale={scale * 0.7} />
      </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function TeamDetailScreen({
  members,
  mySubmissions,
  onBack,
  onRefreshMembers,
  onRefreshMySubmissions,
  onRefreshTeamSubmissions,
  onSubmitTask,
  onTeamUpdated,
  role,
  tasks,
  team,
  teamSubmissions,
}: {
  members: TeamMemberListItem[];
  mySubmissions: MyTaskSubmission[];
  onBack: () => void;
  onRefreshMembers: (teamId?: string) => void;
  onRefreshMySubmissions: () => void;
  onRefreshTeamSubmissions: (teamId?: string) => void;
  onSubmitTask: (task: TaskWithTeams, team: TeamDraft) => void;
  onTeamUpdated: (team: TeamDraft) => void;
  role: AccountRole;
  tasks: TaskWithTeams[];
  team: TeamDraft;
  teamSubmissions: TeamTaskSubmission[];
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<{
    status: Extract<TaskSubmissionRecord['status'], 'approved' | 'rejected'>;
    submission: TeamTaskSubmission;
  } | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] =
    useState<TeamMemberDetail | null>(null);
  const [payoutQueueOpen, setPayoutQueueOpen] = useState(false);
  const [payoutQueueLoading, setPayoutQueueLoading] = useState(false);
  const [payoutQueueItems, setPayoutQueueItems] = useState<PayoutQueueItem[]>([]);
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const scrollY = useRef(new Animated.Value(0)).current;
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const initials = getTeamInitials(team.name);
  const activeTaskCount = tasks.filter((task) => task.status === 'published').length;
  const isCrewMate = role === 'crewmate';
  const memberCount = Math.max(members.length, 1);
  const pendingReviewCount = teamSubmissions.filter(
    (submission) => submission.status === 'submitted',
  ).length;
  const payoutReadyTotal = payoutQueueItems.reduce(
    (total, item) =>
      item.status === 'pending' ? total + Number(item.amount_naira || 0) : total,
    0,
  );
  const heroTop = 0;
  const heroHeight = Math.min(y(820), height * 0.72);
  const sheetOverlap = y(42);
  const sheetTop = heroTop + heroHeight - sheetOverlap;
  const sheetStopTop = y(178);
  const sheetInitialOffset = Math.max(0, sheetTop - sheetStopTop);

  const shareTeam = useCallback(async () => {
    if (!team.id) {
      Alert.alert('Team is still syncing', 'Please try sharing again in a moment.');
      return;
    }

    try {
      const invite = await createTeamInvite(
        team.id,
        team.joinRule === 'Invite only' ? 'auto_join' : 'request',
      );
      await Share.share({
        message: `Join ${team.name} on CrewPay with this invite code:\n\n${invite.token}`,
        title: `Join ${team.name}`,
      });
    } catch (error) {
      Alert.alert(
        'Could not create invite',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, [team.id, team.joinRule, team.name]);

  const loadPayoutQueue = useCallback(async () => {
    if (!team.id || isCrewMate) {
      return;
    }

    setPayoutQueueLoading(true);

    try {
      const queue = await listTeamPayoutQueue(team.id);
      setPayoutQueueItems(queue);
    } catch (error) {
      Alert.alert(
        'Could not load payouts',
        error instanceof Error ? error.message : 'Please try again.',
      );
      setPayoutQueueItems([]);
    } finally {
      setPayoutQueueLoading(false);
    }
  }, [isCrewMate, team.id]);

  useEffect(() => {
    if (!team.id || isCrewMate) {
      return;
    }

    loadPayoutQueue();
  }, [isCrewMate, loadPayoutQueue, team.id, teamSubmissions.length]);

  const openMemberActions = useCallback(
    async (member: TeamMemberListItem) => {
      const joinedAt = member.joined_at
        ? formatRequestTime(member.joined_at)
        : 'recently';
      const roleLabel = formatTeamMemberRole(member.member_role);

      if (isCrewMate) {
        Alert.alert(
          member.member_name,
          `${roleLabel}\nJoined ${joinedAt}\nActive in ${team.name}`,
        );
        return;
      }

      if (!team.id) {
        Alert.alert(
          member.member_name,
          `${roleLabel}\nJoined ${joinedAt}\nMember details will be available after this team finishes syncing.`,
        );
        return;
      }

      setSelectedMemberDetail(null);
      setMemberDetailOpen(true);
      setMemberDetailLoading(true);

      try {
        const detail = await getTeamMemberDetail(team.id, member.profile_id);
        setSelectedMemberDetail(detail);
      } catch (error) {
        Alert.alert(
          'Could not load member',
          error instanceof Error ? error.message : 'Please try again.',
        );
        setMemberDetailOpen(false);
      } finally {
        setMemberDetailLoading(false);
      }
    },
    [isCrewMate, team.name],
  );

  const changeSelectedMemberRole = useCallback(
    async (nextRole: 'admin' | 'member') => {
      if (!team.id || !selectedMemberDetail) {
        return;
      }

      await updateTeamMemberRole(
        team.id,
        selectedMemberDetail.profile_id,
        nextRole,
      );
      const detail = await getTeamMemberDetail(
        team.id,
        selectedMemberDetail.profile_id,
      );
      setSelectedMemberDetail(detail);
      await onRefreshMembers(team.id);
    },
    [onRefreshMembers, selectedMemberDetail, team.id],
  );

  const removeSelectedMember = useCallback(async () => {
    if (!team.id || !selectedMemberDetail) {
      return;
    }

    await removeTeamMember(team.id, selectedMemberDetail.profile_id);
    setMemberDetailOpen(false);
    setSelectedMemberDetail(null);
    await onRefreshMembers(team.id);
  }, [onRefreshMembers, selectedMemberDetail, team.id]);

  const updateQueueAmount = useCallback(
    async (approvalId: string, amountNaira: number) => {
      await updatePayoutApprovalAmount(approvalId, amountNaira);
      await loadPayoutQueue();
    },
    [loadPayoutQueue],
  );

  const reserveQueueItems = useCallback(
    async (approvalIds: string[]) => {
      if (!team.id) {
        return;
      }

      const batch = await reservePayoutApprovals(team.id, approvalIds);
      await loadPayoutQueue();
      await onRefreshTeamSubmissions(team.id);
      Alert.alert(
        'Payouts reserved',
        `${batch.item_count} payout${batch.item_count === 1 ? '' : 's'} worth ₦${Number(
          batch.total_amount_naira || 0,
        ).toLocaleString()} are locked for the next payment step.`,
      );
    },
    [loadPayoutQueue, onRefreshTeamSubmissions, team.id],
  );

  const openSubmissionAsset = useCallback(
    async (asset: SubmissionAsset) => {
      try {
        if (
          asset.kind === 'location' &&
          typeof asset.latitude === 'number' &&
          typeof asset.longitude === 'number'
        ) {
          await Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${asset.latitude},${asset.longitude}`,
          );
          return;
        }

        const signedUrl = await getSubmissionAssetUrl(asset.path);
        await Linking.openURL(signedUrl);
      } catch (error) {
        Alert.alert(
          'Could not open proof',
          error instanceof Error ? error.message : 'Please try again.',
        );
      }
    },
    [],
  );

  const handleReviewSubmission = useCallback(
    (
      submission: TeamTaskSubmission,
      status: Extract<TaskSubmissionRecord['status'], 'approved' | 'rejected'>,
    ) => {
      setReviewDraft({ status, submission });
    },
    [],
  );

  const submitReviewDecision = useCallback(
    async (reviewNote: string) => {
      if (!reviewDraft) {
        return;
      }

      setReviewSubmitting(true);

      try {
        await reviewTaskSubmission(
          reviewDraft.submission.id,
          reviewDraft.status,
          reviewNote,
        );
        await onRefreshTeamSubmissions(team.id);
        await onRefreshMySubmissions();
        await loadPayoutQueue();
        setReviewDraft(null);
      } catch (error) {
        Alert.alert(
          'Could not review submission',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setReviewSubmitting(false);
      }
    },
    [
      loadPayoutQueue,
      onRefreshMySubmissions,
      onRefreshTeamSubmissions,
      reviewDraft,
      team.id,
    ],
  );

  if (settingsOpen) {
    return (
      <TeamSettingsScreen
        onBack={() => setSettingsOpen(false)}
        onTeamUpdated={onTeamUpdated}
        role={role}
        team={team}
      />
    );
  }

  return (
    <View style={{ backgroundColor: '#f6f7ef', flex: 1 }}>
      <StatusBar style="dark" />
      <View
        style={{
          backgroundColor: palette.green,
          height: heroHeight,
          left: 0,
          overflow: 'hidden',
          position: 'absolute',
          right: 0,
          top: heroTop,
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.32)',
            borderRadius: 999,
            height: s(280),
            position: 'absolute',
            right: x(-86),
            top: y(64),
            width: s(280),
          }}
        />
        <View
          style={{
            backgroundColor: 'rgba(20,21,16,0.08)',
            borderRadius: 999,
            bottom: y(72),
            height: s(220),
            left: x(-70),
            position: 'absolute',
            width: s(220),
          }}
        />
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <TeamAvatar initials={initials} s={s} size={182} variant="hero" />
          <Text
            selectable
            style={{
              color: 'rgba(20,21,16,0.42)',
              fontSize: appFontSize(s, 16),
              fontWeight: '700',
              letterSpacing: 1.6,
              marginTop: y(22),
              textTransform: 'uppercase',
            }}
          >
            Team identity
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        hitSlop={s(14)}
        onPress={onBack}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.72)',
          borderRadius: 999,
          elevation: 8,
          height: s(58),
          justifyContent: 'center',
          left: x(34),
          opacity: pressed ? 0.58 : 1,
          position: 'absolute',
          top: y(112),
          width: s(58),
          zIndex: 4,
        })}
      >
        <ArrowLeftIcon scale={scale * 0.85} />
      </Pressable>

      <Pressable
        accessibilityLabel="Open team settings"
        accessibilityRole="button"
        hitSlop={s(14)}
        onPress={() => setSettingsOpen(true)}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.72)',
          borderRadius: 999,
          elevation: 8,
          height: s(58),
          justifyContent: 'center',
          opacity: pressed ? 0.58 : 1,
          position: 'absolute',
          right: x(34),
          top: y(112),
          width: s(58),
          zIndex: 4,
        })}
      >
        <Settings color="#11130f" size={s(26)} strokeWidth={2.4} />
      </Pressable>

      <Animated.ScrollView
        bounces
        contentContainerStyle={{
          minHeight: height - sheetStopTop + sheetInitialOffset,
          paddingTop: sheetInitialOffset,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        style={{
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: sheetStopTop,
          zIndex: 2,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: s(28),
            borderTopRightRadius: s(28),
            minHeight: height - sheetStopTop,
            paddingBottom: y(80),
            paddingHorizontal: x(31),
            paddingTop: y(58),
            position: 'relative',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              left: x(22),
              position: 'absolute',
              right: x(22),
              top: -y(24),
              zIndex: 3,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#f0f1eb',
                borderRadius: 999,
                minHeight: y(45),
                paddingHorizontal: x(20),
              }}
            >
              <Text
                selectable
                style={{
                  color: '#050505',
                  fontSize: appFontSize(s, 18),
                  fontWeight: '900',
                  letterSpacing: -0.2,
                  lineHeight: y(45),
                }}
              >
                ACTIVE
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              hitSlop={s(10)}
              onPress={shareTeam}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: '#efeee8',
                borderRadius: 999,
                height: s(60),
                justifyContent: 'center',
                opacity: pressed ? 0.58 : 1,
                width: s(60),
              })}
            >
              <ShareIcon scale={scale * 0.9} />
            </Pressable>
          </View>
          <Text
            selectable
            style={{
              color: '#050505',
              fontSize: appFontSize(s, 48),
              fontWeight: '900',
              letterSpacing: -1.85,
              lineHeight: s(56),
              marginTop: 0,
            }}
          >
            {team.name}
          </Text>
          <Text
            selectable
            style={{
              color: '#666a62',
              fontSize: appFontSize(s, 20),
              fontWeight: '400',
              letterSpacing: -0.22,
              lineHeight: s(29),
              marginTop: y(10),
            }}
          >
            {team.category} • {team.location}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: x(10),
              marginTop: y(28),
            }}
          >
            <TeamDetailMetric label="Members" s={s} value={String(memberCount)} />
            <TeamDetailMetric
              label="Active tasks"
              s={s}
              value={String(activeTaskCount)}
            />
            <TeamDetailMetric
              label="Pending reviews"
              s={s}
              value={String(isCrewMate ? 0 : pendingReviewCount)}
            />
          </View>

          <TeamDetailSection
            action={isCrewMate ? undefined : 'Invite'}
            icon={<Users color="#11130f" size={s(19)} strokeWidth={2.4} />}
            onAction={isCrewMate ? undefined : shareTeam}
            s={s}
            title={`Team members (${memberCount})`}
            y={y}
          >
            {members.length > 0 ? (
              <View style={{ gap: y(10), marginTop: y(16) }}>
                {members.map((member) => (
                  <TeamMemberPill
                    key={member.member_id}
                    member={member}
                    onPress={() => openMemberActions(member)}
                    s={s}
                    x={x}
                    y={y}
                  />
                ))}
              </View>
            ) : (
              <TeamDetailEmptyLine
                body={isCrewMate ? 'Your team members are still syncing.' : 'Members will appear here once they join or are approved.'}
                s={s}
                title={isCrewMate ? 'Team is loading' : 'No members yet'}
                y={y}
              />
            )}
          </TeamDetailSection>

          {isCrewMate ? (
            <TeamDetailSection
              icon={<Upload color="#11130f" size={s(19)} strokeWidth={2.4} />}
              s={s}
              title="Submissions"
              y={y}
            >
              {tasks.length > 0 ? (
                <View style={{ gap: y(10), marginTop: y(16) }}>
                  {tasks.map((task) => {
                    const taskSubmissions = mySubmissions.filter(
                      (submission) =>
                        submission.task_id === task.id &&
                        submission.team_id === team.id,
                    );
                    const hasBlockingSubmission = taskSubmissions.some(
                      (submission) =>
                        submission.status === 'submitted' ||
                        submission.status === 'approved' ||
                        submission.status === 'paid',
                    );

                    return (
                      <SubmissionTaskCard
                        key={task.id}
                        onSubmit={() => {
                          if (hasBlockingSubmission) {
                            Alert.alert(
                              taskSubmissions.some(
                                (submission) =>
                                  submission.status === 'approved' ||
                                  submission.status === 'paid',
                              )
                                ? 'Task already approved'
                                : 'Submission pending',
                              taskSubmissions.some(
                                (submission) =>
                                  submission.status === 'approved' ||
                                  submission.status === 'paid',
                              )
                                ? 'This task has already been approved for you.'
                                : 'Wait for the CrewLead to approve or reject your current submission before sending another one.',
                            );
                            return;
                          }

                          onSubmitTask(task, team);
                        }}
                        s={s}
                        submissions={taskSubmissions}
                        task={task}
                        y={y}
                      />
                    );
                  })}
                </View>
              ) : (
                <TeamDetailEmptyLine
                  body="When the CrewLead assigns work to this team, each task will appear here with the required submission method."
                  s={s}
                  title="No submissions needed yet"
                  y={y}
                />
              )}
            </TeamDetailSection>
          ) : (
            <>
              <TeamDetailSection
                icon={<CreditCard color="#11130f" size={s(19)} strokeWidth={2.4} />}
                s={s}
                title="Assigned tasks"
                y={y}
              >
                {tasks.length > 0 ? (
                  <View style={{ gap: y(10), marginTop: y(16) }}>
                    {tasks.slice(0, 3).map((task) => (
                      <TaskSummaryRow key={task.id} s={s} task={task} y={y} />
                    ))}
                  </View>
                ) : (
                  <TeamDetailEmptyLine
                    body="Tasks assigned to this team will show here after publishing."
                    s={s}
                    title="No assigned tasks yet"
                    y={y}
                  />
                )}
              </TeamDetailSection>
              <TeamDetailSection
                icon={<ClipboardCheck color="#11130f" size={s(19)} strokeWidth={2.4} />}
                s={s}
                title="Submitted work"
                y={y}
              >
                {teamSubmissions.length > 0 ? (
                  <View style={{ gap: y(10), marginTop: y(16) }}>
                    {teamSubmissions.map((submission) => (
                      <TeamSubmissionReviewCard
                        key={submission.id}
                        onOpenAsset={openSubmissionAsset}
                        onReview={handleReviewSubmission}
                        s={s}
                        submission={submission}
                        y={y}
                      />
                    ))}
                  </View>
                ) : (
                  <TeamDetailEmptyLine
                    body="CrewMate proof will appear here as soon as someone submits work."
                    s={s}
                    title="No submitted work yet"
                    y={y}
                  />
                )}
              </TeamDetailSection>
              <TeamDetailSection
                icon={<CreditCard color="#11130f" size={s(19)} strokeWidth={2.4} />}
                s={s}
                title="Payout queue"
                y={y}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPayoutQueueOpen(true);
                    loadPayoutQueue();
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: '#fbfcf8',
                    borderColor: '#eceee7',
                    borderRadius: s(18),
                    borderWidth: 1,
                    marginTop: y(16),
                    opacity: pressed ? 0.68 : 1,
                    padding: s(16),
                  })}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        selectable
                        style={{
                          color: '#11130f',
                          fontSize: appFontSize(s, 18),
                          fontWeight: '900',
                          letterSpacing: -0.25,
                          lineHeight: s(24),
                        }}
                      >
                        ₦{Number(payoutReadyTotal || 0).toLocaleString()} ready
                      </Text>
                      <Text
                        selectable
                        style={{
                          color: '#747a70',
                          fontSize: appFontSize(s, 14),
                          fontWeight: '500',
                          lineHeight: s(20),
                          marginTop: y(4),
                        }}
                      >
                        {payoutQueueItems.length === 0
                          ? 'Approved submissions will appear here before payment.'
                          : `${payoutQueueItems.length} approved item${
                              payoutQueueItems.length === 1 ? '' : 's'
                            } awaiting payout action.`}
                      </Text>
                    </View>
                    <ChevronRightIcon scale={scale * 0.62} />
                  </View>
                </Pressable>
              </TeamDetailSection>
            </>
          )}

        </View>
      </Animated.ScrollView>
      <SubmissionReviewSheet
        decision={reviewDraft?.status ?? null}
        isSubmitting={reviewSubmitting}
        memberName={reviewDraft?.submission.member_name ?? ''}
        onClose={() => {
          if (!reviewSubmitting) {
            setReviewDraft(null);
          }
        }}
        onSubmit={submitReviewDecision}
        taskTitle={reviewDraft?.submission.task_title ?? ''}
        visible={Boolean(reviewDraft)}
      />
      <MemberDetailSheet
        canManage={!isCrewMate}
        detail={selectedMemberDetail}
        isLoading={memberDetailLoading}
        onClose={() => {
          setMemberDetailOpen(false);
          setSelectedMemberDetail(null);
        }}
        onRemove={removeSelectedMember}
        onRoleChange={changeSelectedMemberRole}
        visible={memberDetailOpen}
      />
      <PayoutQueueSheet
        isLoading={payoutQueueLoading}
        items={payoutQueueItems}
        onClose={() => setPayoutQueueOpen(false)}
        onRefresh={loadPayoutQueue}
        onReserve={reserveQueueItems}
        onUpdateAmount={updateQueueAmount}
        visible={payoutQueueOpen}
      />
    </View>
  );
}

function TeamAvatar({
  initials,
  s,
  size,
  variant = 'default',
}: {
  initials: string;
  s: (value: number) => number;
  size: number;
  variant?: 'default' | 'hero';
}) {
  const measuredSize = s(size);

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: palette.green,
        borderColor:
          variant === 'hero' ? 'rgba(20,21,16,0.12)' : 'rgba(20,21,16,0.08)',
        borderRadius: 999,
        borderWidth: 1,
        height: measuredSize,
        justifyContent: 'center',
        width: measuredSize,
      }}
    >
      <Text
        selectable
        style={{
          color: '#10140f',
          fontSize: variant === 'hero' ? s(58) : s(18),
          fontWeight: '900',
          letterSpacing: variant === 'hero' ? -1.2 : -0.2,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

function formatTeamMemberRole(role: TeamMemberListItem['member_role']) {
  if (role === 'owner') {
    return 'Owner';
  }

  if (role === 'admin') {
    return 'Admin';
  }

  return 'Member';
}

function TeamMemberPill({
  member,
  onPress,
  s,
  x,
  y,
}: {
  member: TeamMemberListItem;
  onPress: () => void;
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const roleLabel = formatTeamMemberRole(member.member_role);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: '#fbfcf8',
        borderColor: '#eceee7',
        borderRadius: s(20),
        borderWidth: 1,
        flexDirection: 'row',
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: s(14),
        paddingVertical: y(12),
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <TeamAvatar initials={getTeamInitials(member.member_name)} s={s} size={44} />
      <View style={{ flex: 1, marginLeft: x(12) }}>
        <Text
          selectable
          numberOfLines={1}
          style={{
            color: '#11130f',
            fontSize: appFontSize(s, 16),
            fontWeight: '800',
            letterSpacing: -0.22,
            lineHeight: s(22),
          }}
        >
          {member.member_name}
        </Text>
        <Text
          selectable
          numberOfLines={1}
          style={{
            color: '#8c9188',
            fontSize: appFontSize(s, 13),
            fontWeight: '500',
            lineHeight: s(18),
            marginTop: y(1),
          }}
        >
          {roleLabel} • Ready for tasks
        </Text>
      </View>
      <View
        style={{
          backgroundColor: roleLabel === 'Member' ? '#f0f1eb' : palette.green,
          borderRadius: 999,
          paddingHorizontal: x(11),
          paddingVertical: y(6),
        }}
      >
        <Text
          selectable
          style={{
            color: '#11130f',
            fontSize: appFontSize(s, 11),
            fontWeight: '900',
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}
        >
          {roleLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function TeamDetailMetric({
  label,
  s,
  value,
}: {
  label: string;
  s: (value: number) => number;
  value: string;
}) {
  return (
    <View
      style={{
        backgroundColor: '#f7f8f4',
        borderColor: '#eceee7',
        borderRadius: s(18),
        borderWidth: 1,
        flex: 1,
        minHeight: s(82),
        paddingHorizontal: s(13),
        paddingVertical: s(12),
      }}
    >
      <Text
        selectable
        style={{
          color: '#11130f',
          fontSize: appFontSize(s, 23),
          fontWeight: '900',
          letterSpacing: -0.5,
          lineHeight: s(28),
        }}
      >
        {value}
      </Text>
      <Text
        selectable
        style={{
          color: '#8c9188',
          fontSize: appFontSize(s, 12),
          fontWeight: '600',
          lineHeight: s(17),
          marginTop: s(4),
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function TeamDetailSection({
  action,
  children,
  icon,
  onAction,
  s,
  title,
  y,
}: {
  action?: string;
  children: ReactNode;
  icon: ReactNode;
  onAction?: () => void;
  s: (value: number) => number;
  title: string;
  y: (value: number) => number;
}) {
  return (
    <View style={{ marginTop: y(30) }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#f0f1eb',
            borderRadius: 999,
            height: s(34),
            justifyContent: 'center',
            width: s(34),
          }}
        >
          {icon}
        </View>
        <Text
          selectable
          style={{
            color: '#11130f',
            flex: 1,
            fontSize: appFontSize(s, 20),
            fontWeight: '900',
            letterSpacing: -0.35,
            lineHeight: s(27),
            marginLeft: s(10),
          }}
        >
          {title}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={({ pressed }) => ({
              opacity: pressed ? 0.58 : 1,
              paddingHorizontal: s(4),
              paddingVertical: s(5),
            })}
          >
            <Text
              selectable
              style={{
                color: palette.greenDeep,
                fontSize: appFontSize(s, 17),
                fontWeight: '900',
                letterSpacing: -0.12,
              }}
            >
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function TeamDetailEmptyLine({
  body,
  s,
  title,
  y,
}: {
  body: string;
  s: (value: number) => number;
  title: string;
  y: (value: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: '#fbfcf8',
        borderColor: '#eceee7',
        borderRadius: s(18),
        borderWidth: 1,
        marginTop: y(16),
        paddingHorizontal: s(16),
        paddingVertical: y(15),
      }}
    >
      <Text
        selectable
        style={{
          color: '#11130f',
          fontSize: appFontSize(s, 16),
          fontWeight: '800',
          letterSpacing: -0.18,
          lineHeight: s(22),
        }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: '#8c9188',
          fontSize: appFontSize(s, 14),
          fontWeight: '500',
          lineHeight: s(20),
          marginTop: y(3),
        }}
      >
        {body}
      </Text>
    </View>
  );
}

function TaskSummaryRow({
  s,
  task,
  y,
}: {
  s: (value: number) => number;
  task: TaskWithTeams;
  y: (value: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: '#fbfcf8',
        borderColor: '#eceee7',
        borderRadius: s(18),
        borderWidth: 1,
        paddingHorizontal: s(16),
        paddingVertical: y(14),
      }}
    >
      <Text
        selectable
        numberOfLines={1}
        style={{
          color: '#11130f',
          fontSize: appFontSize(s, 16),
          fontWeight: '900',
          letterSpacing: -0.22,
          lineHeight: s(22),
        }}
      >
        {task.title}
      </Text>
      <Text
        selectable
        numberOfLines={1}
        style={{
          color: '#8c9188',
          fontSize: appFontSize(s, 14),
          fontWeight: '600',
          lineHeight: s(20),
          marginTop: y(3),
        }}
      >
        ₦{Number(task.payout_amount_naira || 0).toLocaleString()} •{' '}
        {task.people_needed} people • {task.status}
      </Text>
    </View>
  );
}

function getSubmissionStatusDisplay(status: TaskSubmissionRecord['status']) {
  if (status === 'approved' || status === 'paid') {
    return {
      backgroundColor: '#e7f8d7',
      color: palette.greenDeep,
      label: status === 'paid' ? 'Paid' : 'Approved',
    };
  }

  if (status === 'rejected') {
    return {
      backgroundColor: '#ffe8e3',
      color: '#9c2f1f',
      label: 'Rejected',
    };
  }

  return {
    backgroundColor: '#fff4d7',
    color: '#6c4d00',
    label: 'Pending',
  };
}

function getSubmissionStatusSentence(status: TaskSubmissionRecord['status']) {
  if (status === 'approved') {
    return 'has been approved';
  }

  if (status === 'paid') {
    return 'has been paid';
  }

  if (status === 'rejected') {
    return 'was rejected';
  }

  return 'is waiting for review';
}

function getSubmissionAssetIcon(kind: SubmissionAssetKind, size: number) {
  if (kind === 'photo') {
    return <ImageIcon color="#11130f" size={size} strokeWidth={2.3} />;
  }

  if (kind === 'video') {
    return <Video color="#11130f" size={size} strokeWidth={2.3} />;
  }

  if (kind === 'location') {
    return <MapPin color="#11130f" size={size} strokeWidth={2.3} />;
  }

  return <FileText color="#11130f" size={size} strokeWidth={2.3} />;
}

function TeamSubmissionReviewCard({
  onOpenAsset,
  onReview,
  s,
  submission,
  y,
}: {
  onOpenAsset: (asset: SubmissionAsset) => void;
  onReview: (
    submission: TeamTaskSubmission,
    status: Extract<TaskSubmissionRecord['status'], 'approved' | 'rejected'>,
  ) => void;
  s: (value: number) => number;
  submission: TeamTaskSubmission;
  y: (value: number) => number;
}) {
  const badge = getSubmissionStatusDisplay(submission.status);
  const canReview = submission.status === 'submitted';

  return (
    <View
      style={{
        backgroundColor: '#fbfcf8',
        borderColor: '#eceee7',
        borderRadius: s(20),
        borderWidth: 1,
        padding: s(16),
      }}
    >
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: s(10),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            selectable
            numberOfLines={1}
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 17),
              fontWeight: '900',
              letterSpacing: -0.24,
              lineHeight: s(23),
            }}
          >
            {submission.task_title}
          </Text>
          <Text
            selectable
            numberOfLines={1}
            style={{
              color: '#747a70',
              fontSize: appFontSize(s, 13),
              fontWeight: '600',
              lineHeight: s(19),
              marginTop: y(3),
            }}
          >
            {submission.member_name} • Attempt {submission.attempt_number}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badge.backgroundColor,
            borderRadius: 999,
            paddingHorizontal: s(11),
            paddingVertical: y(6),
          }}
        >
          <Text
            selectable
            style={{
              color: badge.color,
              fontSize: appFontSize(s, 11),
              fontWeight: '900',
              letterSpacing: 0.1,
              textTransform: 'uppercase',
            }}
          >
            {badge.label}
          </Text>
        </View>
      </View>

      {submission.proof_text ? (
        <View
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#edf0e8',
            borderRadius: s(16),
            borderWidth: 1,
            marginTop: y(12),
            padding: s(13),
          }}
        >
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 13),
              fontWeight: '900',
              letterSpacing: -0.1,
              lineHeight: s(18),
            }}
          >
            Written proof
          </Text>
          <Text
            selectable
            style={{
              color: '#63685f',
              fontSize: appFontSize(s, 14),
              fontWeight: '500',
              lineHeight: s(21),
              marginTop: y(5),
            }}
          >
            {submission.proof_text}
          </Text>
        </View>
      ) : null}

      {submission.proof_assets.length > 0 ? (
        <View style={{ gap: y(8), marginTop: y(12) }}>
          {submission.proof_assets.map((asset, index) => (
            <Pressable
              accessibilityRole="button"
              key={`${submission.id}-${asset.path}-${index}`}
              onPress={() => onOpenAsset(asset)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderColor: '#edf0e8',
                borderRadius: s(16),
                borderWidth: 1,
                flexDirection: 'row',
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: s(12),
                paddingVertical: y(11),
              })}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#f0f1eb',
                  borderRadius: 999,
                  height: s(34),
                  justifyContent: 'center',
                  width: s(34),
                }}
              >
                {getSubmissionAssetIcon(asset.kind, s(17))}
              </View>
              <Text
                selectable
                numberOfLines={1}
                style={{
                  color: '#11130f',
                  flex: 1,
                  fontSize: appFontSize(s, 14),
                  fontWeight: '800',
                  letterSpacing: -0.14,
                  lineHeight: s(20),
                  marginLeft: s(10),
                }}
              >
                {asset.name}
              </Text>
              <ExternalLink color="#8c9188" size={s(16)} strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {submission.review_note ? (
        <Text
          selectable
          style={{
            color: '#8c9188',
            fontSize: appFontSize(s, 12),
            fontWeight: '600',
            lineHeight: s(18),
            marginTop: y(9),
          }}
        >
          Review note: {submission.review_note}
        </Text>
      ) : null}

      {canReview ? (
        <View style={{ flexDirection: 'row', gap: s(9), marginTop: y(13) }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onReview(submission, 'rejected')}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: '#f0f1eb',
              borderRadius: 999,
              flex: 1,
              flexDirection: 'row',
              gap: s(7),
              height: s(46),
              justifyContent: 'center',
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <CircleX color="#11130f" size={s(18)} strokeWidth={2.4} />
            <Text
              selectable
              style={{
                color: '#11130f',
                fontSize: appFontSize(s, 14),
                fontWeight: '900',
                letterSpacing: -0.12,
              }}
            >
              Reject
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onReview(submission, 'approved')}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: palette.green,
              borderRadius: 999,
              flex: 1,
              flexDirection: 'row',
              gap: s(7),
              height: s(46),
              justifyContent: 'center',
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <CircleCheck color="#11130f" size={s(18)} strokeWidth={2.4} />
            <Text
              selectable
              style={{
                color: '#11130f',
                fontSize: appFontSize(s, 14),
                fontWeight: '900',
                letterSpacing: -0.12,
              }}
            >
              Approve
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SubmissionTaskCard({
  onSubmit,
  s,
  submissions,
  task,
  y,
}: {
  onSubmit: () => void;
  s: (value: number) => number;
  submissions: MyTaskSubmission[];
  task: TaskWithTeams;
  y: (value: number) => number;
}) {
  const proofTypes = task.proof_types?.length ? task.proof_types : [task.proof_type];
  const latestSubmission = submissions[0] ?? null;
  const isLocked =
    latestSubmission?.status === 'submitted' ||
    latestSubmission?.status === 'approved' ||
    latestSubmission?.status === 'paid';
  const badge = latestSubmission
    ? getSubmissionStatusDisplay(latestSubmission.status)
    : null;

  return (
    <View
      style={{
        backgroundColor: '#fbfcf8',
        borderColor: '#eceee7',
        borderRadius: s(20),
        borderWidth: 1,
        padding: s(16),
      }}
    >
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: s(10),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 17),
              fontWeight: '900',
              letterSpacing: -0.24,
              lineHeight: s(23),
            }}
          >
            {task.title}
          </Text>
          <Text
            selectable
            numberOfLines={2}
            style={{
              color: '#747a70',
              fontSize: appFontSize(s, 13),
              fontWeight: '500',
              lineHeight: s(19),
              marginTop: y(4),
            }}
          >
            {task.description}
          </Text>
        </View>
        {badge ? (
          <View
            style={{
              backgroundColor: badge.backgroundColor,
              borderRadius: 999,
              paddingHorizontal: s(11),
              paddingVertical: y(6),
            }}
          >
            <Text
              selectable
              style={{
                color: badge.color,
                fontSize: appFontSize(s, 11),
                fontWeight: '900',
                letterSpacing: 0.1,
                textTransform: 'uppercase',
              }}
            >
              {badge.label}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#edf0e8',
          borderRadius: s(16),
          borderWidth: 1,
          marginTop: y(12),
          padding: s(13),
        }}
      >
        <TaskDetailInfoRow
          label="Submission method"
          s={s}
          value={formatTaskProofs(proofTypes)}
        />
        <TaskDetailInfoRow
          label="What counts as done"
          s={s}
          value={task.success_criteria}
        />
      </View>

      {latestSubmission ? (
        <View
          style={{
            backgroundColor: '#f4f7ef',
            borderRadius: s(16),
            marginTop: y(10),
            paddingHorizontal: s(13),
            paddingVertical: y(11),
          }}
        >
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 14),
              fontWeight: '800',
              lineHeight: s(20),
            }}
          >
            Attempt {latestSubmission.attempt_number} {getSubmissionStatusSentence(latestSubmission.status)}.
          </Text>
          <Text
            selectable
            style={{
              color: '#8c9188',
              fontSize: appFontSize(s, 12),
              fontWeight: '500',
              lineHeight: s(18),
              marginTop: y(2),
            }}
          >
            {latestSubmission.status === 'rejected'
              ? latestSubmission.review_note || 'You can send fresh proof now.'
              : 'You can send another proof only if the CrewLead rejects this attempt.'}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onSubmit}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: isLocked ? '#f0f1eb' : palette.green,
          borderRadius: 999,
          height: s(48),
          justifyContent: 'center',
          marginTop: y(13),
          opacity: pressed ? 0.78 : 1,
        })}
      >
        <Text
          selectable
          style={{
            color: '#11130f',
            fontSize: appFontSize(s, 15),
            fontWeight: '900',
            letterSpacing: -0.12,
          }}
        >
          {isLocked
            ? latestSubmission?.status === 'approved' ||
              latestSubmission?.status === 'paid'
              ? 'Approved'
              : 'Waiting for approval'
            : latestSubmission?.status === 'rejected'
              ? 'Resubmit proof'
              : 'Submit proof'}
        </Text>
      </Pressable>
    </View>
  );
}

function SubmitProofScreen({
  existingSubmissions,
  onBack,
  onSubmitted,
  task,
  team,
}: {
  existingSubmissions: MyTaskSubmission[];
  onBack: () => void;
  onSubmitted: () => Promise<void> | void;
  task: TaskWithTeams;
  team: TeamDraft;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const proofTypes = useMemo(
    () =>
      Array.from(
        new Set(task.proof_types?.length ? task.proof_types : [task.proof_type]),
      ),
    [task.proof_type, task.proof_types],
  );
  const [proofText, setProofText] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<SelectedSubmissionAsset[]>(
    [],
  );
  const [locationAsset, setLocationAsset] = useState<SubmissionAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const latestSubmission = existingSubmissions[0] ?? null;
  const selectedKinds = new Set<SubmissionAssetKind>([
    ...selectedAssets.map((asset) => asset.kind),
    ...(locationAsset ? [locationAsset.kind] : []),
  ]);
  const allowsNoProof = proofTypes.includes('none');
  const hasTextProof =
    proofTypes.includes('text') && proofText.trim().length >= 2;
  const hasAssetProof = proofTypes.some(
    (proofType) =>
      proofType !== 'none' &&
      proofType !== 'text' &&
      selectedKinds.has(proofType as SubmissionAssetKind),
  );
  const hasAcceptedProof = allowsNoProof || hasTextProof || hasAssetProof;
  const textIsOnlyProof =
    proofTypes.length === 1 && proofTypes[0] === 'text';
  const canSubmit = !submitting && hasAcceptedProof;

  const addMediaAssets = useCallback(
    async (kind: Extract<SubmissionAssetKind, 'photo' | 'video'>) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Allow photo library access so you can attach proof.',
        );
        return;
      }

      const mediaType: ImagePicker.MediaType =
        kind === 'photo' ? 'images' : 'videos';
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: [mediaType],
        quality: 0.82,
      });

      if (result.canceled) {
        return;
      }

      setSelectedAssets((current) => [
        ...current,
        ...result.assets.map((asset, index) => ({
          kind,
          mimeType:
            asset.mimeType ?? (kind === 'photo' ? 'image/jpeg' : 'video/mp4'),
          name:
            asset.fileName ??
            `${kind}-proof-${Date.now()}-${index}.${kind === 'photo' ? 'jpg' : 'mp4'}`,
          size: asset.fileSize ?? null,
          uri: asset.uri,
        })),
      ]);
    },
    [],
  );

  const addDocumentAssets = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: '*/*',
    });

    if (result.canceled) {
      return;
    }

    setSelectedAssets((current) => [
      ...current,
      ...result.assets.map((asset) => ({
        kind: 'document' as const,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        name: asset.name,
        size: asset.size ?? null,
        uri: asset.uri,
      })),
    ]);
  }, []);

  const addLocationProof = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow location access so CrewPay can attach your check-in.',
      );
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    setLocationAsset({
      kind: 'location',
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      name: 'Location check-in',
      path: `location:${location.coords.latitude},${location.coords.longitude}`,
    });
  }, []);

  const removeAsset = useCallback((indexToRemove: number) => {
    setSelectedAssets((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert(
        'Proof is incomplete',
        `Add any one accepted proof: ${formatTaskProofs(proofTypes)}.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      if (!team.id) {
        throw new Error('Team is still syncing. Please reopen the team and try again.');
      }

      const uploadedAssets: SubmissionAsset[] = [];

      for (const asset of selectedAssets) {
        const uploaded = await uploadSubmissionAsset({
          ...asset,
          taskId: task.id,
        });

        uploadedAssets.push(uploaded);
      }

      await submitTaskProof({
        assets: [...uploadedAssets, ...(locationAsset ? [locationAsset] : [])],
        proofText,
        taskId: task.id,
        teamId: team.id,
      });

      await onSubmitted();
    } catch (error) {
      Alert.alert(
        'Could not submit proof',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    locationAsset,
    onSubmitted,
    proofText,
    selectedAssets,
    task.id,
    team.id,
  ]);

  return (
    <View style={{ backgroundColor: '#ffffff', flex: 1 }}>
      <View style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <View
            style={{
              left: x(25),
              position: 'absolute',
              top: y(82),
              zIndex: 2,
            }}
          >
            <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
          </View>
          <ScrollView
            contentContainerStyle={{
              minHeight: height,
              paddingBottom: y(42),
              paddingHorizontal: x(25),
              paddingTop: y(178),
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              selectable
              style={{
                color: '#050505',
                fontSize: appFontSize(s, 44),
                fontWeight: '900',
                letterSpacing: -1.6,
                lineHeight: s(50),
              }}
            >
              Submit proof
            </Text>
            <Text
              selectable
              style={{
                color: '#666a62',
                fontSize: appFontSize(s, 19),
                fontWeight: '400',
                lineHeight: s(28),
                marginTop: y(10),
              }}
            >
              {task.title} for {team.name}
            </Text>

            {latestSubmission ? (
              <View
                style={{
                  backgroundColor: '#f7f8f4',
                  borderColor: '#eceee7',
                  borderRadius: s(18),
                  borderWidth: 1,
                  marginTop: y(22),
                  padding: s(15),
                }}
              >
                <Text
                  selectable
                  style={{
                    color: '#11130f',
                    fontSize: appFontSize(s, 15),
                    fontWeight: '900',
                    letterSpacing: -0.14,
                    lineHeight: s(21),
                  }}
                >
                  Last attempt {getSubmissionStatusSentence(latestSubmission.status)}
                </Text>
                {latestSubmission.review_note ? (
                  <Text
                    selectable
                    style={{
                      color: '#747a70',
                      fontSize: appFontSize(s, 13),
                      fontWeight: '500',
                      lineHeight: s(19),
                      marginTop: y(4),
                    }}
                  >
                    {latestSubmission.review_note}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View
              style={{
                backgroundColor: '#fbfcf8',
                borderColor: '#eceee7',
                borderRadius: s(22),
                borderWidth: 1,
                marginTop: y(24),
                padding: s(17),
              }}
            >
              <Text
                selectable
                style={{
                  color: '#11130f',
                  fontSize: appFontSize(s, 16),
                  fontWeight: '900',
                  letterSpacing: -0.18,
                  lineHeight: s(22),
                }}
              >
                Choose a proof method
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: s(8),
                  marginTop: y(12),
                }}
              >
                {proofTypes.map((proofType) => (
                  <View
                    key={proofType}
                    style={{
                      backgroundColor:
                        proofType === 'none' ||
                        (proofType === 'text' && hasTextProof) ||
                        (proofType !== 'text' &&
                          selectedKinds.has(proofType as SubmissionAssetKind))
                          ? palette.green
                          : '#f0f1eb',
                      borderRadius: 999,
                      paddingHorizontal: s(12),
                      paddingVertical: y(7),
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        color: '#11130f',
                        fontSize: appFontSize(s, 12),
                        fontWeight: '900',
                        letterSpacing: -0.05,
                      }}
                    >
                      {formatTaskProof(proofType)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text
                selectable
                style={{
                  color: '#747a70',
                  fontSize: appFontSize(s, 13),
                  fontWeight: '500',
                  lineHeight: s(20),
                  marginTop: y(11),
                }}
              >
                Submit any one of the accepted methods above.
              </Text>
              <Text
                selectable
                style={{
                  color: '#747a70',
                  fontSize: appFontSize(s, 13),
                  fontWeight: '500',
                  lineHeight: s(20),
                  marginTop: y(6),
                }}
              >
                {task.success_criteria}
              </Text>
            </View>

            <View style={{ marginTop: y(24) }}>
              <Text
                selectable
                style={{
                  color: '#11130f',
                  fontSize: appFontSize(s, 15),
                  fontWeight: '900',
                  letterSpacing: -0.12,
                  lineHeight: s(21),
                }}
              >
                Written note{' '}
                {textIsOnlyProof
                  ? ''
                  : proofTypes.includes('text')
                    ? '(one option)'
                    : '(optional context)'}
              </Text>
              <TextInput
                multiline
                onChangeText={setProofText}
                placeholder="Describe what you completed..."
                placeholderTextColor="#a5aaa0"
                style={{
                  backgroundColor: '#fbfcf8',
                  borderColor:
                    textIsOnlyProof && !hasTextProof && proofText.length > 0
                      ? '#b23a2c'
                      : '#c9cbc4',
                  borderRadius: s(18),
                  borderWidth: 1,
                  color: '#11130f',
                  fontSize: Math.max(appFontSize(s, 17), 16),
                  fontWeight: '500',
                  lineHeight: Math.max(s(24), 22),
                  marginTop: y(8),
                  minHeight: y(118),
                  paddingHorizontal: s(14),
                  paddingTop: y(13),
                  textAlignVertical: 'top',
                }}
                value={proofText}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: s(9),
                marginTop: y(18),
              }}
            >
              {proofTypes.includes('photo') ? (
                <ProofPickerButton
                  icon={<ImageIcon color="#11130f" size={s(18)} strokeWidth={2.4} />}
                  label="Add photo"
                  onPress={() => addMediaAssets('photo')}
                  s={s}
                  y={y}
                />
              ) : null}
              {proofTypes.includes('video') ? (
                <ProofPickerButton
                  icon={<Video color="#11130f" size={s(18)} strokeWidth={2.4} />}
                  label="Add video"
                  onPress={() => addMediaAssets('video')}
                  s={s}
                  y={y}
                />
              ) : null}
              {proofTypes.includes('document') ? (
                <ProofPickerButton
                  icon={<FileText color="#11130f" size={s(18)} strokeWidth={2.4} />}
                  label="Add document"
                  onPress={addDocumentAssets}
                  s={s}
                  y={y}
                />
              ) : null}
              {proofTypes.includes('location') ? (
                <ProofPickerButton
                  icon={<MapPin color="#11130f" size={s(18)} strokeWidth={2.4} />}
                  label={locationAsset ? 'Location added' : 'Add location'}
                  onPress={addLocationProof}
                  s={s}
                  y={y}
                />
              ) : null}
            </View>

            {selectedAssets.length > 0 || locationAsset ? (
              <View style={{ gap: y(9), marginTop: y(18) }}>
                {selectedAssets.map((asset, index) => (
                  <SelectedProofAssetRow
                    asset={asset}
                    key={`${asset.uri}-${index}`}
                    onRemove={() => removeAsset(index)}
                    s={s}
                    y={y}
                  />
                ))}
                {locationAsset ? (
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: '#fbfcf8',
                      borderColor: '#eceee7',
                      borderRadius: s(16),
                      borderWidth: 1,
                      flexDirection: 'row',
                      paddingHorizontal: s(12),
                      paddingVertical: y(11),
                    }}
                  >
                    <MapPin color="#11130f" size={s(18)} strokeWidth={2.4} />
                    <Text
                      selectable
                      numberOfLines={1}
                      style={{
                        color: '#11130f',
                        flex: 1,
                        fontSize: appFontSize(s, 14),
                        fontWeight: '800',
                        lineHeight: s(20),
                        marginLeft: s(10),
                      }}
                    >
                      {locationAsset.latitude?.toFixed(5)}, {locationAsset.longitude?.toFixed(5)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setLocationAsset(null)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.55 : 1,
                        padding: s(4),
                      })}
                    >
                      <X color="#8c9188" size={s(17)} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            {proofTypes.includes('none') ? (
              <Text
                selectable
                style={{
                  color: '#747a70',
                  fontSize: appFontSize(s, 13),
                  fontWeight: '500',
                  lineHeight: s(20),
                  marginTop: y(18),
                }}
              >
                This task does not require file proof. Tap submit when the work is done.
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={handleSubmit}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: canSubmit ? palette.green : '#e9ebe3',
                borderRadius: 999,
                height: s(60),
                justifyContent: 'center',
                marginTop: y(28),
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text
                selectable
                style={{
                  color: '#11130f',
                  fontSize: appFontSize(s, 17),
                  fontWeight: '900',
                  letterSpacing: -0.14,
                }}
              >
                {submitting ? 'Submitting...' : 'Submit proof'}
              </Text>
            </Pressable>
          </ScrollView>
      </View>
    </View>
  );
}

function ProofPickerButton({
  icon,
  label,
  onPress,
  s,
  y,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  s: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: '#f0f1eb',
        borderRadius: 999,
        flexDirection: 'row',
        gap: s(7),
        minHeight: s(44),
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: s(13),
        paddingVertical: y(8),
      })}
    >
      {icon}
      <Text
        selectable
        style={{
          color: '#11130f',
          fontSize: appFontSize(s, 13),
          fontWeight: '900',
          letterSpacing: -0.08,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SelectedProofAssetRow({
  asset,
  onRemove,
  s,
  y,
}: {
  asset: SelectedSubmissionAsset;
  onRemove: () => void;
  s: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#fbfcf8',
        borderColor: '#eceee7',
        borderRadius: s(16),
        borderWidth: 1,
        flexDirection: 'row',
        paddingHorizontal: s(12),
        paddingVertical: y(11),
      }}
    >
      {getSubmissionAssetIcon(asset.kind, s(18))}
      <Text
        selectable
        numberOfLines={1}
        style={{
          color: '#11130f',
          flex: 1,
          fontSize: appFontSize(s, 14),
          fontWeight: '800',
          lineHeight: s(20),
          marginLeft: s(10),
        }}
      >
        {asset.name}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRemove}
        style={({ pressed }) => ({
          opacity: pressed ? 0.55 : 1,
          padding: s(4),
        })}
      >
        <X color="#8c9188" size={s(17)} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

function SubmissionsInboxScreen({
  mySubmissions,
  onBack,
  onJoinTeam,
  onMarkSeen,
  onRefreshMySubmissions,
  onRefreshTasks,
  onRefreshTeamSubmissions,
  onSubmitTask,
  role,
  seenSubmissionIds,
  tasks,
  teamSubmissionsByTeamId,
  teams,
}: {
  mySubmissions: MyTaskSubmission[];
  onBack: () => void;
  onJoinTeam: () => void;
  onMarkSeen: (submissionId: string) => void | Promise<void>;
  onRefreshMySubmissions: () => void | Promise<void>;
  onRefreshTasks: () => void | Promise<void>;
  onRefreshTeamSubmissions: (teamId?: string) => void | Promise<void>;
  onSubmitTask: (task: TaskWithTeams, team: TeamDraft) => void;
  role: AccountRole;
  seenSubmissionIds: string[];
  tasks: TaskWithTeams[];
  teamSubmissionsByTeamId: Record<string, TeamTaskSubmission[]>;
  teams: TeamDraft[];
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const isCrewMate = role === 'crewmate';
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [activeTab, setActiveTab] = useState<'unseen' | 'seen'>('unseen');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [reviewDraft, setReviewDraft] = useState<{
    status: Extract<TaskSubmissionRecord['status'], 'approved' | 'rejected'>;
    submission: TeamTaskSubmission;
  } | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const seenSet = useMemo(
    () => new Set(seenSubmissionIds),
    [seenSubmissionIds],
  );
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  const getTeamSubmissions = useCallback(
    (team: TeamDraft) => {
      if (!team.id) {
        return [];
      }

      return isCrewMate
        ? mySubmissions.filter((submission) => submission.team_id === team.id)
        : teamSubmissionsByTeamId[team.id] ?? [];
    },
    [isCrewMate, mySubmissions, teamSubmissionsByTeamId],
  );

  const teamRows = useMemo(
    () =>
      teams.map((team) => {
        const submissions = getTeamSubmissions(team);
        const unseenCount = submissions.filter(
          (submission) => !seenSet.has(submission.id),
        ).length;

        return {
          submissions,
          taskCount: getTasksForTeam(tasks, team.id).length,
          team,
          unseenCount: isCrewMate ? 0 : unseenCount,
        };
      }),
    [getTeamSubmissions, isCrewMate, seenSet, tasks, teams],
  );

  const selectedTeamTasks = selectedTeam
    ? getTasksForTeam(tasks, selectedTeam.id)
    : [];
  const selectedTeamSubmissions = selectedTeam
    ? getTeamSubmissions(selectedTeam)
    : [];
  const unseenSubmissions = selectedTeamSubmissions.filter(
    (submission) => !seenSet.has(submission.id),
  );
  const seenSubmissions = selectedTeamSubmissions.filter((submission) =>
    seenSet.has(submission.id),
  );
  const visibleSubmissions = isCrewMate
    ? selectedTeamSubmissions
    : activeTab === 'unseen'
      ? unseenSubmissions
      : seenSubmissions;
  const selectedSubmission =
    selectedTeamSubmissions.find(
      (submission) => submission.id === selectedSubmissionId,
    ) ?? null;

  useEffect(() => {
    if (selectedTeamId && !teams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId('');
      setSelectedSubmissionId('');
    }
  }, [selectedTeamId, teams]);

  useEffect(() => {
    if (!selectedTeam?.id) {
      return;
    }

    if (isCrewMate) {
      onRefreshMySubmissions();
      onRefreshTasks();
      return;
    }

    onRefreshTeamSubmissions(selectedTeam.id);
  }, [
    isCrewMate,
    onRefreshMySubmissions,
    onRefreshTasks,
    onRefreshTeamSubmissions,
    selectedTeam?.id,
  ]);

  const openSubmissionAsset = useCallback(async (asset: SubmissionAsset) => {
    try {
      if (
        asset.kind === 'location' &&
        typeof asset.latitude === 'number' &&
        typeof asset.longitude === 'number'
      ) {
        await Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${asset.latitude},${asset.longitude}`,
        );
        return;
      }

      const signedUrl = await getSubmissionAssetUrl(asset.path);
      await Linking.openURL(signedUrl);
    } catch (error) {
      Alert.alert(
        'Could not open proof',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, []);

  const submitReviewDecision = useCallback(
    async (reviewNote: string) => {
      if (!reviewDraft) {
        return;
      }

      setReviewSubmitting(true);

      try {
        await reviewTaskSubmission(
          reviewDraft.submission.id,
          reviewDraft.status,
          reviewNote,
        );
        await onRefreshTeamSubmissions(reviewDraft.submission.team_id);
        await onRefreshMySubmissions();
        setReviewDraft(null);
      } catch (error) {
        Alert.alert(
          'Could not review submission',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setReviewSubmitting(false);
      }
    },
    [onRefreshMySubmissions, onRefreshTeamSubmissions, reviewDraft],
  );

  const openSubmission = useCallback(
    async (submission: MyTaskSubmission | TeamTaskSubmission) => {
      setSelectedSubmissionId(submission.id);
      if (!isCrewMate) {
        await onMarkSeen(submission.id);
      }
    },
    [isCrewMate, onMarkSeen],
  );

  const goBack = useCallback(() => {
    if (selectedSubmissionId) {
      setSelectedSubmissionId('');
      return;
    }

    if (selectedTeamId) {
      setSelectedTeamId('');
      setActiveTab('unseen');
      return;
    }

    onBack();
  }, [onBack, selectedSubmissionId, selectedTeamId]);

  const chooseTeam = useCallback((team: TeamDraft) => {
    setSelectedTeamId(team.id ?? '');
    setSelectedSubmissionId('');
    setActiveTab('unseen');
  }, []);

  const renderEmpty = (title: string, body: string) => (
    <View
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingBottom: y(120),
      }}
    >
      <Text
        selectable
        style={{
          color: 'rgba(5,5,5,0.52)',
          fontSize: appFontSize(s, 18),
          fontWeight: '800',
          letterSpacing: -0.2,
          lineHeight: s(25),
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: 'rgba(5,5,5,0.35)',
          fontSize: appFontSize(s, 15),
          fontWeight: '500',
          lineHeight: s(22),
          marginTop: y(8),
          maxWidth: x(370),
          textAlign: 'center',
        }}
      >
        {body}
      </Text>
      {isCrewMate && teams.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onJoinTeam}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: palette.green,
            borderRadius: 999,
            height: s(52),
            justifyContent: 'center',
            marginTop: y(18),
            opacity: pressed ? 0.72 : 1,
            paddingHorizontal: x(24),
          })}
        >
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 15),
              fontWeight: '900',
              letterSpacing: -0.1,
            }}
          >
            Join a team
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <CircleControl icon="back" onPress={goBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, selectedTeam ? 42 : 46),
          fontWeight: '900',
          letterSpacing: -1.45,
          lineHeight: s(selectedTeam ? 48 : 52),
          marginTop: y(54),
        }}
      >
        {selectedTeam ? selectedTeam.name : 'Submissions'}
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 19),
          fontWeight: '400',
          lineHeight: s(28),
          marginTop: y(10),
        }}
      >
        {selectedTeam
          ? isCrewMate
            ? 'Submit proof, track status, and keep your work history tidy.'
            : 'Review proof from CrewMates and approve or reject work.'
          : isCrewMate
            ? 'Choose a joined team to see tasks ready for proof and your submission history.'
            : 'Choose a team to review new submissions from members.'}
      </Text>

      {!selectedTeam ? (
        teams.length === 0 ? (
          renderEmpty(
            isCrewMate ? 'No joined team yet' : 'No team yet',
            isCrewMate
              ? 'Join a team first. Once approved, tasks and proof history will show here.'
              : 'Create a team and assign tasks before submissions can arrive.',
          )
        ) : (
          <ScrollView
            contentContainerStyle={{
              gap: y(13),
              paddingBottom: y(90),
              paddingTop: y(34),
            }}
            showsVerticalScrollIndicator={false}
          >
            {teamRows.map(({ submissions, taskCount, team, unseenCount }) => (
              <SubmissionTeamPill
                key={team.id || team.name}
                onPress={() => chooseTeam(team)}
                s={s}
                scale={scale}
                submissionCount={submissions.length}
                taskCount={taskCount}
                team={team}
                unseenCount={unseenCount}
                x={x}
                y={y}
              />
            ))}
          </ScrollView>
        )
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: y(96),
            paddingTop: y(28),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isCrewMate ? (
            <View style={{ marginBottom: y(26) }}>
              <Text
                selectable
                style={{
                  color: '#11130f',
                  fontSize: appFontSize(s, 20),
                  fontWeight: '900',
                  letterSpacing: -0.35,
                  lineHeight: s(27),
                }}
              >
                Tasks ready for proof
              </Text>
              {selectedTeamTasks.length === 0 ? (
                <TeamDetailEmptyLine
                  body="Your CrewLead has not assigned tasks to this team yet."
                  s={s}
                  title="No tasks assigned yet"
                  y={y}
                />
              ) : (
                <View style={{ gap: y(10), marginTop: y(14) }}>
                  {selectedTeamTasks.map((task) => {
                    const taskSubmissions = mySubmissions.filter(
                      (submission) =>
                        submission.task_id === task.id &&
                        submission.team_id === selectedTeam.id,
                    );
                    const hasBlockingSubmission = taskSubmissions.some(
                      (submission) =>
                        submission.status === 'submitted' ||
                        submission.status === 'approved' ||
                        submission.status === 'paid',
                    );

                    return (
                      <SubmissionTaskCard
                        key={task.id}
                        onSubmit={() => {
                          if (hasBlockingSubmission) {
                            Alert.alert(
                              taskSubmissions.some(
                                (submission) =>
                                  submission.status === 'approved' ||
                                  submission.status === 'paid',
                              )
                                ? 'Task already approved'
                                : 'Submission pending',
                              taskSubmissions.some(
                                (submission) =>
                                  submission.status === 'approved' ||
                                  submission.status === 'paid',
                              )
                                ? 'This task has already been approved for you.'
                                : 'Wait for the CrewLead to approve or reject your current submission before sending another one.',
                            );
                            return;
                          }

                          onSubmitTask(task, selectedTeam);
                        }}
                        s={s}
                        submissions={taskSubmissions}
                        task={task}
                        y={y}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {!isCrewMate ? (
            <View
              style={{
                backgroundColor: '#f5f6f1',
                borderRadius: 999,
                flexDirection: 'row',
                gap: s(6),
                padding: s(5),
              }}
            >
              {(['unseen', 'seen'] as const).map((tab) => {
                const count =
                  tab === 'unseen'
                    ? unseenSubmissions.length
                    : seenSubmissions.length;
                const active = activeTab === tab;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={tab}
                    onPress={() => {
                      setActiveTab(tab);
                      setSelectedSubmissionId('');
                    }}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: active ? '#ffffff' : 'transparent',
                      borderRadius: 999,
                      flex: 1,
                      height: s(46),
                      justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      selectable
                      style={{
                        color: active ? '#11130f' : '#8c9188',
                        fontSize: appFontSize(s, 14),
                        fontWeight: '900',
                        letterSpacing: -0.08,
                      }}
                    >
                      {tab === 'unseen' ? 'Unseen' : 'Seen'} {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {visibleSubmissions.length === 0 ? (
            <View style={{ paddingTop: y(20) }}>
              <TeamDetailEmptyLine
                body={
                  isCrewMate
                    ? 'Submitted proof and review decisions will show here.'
                    : activeTab === 'unseen'
                      ? 'Fresh submissions will glow green here until you open them.'
                      : 'Opened submissions move here so the inbox stays calm.'
                }
                s={s}
                title={
                  isCrewMate
                    ? 'No submissions yet'
                    : activeTab === 'unseen'
                      ? 'No unseen submissions'
                      : 'Nothing seen yet'
                }
                y={y}
              />
            </View>
          ) : (
            <View style={{ gap: y(10), paddingTop: y(18) }}>
              {visibleSubmissions.map((submission) => (
                <SubmissionInboxPill
                  key={submission.id}
                  isCrewMate={isCrewMate}
                  isSelected={selectedSubmissionId === submission.id}
                  isUnseen={!isCrewMate && !seenSet.has(submission.id)}
                  onPress={() => openSubmission(submission)}
                  s={s}
                  submission={submission}
                  x={x}
                  y={y}
                />
              ))}
            </View>
          )}

          {selectedSubmission ? (
            <View style={{ marginTop: y(18) }}>
              {isCrewMate ? (
                <CrewMateSubmissionDetailCard
                  onOpenAsset={openSubmissionAsset}
                  s={s}
                  submission={selectedSubmission}
                  y={y}
                />
              ) : (
                <TeamSubmissionReviewCard
                  onOpenAsset={openSubmissionAsset}
                  onReview={(submission, status) =>
                    setReviewDraft({ status, submission })
                  }
                  s={s}
                  submission={selectedSubmission as TeamTaskSubmission}
                  y={y}
                />
              )}
            </View>
          ) : null}
        </ScrollView>
      )}

      <SubmissionReviewSheet
        decision={reviewDraft?.status ?? null}
        isSubmitting={reviewSubmitting}
        memberName={reviewDraft?.submission.member_name ?? ''}
        onClose={() => {
          if (!reviewSubmitting) {
            setReviewDraft(null);
          }
        }}
        onSubmit={submitReviewDecision}
        taskTitle={reviewDraft?.submission.task_title ?? ''}
        visible={Boolean(reviewDraft)}
      />
    </View>
  );
}

function SubmissionTeamPill({
  onPress,
  s,
  scale,
  submissionCount,
  taskCount,
  team,
  unseenCount,
  x,
  y,
}: {
  onPress: () => void;
  s: (value: number) => number;
  scale: number;
  submissionCount: number;
  taskCount: number;
  team: TeamDraft;
  unseenCount: number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const hasUnseen = unseenCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: hasUnseen ? '#f1fce9' : '#f7f8f4',
        borderColor: hasUnseen ? '#d6f7bf' : '#eceee7',
        borderRadius: s(24),
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: y(92),
        opacity: pressed ? 0.74 : 1,
        paddingHorizontal: x(13),
        paddingVertical: y(12),
        shadowColor: hasUnseen ? palette.greenDeep : '#000000',
        shadowOpacity: hasUnseen ? 0.12 : 0.04,
        shadowRadius: hasUnseen ? 18 : 8,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <TeamAvatar initials={getTeamInitials(team.name)} s={s} size={60} />
      <View style={{ flex: 1, marginLeft: x(14) }}>
        <Text
          selectable
          numberOfLines={1}
          style={{
            color: '#050505',
            fontSize: appFontSize(s, 20),
            fontWeight: '900',
            letterSpacing: -0.35,
            lineHeight: s(26),
          }}
        >
          {team.name}
        </Text>
        <Text
          selectable
          numberOfLines={1}
          style={{
            color: '#8c9188',
            fontSize: appFontSize(s, 14),
            fontWeight: '600',
            lineHeight: s(20),
            marginTop: y(3),
          }}
        >
          {taskCount} task{taskCount === 1 ? '' : 's'} • {submissionCount}{' '}
          submission{submissionCount === 1 ? '' : 's'}
        </Text>
      </View>
      {hasUnseen ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: palette.green,
            borderRadius: 999,
            justifyContent: 'center',
            minWidth: s(35),
            paddingHorizontal: s(9),
            paddingVertical: y(7),
          }}
        >
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 12),
              fontWeight: '900',
            }}
          >
            {unseenCount}
          </Text>
        </View>
      ) : (
        <ChevronRightIcon scale={scale * 0.62} />
      )}
    </Pressable>
  );
}

function SubmissionInboxPill({
  isCrewMate,
  isSelected,
  isUnseen,
  onPress,
  s,
  submission,
  x,
  y,
}: {
  isCrewMate: boolean;
  isSelected: boolean;
  isUnseen: boolean;
  onPress: () => void;
  s: (value: number) => number;
  submission: MyTaskSubmission | TeamTaskSubmission;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const badge = getSubmissionStatusDisplay(submission.status);
  const ownerName = isCrewMate
    ? submission.task_title
    : (submission as TeamTaskSubmission).member_name || 'CrewMate';
  const meta = isCrewMate
    ? `${submission.team_name} • Attempt ${submission.attempt_number}`
    : `${submission.task_title} • Attempt ${submission.attempt_number}`;
  const snippet =
    submission.proof_text ||
    (submission.proof_assets.length > 0
      ? `${submission.proof_assets.length} attachment${
          submission.proof_assets.length === 1 ? '' : 's'
        }`
      : 'No written note added');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: isUnseen ? '#f1fce9' : '#f7f8f4',
        borderColor: isSelected
          ? palette.greenDeep
          : isUnseen
            ? '#d5f5bd'
            : '#eceee7',
        borderRadius: s(22),
        borderWidth: isSelected ? 1.8 : 1,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: x(14),
        paddingVertical: y(13),
        shadowColor: isUnseen ? palette.greenDeep : '#000000',
        shadowOpacity: isUnseen ? 0.13 : 0.04,
        shadowRadius: isUnseen ? 16 : 7,
      })}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: x(11) }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: isUnseen ? palette.green : '#eceee7',
            borderRadius: 999,
            height: s(44),
            justifyContent: 'center',
            width: s(44),
          }}
        >
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 13),
              fontWeight: '900',
              letterSpacing: -0.1,
            }}
          >
            {getTeamInitials(ownerName)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            selectable
            numberOfLines={1}
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 17),
              fontWeight: '900',
              letterSpacing: -0.24,
              lineHeight: s(23),
            }}
          >
            {ownerName}
          </Text>
          <Text
            selectable
            numberOfLines={1}
            style={{
              color: '#747a70',
              fontSize: appFontSize(s, 13),
              fontWeight: '600',
              lineHeight: s(19),
              marginTop: y(2),
            }}
          >
            {meta}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badge.backgroundColor,
            borderRadius: 999,
            paddingHorizontal: s(10),
            paddingVertical: y(6),
          }}
        >
          <Text
            selectable
            style={{
              color: badge.color,
              fontSize: appFontSize(s, 10),
              fontWeight: '900',
              letterSpacing: 0.1,
              textTransform: 'uppercase',
            }}
          >
            {badge.label}
          </Text>
        </View>
      </View>
      <Text
        selectable
        numberOfLines={2}
        style={{
          color: '#8c9188',
          fontSize: appFontSize(s, 13),
          fontWeight: '500',
          lineHeight: s(19),
          marginLeft: s(55),
          marginTop: y(8),
        }}
      >
        {snippet}
      </Text>
    </Pressable>
  );
}

function CrewMateSubmissionDetailCard({
  onOpenAsset,
  s,
  submission,
  y,
}: {
  onOpenAsset: (asset: SubmissionAsset) => void;
  s: (value: number) => number;
  submission: MyTaskSubmission;
  y: (value: number) => number;
}) {
  const badge = getSubmissionStatusDisplay(submission.status);

  return (
    <View
      style={{
        backgroundColor: '#fbfcf8',
        borderColor: '#eceee7',
        borderRadius: s(22),
        borderWidth: 1,
        padding: s(16),
      }}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: s(10) }}>
        <View style={{ flex: 1 }}>
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 17),
              fontWeight: '900',
              letterSpacing: -0.24,
              lineHeight: s(23),
            }}
          >
            {submission.task_title}
          </Text>
          <Text
            selectable
            style={{
              color: '#747a70',
              fontSize: appFontSize(s, 13),
              fontWeight: '600',
              lineHeight: s(19),
              marginTop: y(3),
            }}
          >
            Attempt {submission.attempt_number} • {formatRequestTime(submission.submitted_at)}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badge.backgroundColor,
            borderRadius: 999,
            paddingHorizontal: s(11),
            paddingVertical: y(6),
          }}
        >
          <Text
            selectable
            style={{
              color: badge.color,
              fontSize: appFontSize(s, 11),
              fontWeight: '900',
              letterSpacing: 0.1,
              textTransform: 'uppercase',
            }}
          >
            {badge.label}
          </Text>
        </View>
      </View>

      {submission.proof_text ? (
        <View
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#edf0e8',
            borderRadius: s(16),
            borderWidth: 1,
            marginTop: y(12),
            padding: s(13),
          }}
        >
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 13),
              fontWeight: '900',
              letterSpacing: -0.1,
              lineHeight: s(18),
            }}
          >
            Written proof
          </Text>
          <Text
            selectable
            style={{
              color: '#63685f',
              fontSize: appFontSize(s, 14),
              fontWeight: '500',
              lineHeight: s(21),
              marginTop: y(5),
            }}
          >
            {submission.proof_text}
          </Text>
        </View>
      ) : null}

      {submission.proof_assets.length > 0 ? (
        <View style={{ gap: y(8), marginTop: y(12) }}>
          {submission.proof_assets.map((asset, index) => (
            <Pressable
              accessibilityRole="button"
              key={`${submission.id}-${asset.path}-${index}`}
              onPress={() => onOpenAsset(asset)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderColor: '#edf0e8',
                borderRadius: s(16),
                borderWidth: 1,
                flexDirection: 'row',
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: s(12),
                paddingVertical: y(11),
              })}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#f0f1eb',
                  borderRadius: 999,
                  height: s(34),
                  justifyContent: 'center',
                  width: s(34),
                }}
              >
                {getSubmissionAssetIcon(asset.kind, s(17))}
              </View>
              <Text
                selectable
                numberOfLines={1}
                style={{
                  color: '#11130f',
                  flex: 1,
                  fontSize: appFontSize(s, 14),
                  fontWeight: '800',
                  letterSpacing: -0.14,
                  lineHeight: s(20),
                  marginLeft: s(10),
                }}
              >
                {asset.name}
              </Text>
              <ExternalLink color="#8c9188" size={s(16)} strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {submission.review_note ? (
        <Text
          selectable
          style={{
            color: '#8c9188',
            fontSize: appFontSize(s, 12),
            fontWeight: '600',
            lineHeight: s(18),
            marginTop: y(10),
          }}
        >
          CrewLead note: {submission.review_note}
        </Text>
      ) : null}
    </View>
  );
}

function ViewTasksScreen({
  hasJoinedTeam,
  mySubmissions,
  onBack,
  onDeleteTask,
  onJoinTeam,
  onRefreshMySubmissions,
  onRefreshTasks,
  onRefreshTeamSubmissions,
  onSubmitTask,
  role,
  teamSubmissionsByTeamId,
  tasks,
  teams,
}: {
  hasJoinedTeam: boolean;
  mySubmissions: MyTaskSubmission[];
  onBack: () => void;
  onDeleteTask?: (taskId: string) => void | Promise<void>;
  onJoinTeam: () => void;
  onRefreshMySubmissions: () => void | Promise<void>;
  onRefreshTasks: () => void | Promise<void>;
  onRefreshTeamSubmissions: (teamId?: string) => void | Promise<void>;
  onSubmitTask: (task: TaskWithTeams, team: TeamDraft) => void;
  role: AccountRole;
  teamSubmissionsByTeamId: Record<string, TeamTaskSubmission[]>;
  tasks: TaskWithTeams[];
  teams: TeamDraft[];
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const teamNameById = new Map(
    teams
      .filter((team): team is TeamDraft & { id: string } => Boolean(team.id))
      .map((team) => [team.id, team.name]),
  );
  const [selectedTask, setSelectedTask] = useState<TaskWithTeams | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    | 'all'
    | 'pending'
    | 'submitted'
    | 'approved'
    | 'rejected'
    | 'published'
    | 'draft'
    | 'closed'
  >('all');
  const isCrewMate = role === 'crewmate';
  const statusFilters = isCrewMate
    ? (['all', 'pending', 'submitted', 'approved', 'rejected'] as const)
    : (['all', 'published', 'draft', 'closed'] as const);
  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter((task) => {
        if (isCrewMate) {
          const sub = mySubmissions.find((ms) => ms.task_id === task.id);
          const subStatus = sub?.status ?? 'none';
          if (statusFilter === 'pending') return !sub || subStatus === 'none';
          if (statusFilter === 'submitted') return subStatus === 'submitted';
          if (statusFilter === 'approved') return subStatus === 'approved' || subStatus === 'paid';
          if (statusFilter === 'rejected') return subStatus === 'rejected';
          return true;
        }
        return task.status === statusFilter;
      });

  if (selectedTask) {
    const assignedTeam = selectedTask.task_team_assignments
      ?.map((assignment) => teams.find((team) => team.id === assignment.team_id))
      .find((team): team is TeamDraft => Boolean(team));
    const selectedTaskSubmissions = mySubmissions.filter(
      (submission) =>
        submission.task_id === selectedTask.id &&
        (!assignedTeam?.id || submission.team_id === assignedTeam.id),
    );
    const selectedTeamSubmissions = assignedTeam?.id
      ? (teamSubmissionsByTeamId[assignedTeam.id] ?? []).filter(
          (submission) => submission.task_id === selectedTask.id,
        )
      : [];

    return (
      <TaskDetailScreen
        assignedTeam={assignedTeam}
        mySubmissions={selectedTaskSubmissions}
        onBack={() => setSelectedTask(null)}
        onRefreshMySubmissions={onRefreshMySubmissions}
        onRefreshTasks={onRefreshTasks}
        onRefreshTeamSubmissions={onRefreshTeamSubmissions}
        onSubmitTask={onSubmitTask}
        onTaskUpdated={(task) => setSelectedTask(task)}
        role={role}
        task={selectedTask}
        teamSubmissions={selectedTeamSubmissions}
        teams={teams}
      />
    );
  }

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 46),
          fontWeight: '900',
          letterSpacing: -1.5,
          lineHeight: s(52),
          marginTop: y(58),
        }}
      >
        {isCrewMate ? 'My Tasks' : 'Tasks'}
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 21),
          fontWeight: '400',
          lineHeight: s(30),
          marginTop: y(10),
        }}
      >
        {isCrewMate
          ? 'Tasks assigned to your joined teams will appear here.'
          : 'Published tasks and the teams they were assigned to.'}
      </Text>

      {tasks.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingBottom: y(90),
          }}
        >
          <Text
            selectable
            style={{
              color: 'rgba(5,5,5,0.5)',
              fontSize: appFontSize(s, 18),
              fontWeight: '600',
              letterSpacing: -0.25,
              lineHeight: s(25),
              textAlign: 'center',
            }}
          >
            {isCrewMate ? 'No tasks assigned yet' : 'No task has been created yet'}
          </Text>
          <Text
            selectable
            style={{
              color: 'rgba(5,5,5,0.35)',
              fontSize: appFontSize(s, 15),
              fontWeight: '400',
              lineHeight: s(22),
              marginTop: y(8),
              maxWidth: x(360),
              textAlign: 'center',
            }}
          >
            {isCrewMate
              ? hasJoinedTeam
                ? 'You are in a team. Tasks assigned by your CrewLead will show here.'
                : 'Join a team first. Once a CrewLead assigns work to your crew, it will show here.'
              : 'Create a task and assign it to a team, then it will appear here.'}
          </Text>
          {isCrewMate && !hasJoinedTeam ? (
            <Pressable
              accessibilityRole="button"
              onPress={onJoinTeam}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: palette.green,
                borderRadius: 999,
                height: s(54),
                justifyContent: 'center',
                marginTop: y(24),
                opacity: pressed ? 0.82 : 1,
                paddingHorizontal: x(28),
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text
                selectable
                style={{
                  color: palette.ink,
                  fontSize: appFontSize(s, 17),
                  fontWeight: '900',
                  letterSpacing: -0.15,
                }}
              >
                Join a team
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: '#f3f4ef',
              borderRadius: s(16),
              flexDirection: 'row',
              gap: x(3),
              marginTop: y(20),
              padding: s(4),
              width: '100%',
            }}
          >
            {statusFilters.map((f) => {
              const isActive = statusFilter === f;
              const filterLabel =
                f === 'all'
                  ? 'All'
                  : f === 'pending'
                    ? 'Pending'
                    : f === 'submitted'
                      ? 'In Review'
                      : f === 'published'
                        ? 'Active'
                        : f.charAt(0).toUpperCase() + f.slice(1);
              return (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  onPress={() => setStatusFilter(f)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    borderRadius: s(11),
                    flex: 1,
                    justifyContent: 'center',
                    minHeight: s(36),
                    opacity: pressed ? 0.75 : 1,
                    paddingHorizontal: x(4),
                    shadowColor: '#11130f',
                    shadowOffset: { height: 1, width: 0 },
                    shadowOpacity: isActive ? 0.07 : 0,
                    shadowRadius: s(4),
                  })}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: isActive ? palette.greenDeep : '#7f847b',
                      fontSize: appFontSize(s, 11.5),
                      fontWeight: isActive ? '800' : '600',
                      letterSpacing: -0.1,
                    }}
                  >
                    {filterLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {filteredTasks.length === 0 ? (
            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: y(90) }}>
              <Text style={{ color: 'rgba(5,5,5,0.45)', fontSize: appFontSize(s, 17), fontWeight: '600', textAlign: 'center' }}>
                No {statusFilter === 'all' ? '' : statusFilter === 'submitted' ? 'in-review' : statusFilter + ' '}tasks
              </Text>
            </View>
          ) : (
          <ScrollView
            contentContainerStyle={{ gap: y(12), paddingBottom: y(80), paddingTop: y(16) }}
            showsVerticalScrollIndicator={false}
          >
          {filteredTasks.map((task) => {
            const assignedTeamNames =
              task.task_team_assignments
                ?.map((assignment) => teamNameById.get(assignment.team_id))
                .filter(Boolean)
                .join(', ') || 'Assigned team';

            return (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                onPress={() => setSelectedTask(task)}
                style={({ pressed }) => ({
                  backgroundColor: '#f7f8f4',
                  borderColor: '#eceee7',
                  borderRadius: s(24),
                  borderWidth: 1,
                  opacity: pressed ? 0.62 : 1,
                  padding: s(18),
                })}
              >
                <View
                  style={{
                    alignItems: 'flex-start',
                    flexDirection: 'row',
                    gap: x(10),
                  }}
                >
                  <Text
                    selectable
                    style={{
                      color: '#11130f',
                      flex: 1,
                      fontSize: appFontSize(s, 21),
                      fontWeight: '900',
                      letterSpacing: -0.4,
                      lineHeight: s(28),
                    }}
                  >
                    {task.title}
                  </Text>
                  {!isCrewMate && onDeleteTask ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void onDeleteTask(task.id);
                      }}
                      style={({ pressed }) => ({
                        alignItems: 'center',
                        backgroundColor: pressed ? '#ffece8' : '#ffffff',
                        borderColor: '#eceee7',
                        borderRadius: 999,
                        borderWidth: 1,
                        height: s(38),
                        justifyContent: 'center',
                        opacity: pressed ? 0.72 : 1,
                        width: s(38),
                      })}
                    >
                      <Trash2 color="#b12a1c" size={s(17)} strokeWidth={2.4} />
                    </Pressable>
                  ) : null}
                </View>
                <Text
                  selectable
                  style={{
                    color: '#777b73',
                    fontSize: appFontSize(s, 15),
                    fontWeight: '600',
                    lineHeight: s(22),
                    marginTop: y(7),
                  }}
                >
                  {assignedTeamNames}
                </Text>
                <Text
                  selectable
                  style={{
                    color: '#11130f',
                    fontSize: appFontSize(s, 15),
                    fontWeight: '800',
                    lineHeight: s(22),
                    marginTop: y(13),
                  }}
                >
                  ₦{Number(task.payout_amount_naira || 0).toLocaleString()} • {task.people_needed} {task.people_needed === 1 ? 'person' : 'people'}
                </Text>
                {(() => {
                  const st = isCrewMate
                    ? (mySubmissions.find((ms) => ms.task_id === task.id)?.status ?? 'unsubmitted')
                    : task.status;
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    unsubmitted: { bg: '#f2f3ef', text: '#747a70' },
                    pending: { bg: '#fff7e0', text: '#8a6400' },
                    submitted: { bg: '#e8f0fe', text: '#1a56db' },
                    approved: { bg: '#e8f5e9', text: '#1c7a3d' },
                    paid: { bg: '#e8f5e9', text: '#1c7a3d' },
                    rejected: { bg: '#fde8e8', text: '#c0392b' },
                    done: { bg: '#e8f5e9', text: '#1c7a3d' },
                  };
                  const c = statusColors[st] ?? { bg: '#f2f3ef', text: '#747a70' };
                  return (
                    <View style={{ backgroundColor: c.bg, borderRadius: 999, marginTop: y(8), paddingHorizontal: x(10), paddingVertical: y(3), alignSelf: 'flex-start' }}>
                      <Text style={{ color: c.text, fontSize: appFontSize(s, 12), fontWeight: '800', textTransform: 'capitalize' }}>
                        {st.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  );
                })()}
              </Pressable>
            );
          })}
          </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

function TaskDetailScreen({
  assignedTeam,
  mySubmissions,
  onBack,
  onRefreshMySubmissions,
  onRefreshTasks,
  onRefreshTeamSubmissions,
  onSubmitTask,
  onTaskUpdated,
  role,
  task,
  teamSubmissions,
  teams,
}: {
  assignedTeam?: TeamDraft;
  mySubmissions: MyTaskSubmission[];
  onBack: () => void;
  onRefreshMySubmissions: () => void | Promise<void>;
  onRefreshTasks: () => void | Promise<void>;
  onRefreshTeamSubmissions: (teamId?: string) => void | Promise<void>;
  onSubmitTask: (task: TaskWithTeams, team: TeamDraft) => void;
  onTaskUpdated: (task: TaskWithTeams) => void;
  role: AccountRole;
  task: TaskWithTeams;
  teamSubmissions: TeamTaskSubmission[];
  teams: TeamDraft[];
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [taskPanel, setTaskPanel] = useState<
    'details' | 'settings' | 'submissions'
  >('details');
  const assignedTeamNames =
    task.task_team_assignments
      ?.map((assignment) =>
        teams.find((team) => team.id === assignment.team_id)?.name,
      )
      .filter(Boolean)
      .join(', ') || 'Assigned team';
  const proofTypes = task.proof_types?.length
    ? task.proof_types
    : [task.proof_type];
  const payoutAmount = Number(task.payout_amount_naira || 0);
  const isCrewMate = role === 'crewmate';
  const latestSubmission = mySubmissions[0] ?? null;
  const submissionIsLocked =
    latestSubmission?.status === 'submitted' ||
    latestSubmission?.status === 'approved' ||
    latestSubmission?.status === 'paid';
  const submissionActionLabel = latestSubmission
    ? latestSubmission.status === 'rejected'
      ? 'Resubmit proof'
      : latestSubmission.status === 'approved' || latestSubmission.status === 'paid'
        ? 'Approved'
        : 'Waiting for approval'
    : 'Submit proof';
  const openSubmitProof = useCallback(() => {
    if (!assignedTeam) {
      Alert.alert(
        'Team unavailable',
        'CrewPay could not find the team assigned to this task yet.',
      );
      return;
    }

    if (submissionIsLocked) {
      Alert.alert(
        latestSubmission?.status === 'approved' ||
          latestSubmission?.status === 'paid'
          ? 'Task already approved'
          : 'Submission pending',
        latestSubmission?.status === 'approved' ||
          latestSubmission?.status === 'paid'
          ? 'This task has already been approved for you.'
          : 'Wait for the CrewLead to approve or reject your current submission before sending another one.',
      );
      return;
    }

    onSubmitTask(task, assignedTeam);
  }, [assignedTeam, latestSubmission?.status, onSubmitTask, submissionIsLocked, task]);

  if (taskPanel === 'settings') {
    return (
      <TaskSettingsScreen
        onBack={() => setTaskPanel('details')}
        onRefreshTasks={onRefreshTasks}
        onTaskUpdated={onTaskUpdated}
        task={task}
      />
    );
  }

  if (taskPanel === 'submissions') {
    return (
      <TaskSubmissionReviewScreen
        assignedTeam={assignedTeam}
        onBack={() => setTaskPanel('details')}
        onRefreshMySubmissions={onRefreshMySubmissions}
        onRefreshTeamSubmissions={onRefreshTeamSubmissions}
        submissions={teamSubmissions}
        task={task}
      />
    );
  }

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
        <View
          style={{
            backgroundColor: '#f0f1eb',
            borderRadius: 999,
            paddingHorizontal: x(15),
            paddingVertical: y(8),
          }}
        >
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: appFontSize(s, 12),
              fontWeight: '900',
              letterSpacing: 0.2,
              textTransform: 'uppercase',
            }}
          >
            {task.status}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: y(80), paddingTop: y(46) }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          selectable
          style={{
            color: '#050505',
            fontSize: appFontSize(s, 43),
            fontWeight: '900',
            letterSpacing: -1.45,
            lineHeight: s(50),
          }}
        >
          {task.title}
        </Text>
        <Text
          selectable
          style={{
            color: '#666a62',
            fontSize: appFontSize(s, 19),
            fontWeight: '400',
            lineHeight: s(28),
            marginTop: y(12),
          }}
        >
          {task.description}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            gap: x(10),
            marginTop: y(28),
          }}
        >
          <TaskDetailMetric
            label="Payout"
            s={s}
            value={payoutAmount > 0 ? `\u20a6${payoutAmount.toLocaleString()}` : 'Decide later'}
          />
          <TaskDetailMetric
            label="People"
            s={s}
            value={String(task.people_needed)}
          />
        </View>

        <View
          style={{
            backgroundColor: '#f7f8f4',
            borderColor: '#eceee7',
            borderRadius: s(24),
            borderWidth: 1,
            marginTop: y(18),
            padding: s(18),
          }}
        >
          <TaskDetailInfoRow label="Assigned to" s={s} value={assignedTeamNames} />
          <TaskDetailInfoRow
            label="Location"
            s={s}
            value={
              task.location_note
                ? `${formatTaskLocationType(task.location_type)} - ${task.location_note}`
                : formatTaskLocationType(task.location_type)
            }
          />
          <TaskDetailInfoRow
            label="Proof required"
            s={s}
            value={formatTaskProofs(proofTypes)}
          />
          <TaskDetailInfoRow
            label="Assignment"
            s={s}
            value={formatTaskAssignmentMode(task.assignment_mode)}
          />
          <TaskDetailInfoRow label="Approval" s={s} value={task.approval_mode} />
        </View>

        <TaskDetailTextBlock
          body={task.instructions}
          s={s}
          title="Instructions"
          y={y}
        />
        <TaskDetailTextBlock
          body={task.success_criteria}
          s={s}
          title="What counts as done"
          y={y}
        />

        {isCrewMate && latestSubmission ? (
          <View
            style={{
              backgroundColor: '#f7f8f4',
              borderColor: '#eceee7',
              borderRadius: s(20),
              borderWidth: 1,
              marginTop: y(22),
              padding: s(16),
            }}
          >
            <Text
              selectable
              style={{
                color: '#11130f',
                fontSize: appFontSize(s, 16),
                fontWeight: '900',
                letterSpacing: -0.18,
                lineHeight: s(22),
              }}
            >
              Attempt {latestSubmission.attempt_number}{' '}
              {getSubmissionStatusSentence(latestSubmission.status)}.
            </Text>
            <Text
              selectable
              style={{
                color: '#747a70',
                fontSize: appFontSize(s, 14),
                fontWeight: '500',
                lineHeight: s(20),
                marginTop: y(5),
              }}
            >
              {latestSubmission.review_note ||
                (latestSubmission.status === 'rejected'
                  ? 'You can send fresh proof for this task.'
                  : 'You can send another proof only if the CrewLead rejects this attempt.')}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: y(12), marginTop: y(22) }}>
          {isCrewMate ? (
            <TaskDetailActionRow
              icon={<Upload color="#11130f" size={s(22)} strokeWidth={2.4} />}
              label={submissionActionLabel}
              onPress={openSubmitProof}
              s={s}
              scale={scale}
            />
          ) : (
            <>
              <TaskDetailActionRow
                icon={<ClipboardCheck color="#11130f" size={s(22)} strokeWidth={2.4} />}
                label="Review submissions in team"
                onPress={() => setTaskPanel('submissions')}
                s={s}
                scale={scale}
              />
              <TaskDetailActionRow
                icon={<Settings color="#11130f" size={s(22)} strokeWidth={2.4} />}
                label="Task settings"
                onPress={() => setTaskPanel('settings')}
                s={s}
                scale={scale}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TaskSettingsScreen({
  onBack,
  onRefreshTasks,
  onTaskUpdated,
  task,
}: {
  onBack: () => void;
  onRefreshTasks: () => void | Promise<void>;
  onTaskUpdated: (task: TaskWithTeams) => void;
  task: TaskWithTeams;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [assignmentMode, setAssignmentMode] = useState(task.assignment_mode);
  const [approvalMode, setApprovalMode] = useState(task.approval_mode);
  const [proofTypes, setProofTypes] = useState<CreateTaskInput['proofTypes']>(
    task.proof_types?.length ? task.proof_types : [task.proof_type],
  );
  const [saving, setSaving] = useState(false);

  const persistSettings = useCallback(
    async (next: {
      approvalMode: string;
      assignmentMode: CreateTaskInput['assignmentMode'];
      proofTypes: CreateTaskInput['proofTypes'];
    }) => {
      const nextProofTypes: CreateTaskInput['proofTypes'] =
        next.proofTypes.length > 0 ? next.proofTypes : ['text'];
      const nextProofType: CreateTaskInput['proofType'] =
        nextProofTypes[0] ?? 'text';

      setSaving(true);
      setApprovalMode(next.approvalMode);
      setAssignmentMode(next.assignmentMode);
      setProofTypes(nextProofTypes);

      try {
        const updatedTask = await updateTaskSettings(task.id, {
          approvalMode: next.approvalMode,
          assignmentMode: next.assignmentMode,
          proofType: nextProofType,
          proofTypes: nextProofTypes,
        });

        onTaskUpdated(updatedTask);
        await onRefreshTasks();
      } catch (error) {
        Alert.alert(
          'Could not save task setting',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setSaving(false);
      }
    },
    [onRefreshTasks, onTaskUpdated, task.id],
  );

  const cycleAssignment = useCallback(() => {
    const options = taskAssignmentOptions.map((option) => option.value);
    const currentIndex = options.indexOf(assignmentMode);
    const nextAssignmentMode = options[(currentIndex + 1) % options.length];

    persistSettings({
      approvalMode,
      assignmentMode: nextAssignmentMode,
      proofTypes,
    });
  }, [approvalMode, assignmentMode, persistSettings, proofTypes]);

  const cycleApproval = useCallback(() => {
    const currentIndex = taskApprovalOptions.indexOf(approvalMode);
    const nextApprovalMode =
      taskApprovalOptions[(currentIndex + 1) % taskApprovalOptions.length];

    persistSettings({
      approvalMode: nextApprovalMode,
      assignmentMode,
      proofTypes,
    });
  }, [approvalMode, assignmentMode, persistSettings, proofTypes]);

  const toggleProofType = useCallback(
    (proofType: CreateTaskInput['proofType']) => {
      const exists = proofTypes.includes(proofType);
      let nextProofTypes = exists
        ? proofTypes.filter((item) => item !== proofType)
        : [...proofTypes, proofType];

      if (proofType === 'none' && !exists) {
        nextProofTypes = ['none'];
      } else {
        nextProofTypes = nextProofTypes.filter((item) => item !== 'none');
      }

      if (nextProofTypes.length === 0) {
        nextProofTypes = ['text'];
      }

      persistSettings({
        approvalMode,
        assignmentMode,
        proofTypes: nextProofTypes,
      });
    },
    [approvalMode, assignmentMode, persistSettings, proofTypes],
  );

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 44),
          fontWeight: '900',
          letterSpacing: -1.4,
          lineHeight: s(50),
          marginTop: y(54),
        }}
      >
        Task settings
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 19),
          fontWeight: '400',
          lineHeight: s(27),
          marginTop: y(10),
        }}
      >
        Adjust how this task is claimed, reviewed, and submitted.
      </Text>

      <ScrollView
        contentContainerStyle={{ paddingBottom: y(90), paddingTop: y(28) }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsOptionGroup
          disabled={saving}
          icon={<ClipboardCheck color="#11130f" size={s(21)} strokeWidth={2.3} />}
          label="Assignment mode"
          onSelect={(nextAssignmentMode) =>
            persistSettings({
              approvalMode,
              assignmentMode: nextAssignmentMode as CreateTaskInput['assignmentMode'],
              proofTypes,
            })
          }
          options={taskAssignmentOptions}
          s={s}
          selectedValue={assignmentMode}
          x={x}
          y={y}
        />
        <SettingsOptionGroup
          disabled={saving}
          icon={<CircleCheck color="#11130f" size={s(21)} strokeWidth={2.3} />}
          label="Approval rule"
          onSelect={(nextApprovalMode) =>
            persistSettings({
              approvalMode: nextApprovalMode,
              assignmentMode,
              proofTypes,
            })
          }
          options={taskApprovalOptions.map((option) => ({
            label: option,
            value: option,
          }))}
          s={s}
          selectedValue={approvalMode}
          x={x}
          y={y}
        />

        <Text
          selectable
          style={{
            color: '#11130f',
            fontSize: appFontSize(s, 18),
            fontWeight: '900',
            letterSpacing: -0.22,
            lineHeight: s(24),
            marginBottom: y(8),
            marginTop: y(28),
          }}
        >
          Accepted proof
        </Text>
        <View style={{ gap: y(10) }}>
          {taskProofOptions.map((option) => {
            const selected = proofTypes.includes(option.value);

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                disabled={saving}
                onPress={() => toggleProofType(option.value)}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: selected ? '#eefddd' : '#ffffff',
                  borderColor: selected ? palette.green : '#eceee7',
                  borderRadius: s(20),
                  borderWidth: 1,
                  flexDirection: 'row',
                  minHeight: s(62),
                  opacity: saving ? 0.48 : pressed ? 0.66 : 1,
                  paddingHorizontal: s(16),
                })}
              >
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: selected ? palette.green : '#f4f5f0',
                    borderRadius: 999,
                    height: s(31),
                    justifyContent: 'center',
                    width: s(31),
                  }}
                >
                  {selected ? (
                    <Check color="#11130f" size={s(17)} strokeWidth={2.8} />
                  ) : null}
                </View>
                <Text
                  selectable
                  style={{
                    color: '#11130f',
                    flex: 1,
                    fontSize: appFontSize(s, 16),
                    fontWeight: '800',
                    letterSpacing: -0.18,
                    lineHeight: s(22),
                    marginLeft: s(12),
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function TaskSubmissionReviewScreen({
  assignedTeam,
  onBack,
  onRefreshMySubmissions,
  onRefreshTeamSubmissions,
  submissions,
  task,
}: {
  assignedTeam?: TeamDraft;
  onBack: () => void;
  onRefreshMySubmissions: () => void | Promise<void>;
  onRefreshTeamSubmissions: (teamId?: string) => void | Promise<void>;
  submissions: TeamTaskSubmission[];
  task: TaskWithTeams;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [reviewDraft, setReviewDraft] = useState<{
    status: Extract<TaskSubmissionRecord['status'], 'approved' | 'rejected'>;
    submission: TeamTaskSubmission;
  } | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const openSubmissionAsset = useCallback(async (asset: SubmissionAsset) => {
    try {
      if (
        asset.kind === 'location' &&
        typeof asset.latitude === 'number' &&
        typeof asset.longitude === 'number'
      ) {
        await Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${asset.latitude},${asset.longitude}`,
        );
        return;
      }

      const signedUrl = await getSubmissionAssetUrl(asset.path);
      await Linking.openURL(signedUrl);
    } catch (error) {
      Alert.alert(
        'Could not open proof',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, []);

  const submitReviewDecision = useCallback(
    async (reviewNote: string) => {
      if (!reviewDraft) {
        return;
      }

      setReviewSubmitting(true);

      try {
        await reviewTaskSubmission(
          reviewDraft.submission.id,
          reviewDraft.status,
          reviewNote,
        );
        await onRefreshTeamSubmissions(assignedTeam?.id);
        await onRefreshMySubmissions();
        setReviewDraft(null);
      } catch (error) {
        Alert.alert(
          'Could not review submission',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setReviewSubmitting(false);
      }
    },
    [assignedTeam?.id, onRefreshMySubmissions, onRefreshTeamSubmissions, reviewDraft],
  );

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 42),
          fontWeight: '900',
          letterSpacing: -1.35,
          lineHeight: s(49),
          marginTop: y(54),
        }}
      >
        Review submissions
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 18),
          fontWeight: '400',
          lineHeight: s(26),
          marginTop: y(10),
        }}
      >
        {assignedTeam
          ? `${assignedTeam.name} proof for "${task.title}".`
          : 'CrewPay could not find the assigned team for this task yet.'}
      </Text>

      {submissions.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingBottom: y(120),
          }}
        >
          <Text
            selectable
            style={{
              color: 'rgba(5,5,5,0.52)',
              fontSize: appFontSize(s, 18),
              fontWeight: '700',
              letterSpacing: -0.22,
              lineHeight: s(25),
              textAlign: 'center',
            }}
          >
            No submissions yet
          </Text>
          <Text
            selectable
            style={{
              color: 'rgba(5,5,5,0.34)',
              fontSize: appFontSize(s, 15),
              fontWeight: '400',
              lineHeight: s(22),
              marginTop: y(8),
              maxWidth: x(360),
              textAlign: 'center',
            }}
          >
            When a CrewMate submits proof for this task, it will appear here for
            approval or rejection.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: y(12), paddingBottom: y(90), paddingTop: y(28) }}
          showsVerticalScrollIndicator={false}
        >
          {submissions.map((submission) => (
            <TeamSubmissionReviewCard
              key={submission.id}
              onOpenAsset={openSubmissionAsset}
              onReview={(item, status) => setReviewDraft({ submission: item, status })}
              s={s}
              submission={submission}
              y={y}
            />
          ))}
        </ScrollView>
      )}
      <SubmissionReviewSheet
        decision={reviewDraft?.status ?? null}
        isSubmitting={reviewSubmitting}
        memberName={reviewDraft?.submission.member_name ?? ''}
        onClose={() => {
          if (!reviewSubmitting) {
            setReviewDraft(null);
          }
        }}
        onSubmit={submitReviewDecision}
        taskTitle={reviewDraft?.submission.task_title ?? task.title}
        visible={Boolean(reviewDraft)}
      />
    </View>
  );
}

function TaskDetailMetric({
  label,
  s,
  value,
}: {
  label: string;
  s: (value: number) => number;
  value: string;
}) {
  return (
    <View
      style={{
        backgroundColor: '#f7f8f4',
        borderColor: '#eceee7',
        borderRadius: s(20),
        borderWidth: 1,
        flex: 1,
        minHeight: s(84),
        paddingHorizontal: s(15),
        paddingVertical: s(13),
      }}
    >
      <Text
        selectable
        numberOfLines={1}
        style={{
          color: '#11130f',
          fontSize: appFontSize(s, 20),
          fontWeight: '900',
          letterSpacing: -0.4,
          lineHeight: s(27),
        }}
      >
        {value}
      </Text>
      <Text
        selectable
        style={{
          color: '#8c9188',
          fontSize: appFontSize(s, 12),
          fontWeight: '700',
          lineHeight: s(17),
          marginTop: s(4),
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function TaskDetailInfoRow({
  label,
  s,
  value,
}: {
  label: string;
  s: (value: number) => number;
  value: string;
}) {
  return (
    <View
      style={{
        borderBottomColor: '#e8eae3',
        borderBottomWidth: 1,
        paddingVertical: s(13),
      }}
    >
      <Text
        selectable
        style={{
          color: '#8c9188',
          fontSize: appFontSize(s, 12),
          fontWeight: '800',
          letterSpacing: 0.1,
          lineHeight: s(17),
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: '#11130f',
          fontSize: appFontSize(s, 17),
          fontWeight: '700',
          letterSpacing: -0.2,
          lineHeight: s(24),
          marginTop: s(3),
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function TaskDetailTextBlock({
  body,
  s,
  title,
  y,
}: {
  body: string;
  s: (value: number) => number;
  title: string;
  y: (value: number) => number;
}) {
  return (
    <View style={{ marginTop: y(24) }}>
      <Text
        selectable
        style={{
          color: '#11130f',
          fontSize: appFontSize(s, 20),
          fontWeight: '900',
          letterSpacing: -0.3,
          lineHeight: s(27),
        }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 17),
          fontWeight: '400',
          lineHeight: s(25),
          marginTop: y(7),
        }}
      >
        {body}
      </Text>
    </View>
  );
}

function TaskDetailActionRow({
  icon,
  label,
  onPress,
  s,
  scale,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  s: (value: number) => number;
  scale: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#eceee7',
        borderRadius: s(22),
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: s(70),
        opacity: pressed ? 0.62 : 1,
        paddingHorizontal: s(16),
      })}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#f4f5f0',
          borderRadius: 999,
          height: s(42),
          justifyContent: 'center',
          width: s(42),
        }}
      >
        {icon}
      </View>
      <Text
        selectable
        style={{
          color: '#11130f',
          flex: 1,
          fontSize: appFontSize(s, 17),
          fontWeight: '800',
          letterSpacing: -0.2,
          lineHeight: s(23),
          marginLeft: s(13),
        }}
      >
        {label}
      </Text>
      <ChevronRightIcon scale={scale * 0.62} />
    </Pressable>
  );
}

function TeamSettingsScreen({
  onBack,
  onTeamUpdated,
  role,
  team,
}: {
  onBack: () => void;
  onTeamUpdated: (team: TeamDraft) => void;
  role: AccountRole;
  team: TeamDraft;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [assignmentRule, setAssignmentRule] = useState(team.taskAssignmentRule);
  const [joinRule, setJoinRule] = useState(team.joinRule);
  const [permissionsRule, setPermissionsRule] = useState(team.permissions);
  const [proofRule, setProofRule] = useState(team.defaultProofRule);
  const [payoutRule, setPayoutRule] = useState(team.taskPayoutRule);
  const [visibilityRule, setVisibilityRule] = useState(
    team.taskVisibilityRule,
  );
  const [savingSetting, setSavingSetting] = useState(false);
  const isCrewMate = role === 'crewmate';
  const persistSettings = useCallback(
    async (settings: TeamTaskSettings) => {
      if (!team.id) {
        Alert.alert('Team is still syncing', 'Please try again in a moment.');
        return;
      }

      setSavingSetting(true);

      try {
        const record = await updateTeamTaskSettings(team.id, settings);
        const updatedTeam = teamRecordToDraft(record);

        onTeamUpdated(updatedTeam);
      } catch (error) {
        Alert.alert(
          'Could not save setting',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setSavingSetting(false);
      }
    },
    [onTeamUpdated, team.id],
  );
  const persistAccessSettings = useCallback(
    async (settings: Pick<TeamDraft, 'joinRule' | 'permissions'>) => {
      if (!team.id) {
        Alert.alert('Team is still syncing', 'Please try again in a moment.');
        return;
      }

      setSavingSetting(true);

      try {
        const record = await updateTeamAccessSettings(team.id, settings);
        const updatedTeam = teamRecordToDraft(record);

        onTeamUpdated(updatedTeam);
      } catch (error) {
        Alert.alert(
          'Could not save setting',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setSavingSetting(false);
      }
    },
    [onTeamUpdated, team.id],
  );
  const cycleSetting = useCallback(
    (
      options: string[],
      current: string,
      setValue: (value: string) => void,
      buildSettings: (value: string) => TeamTaskSettings,
    ) => {
      const currentIndex = options.indexOf(current);
      const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
      const nextValue = options[nextIndex % options.length];

      setValue(nextValue);
      persistSettings(buildSettings(nextValue));
    },
    [persistSettings],
  );
  const cycleAccessSetting = useCallback(
    (
      options: string[],
      current: string,
      setValue: (value: string) => void,
      buildSettings: (value: string) => Pick<TeamDraft, 'joinRule' | 'permissions'>,
    ) => {
      const currentIndex = options.indexOf(current);
      const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
      const nextValue = options[nextIndex % options.length];

      setValue(nextValue);
      persistAccessSettings(buildSettings(nextValue));
    },
    [persistAccessSettings],
  );

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <StatusBar style="dark" />
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 44),
          fontWeight: '900',
          letterSpacing: -1.4,
          lineHeight: s(50),
          marginTop: y(54),
        }}
      >
        {isCrewMate ? 'Team access' : 'Team settings'}
      </Text>
      <Text
        selectable
        style={{
          color: '#666a62',
          fontSize: appFontSize(s, 19),
          fontWeight: '400',
          lineHeight: s(27),
          marginTop: y(10),
        }}
      >
        {isCrewMate
          ? 'View your team access, submission rules, and payout expectations.'
          : 'Keep team rules, permissions, and payout controls in one place.'}
      </Text>

      <ScrollView
        contentContainerStyle={{ paddingBottom: y(80), paddingTop: y(26) }}
        showsVerticalScrollIndicator={false}
      >
        <TeamSettingsRow
          icon={<TeamAvatar initials={getTeamInitials(team.name)} s={s} size={36} />}
          label="Team name"
          s={s}
          scale={scale}
          value={team.name}
        />
        {isCrewMate ? (
          <>
            <TeamSettingsRow
              icon={<Link2 color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Your access"
              s={s}
              scale={scale}
              value="Approved team member"
            />
            <TeamSettingsRow
              icon={<Upload color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Submission requirements"
              s={s}
              scale={scale}
              value={proofRule}
            />
            <TeamSettingsRow
              icon={<Users color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Task visibility"
              s={s}
              scale={scale}
              value={visibilityRule}
            />
            <TeamSettingsRow
              icon={<CreditCard color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Payout handling"
              s={s}
              scale={scale}
              value={payoutRule}
            />
          </>
        ) : null}
        {!isCrewMate ? (
          <>
            <SettingsOptionGroup
              disabled={savingSetting}
              icon={<Link2 color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Invite and join rule"
              onSelect={(nextJoinRule) => {
                setJoinRule(nextJoinRule);
                persistAccessSettings({
                  joinRule: nextJoinRule,
                  permissions: permissionsRule,
                });
              }}
              options={teamJoinOptions.map((option) => ({
                label: option,
                value: option,
              }))}
              s={s}
              selectedValue={joinRule}
              x={x}
              y={y}
            />
            <SettingsOptionGroup
              disabled={savingSetting}
              icon={<Users color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Member permissions"
              onSelect={(nextPermissionsRule) => {
                setPermissionsRule(nextPermissionsRule);
                persistAccessSettings({
                  joinRule,
                  permissions: nextPermissionsRule,
                });
              }}
              options={teamPermissionOptions.map((option) => ({
                label: option,
                value: option,
              }))}
              s={s}
              selectedValue={permissionsRule}
              x={x}
              y={y}
            />
            <TeamSettingsRow
              icon={<CreditCard color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Payment approval"
              s={s}
              scale={scale}
              value="Manual approval before payout"
            />
            <TeamSettingsRow
              icon={<Upload color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Submission requirements"
              s={s}
              scale={scale}
              value="Admins can decide per task"
            />
            <TeamSettingsRow
              icon={<ClipboardCheck color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Team structure"
              s={s}
              scale={scale}
              value={formatTeamStructure(team.structureType)}
            />
            <TeamSettingsRow
              icon={<Settings color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Batch payout rules"
              s={s}
              scale={scale}
              value="Approve eligible payouts before transfer"
            />
            <SettingsOptionGroup
              disabled={savingSetting}
              icon={<ClipboardCheck color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Task assignment rules"
              onSelect={(taskAssignmentRule) => {
                setAssignmentRule(taskAssignmentRule);
                persistSettings({
                  defaultProofRule: proofRule,
                  taskAssignmentRule,
                  taskPayoutRule: payoutRule,
                  taskVisibilityRule: visibilityRule,
                });
              }}
              options={[
                'Admins choose per task',
                'Members can claim tasks',
                'First come first served',
                'Multiple people can complete',
              ].map((option) => ({ label: option, value: option }))}
              s={s}
              selectedValue={assignmentRule}
              x={x}
              y={y}
            />
            <SettingsOptionGroup
              disabled={savingSetting}
              icon={<Upload color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Default proof rules"
              onSelect={(defaultProofRule) => {
                setProofRule(defaultProofRule);
                persistSettings({
                  defaultProofRule,
                  taskAssignmentRule: assignmentRule,
                  taskPayoutRule: payoutRule,
                  taskVisibilityRule: visibilityRule,
                });
              }}
              options={[
                'Photo, video, text, or document',
                'Photo required',
                'Text confirmation only',
                'No proof by default',
              ].map((option) => ({ label: option, value: option }))}
              s={s}
              selectedValue={proofRule}
              x={x}
              y={y}
            />
            <SettingsOptionGroup
              disabled={savingSetting}
              icon={<CreditCard color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Task payout editing"
              onSelect={(taskPayoutRule) => {
                setPayoutRule(taskPayoutRule);
                persistSettings({
                  defaultProofRule: proofRule,
                  taskAssignmentRule: assignmentRule,
                  taskPayoutRule,
                  taskVisibilityRule: visibilityRule,
                });
              }}
              options={[
                'Admins can decide per member',
                'Same amount for everyone',
                'Require approval before edits',
              ].map((option) => ({ label: option, value: option }))}
              s={s}
              selectedValue={payoutRule}
              x={x}
              y={y}
            />
            <SettingsOptionGroup
              disabled={savingSetting}
              icon={<Users color="#11130f" size={s(21)} strokeWidth={2.3} />}
              label="Task visibility"
              onSelect={(taskVisibilityRule) => {
                setVisibilityRule(taskVisibilityRule);
                persistSettings({
                  defaultProofRule: proofRule,
                  taskAssignmentRule: assignmentRule,
                  taskPayoutRule: payoutRule,
                  taskVisibilityRule,
                });
              }}
              options={[
                'Assigned team members can view',
                'Only admins until published',
                'Anyone with team link can view',
              ].map((option) => ({ label: option, value: option }))}
              s={s}
              selectedValue={visibilityRule}
              x={x}
              y={y}
            />
          </>
        ) : null}

        {!isCrewMate ? (
          <View
          style={{
            backgroundColor: '#fff7f3',
            borderColor: '#f2ded4',
            borderRadius: s(22),
            borderWidth: 1,
            marginTop: y(24),
            padding: s(18),
          }}
        >
          <Text
            selectable
            style={{
              color: '#7f2d1a',
              fontSize: appFontSize(s, 17),
              fontWeight: '900',
              letterSpacing: -0.22,
              lineHeight: s(24),
            }}
          >
            Advanced controls
          </Text>
          <Text
            selectable
            style={{
              color: '#9a6557',
              fontSize: appFontSize(s, 14),
              fontWeight: '500',
              lineHeight: s(21),
              marginTop: y(5),
            }}
          >
            Use these settings to keep task rules, proof requirements, and
            payout approval behavior aligned before your team starts work.
          </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SettingsOptionGroup({
  disabled = false,
  icon,
  label,
  onSelect,
  options,
  s,
  selectedValue,
  x,
  y,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onSelect: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  s: (value: number) => number;
  selectedValue: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View
      style={{
        borderBottomColor: '#eff0eb',
        borderBottomWidth: 1,
        paddingBottom: y(18),
        paddingTop: y(16),
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#f4f5f0',
            borderRadius: 999,
            height: s(46),
            justifyContent: 'center',
            width: s(46),
          }}
        >
          {icon}
        </View>
        <Text
          selectable
          style={{
            color: '#11130f',
            flex: 1,
            fontSize: appFontSize(s, 18),
            fontWeight: '900',
            letterSpacing: -0.22,
            lineHeight: s(24),
            marginLeft: s(13),
          }}
        >
          {label}
        </Text>
      </View>

      <View style={{ gap: y(9), marginTop: y(13) }}>
        {options.map((option) => {
          const selected = option.value === selectedValue;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? '#f1fce9' : '#ffffff',
                borderColor: selected ? palette.greenDeep : '#e1e3dc',
                borderRadius: s(18),
                borderWidth: selected ? 2 : 1,
                flexDirection: 'row',
                minHeight: y(58),
                opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
                paddingHorizontal: x(16),
              })}
            >
              <View
                style={{
                  alignItems: 'center',
                  borderColor: selected ? palette.greenDeep : '#b7bab2',
                  borderRadius: 999,
                  borderWidth: 1.6,
                  height: s(22),
                  justifyContent: 'center',
                  marginRight: x(12),
                  width: s(22),
                }}
              >
                {selected ? (
                  <View
                    style={{
                      backgroundColor: palette.greenDeep,
                      borderRadius: 999,
                      height: s(10),
                      width: s(10),
                    }}
                  />
                ) : null}
              </View>
              <Text
                selectable
                style={{
                  color: palette.ink,
                  flex: 1,
                  fontSize: appFontSize(s, 16),
                  fontWeight: selected ? '800' : '500',
                  letterSpacing: -0.16,
                  lineHeight: s(22),
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TeamSettingsRow({
  disabled = false,
  icon,
  label,
  onPress,
  s,
  scale,
  value,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  s: (value: number) => number;
  scale: number;
  value: string;
}) {
  const isInteractive = Boolean(onPress);

  return (
    <Pressable
      accessibilityRole={isInteractive ? 'button' : undefined}
      disabled={disabled || !isInteractive}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderBottomColor: '#eff0eb',
        borderBottomWidth: 1,
        flexDirection: 'row',
        minHeight: s(74),
        opacity: disabled ? 0.46 : pressed && isInteractive ? 0.62 : 1,
      })}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#f4f5f0',
          borderRadius: 999,
          height: s(46),
          justifyContent: 'center',
          width: s(46),
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, marginLeft: s(13) }}>
        <Text
          selectable
          style={{
            color: '#11130f',
            fontSize: appFontSize(s, 17),
            fontWeight: '800',
            letterSpacing: -0.2,
            lineHeight: s(23),
          }}
        >
          {label}
        </Text>
        <Text
          selectable
          numberOfLines={1}
          style={{
            color: '#8c9188',
            fontSize: appFontSize(s, 14),
            fontWeight: '500',
            lineHeight: s(20),
            marginTop: s(1),
          }}
        >
          {value}
        </Text>
      </View>
      {isInteractive ? <ChevronRightIcon scale={scale * 0.62} /> : null}
    </Pressable>
  );
}

function getTeamInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'CP';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTeamStructure(structure: TeamDraft['structureType']) {
  return structure
    .split('-')
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ');
}

function CreateTeamFlow({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: (team: TeamDraft) => void | Promise<void>;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const [step, setStep] = useState<TeamCreationStep>('name');
  const [draft, setDraft] = useState<TeamDraft>({
    category: '',
    categoryPreset: '',
    customCategory: '',
    defaultProofRule: defaultTeamTaskSettings.defaultProofRule,
    joinRule: '',
    location: '',
    name: '',
    payoutMethod: '',
    permissions: '',
    structureType: 'custom',
    taskAssignmentRule: defaultTeamTaskSettings.taskAssignmentRule,
    taskPayoutRule: defaultTeamTaskSettings.taskPayoutRule,
    taskVisibilityRule: defaultTeamTaskSettings.taskVisibilityRule,
  });
  const transition = useRef(new Animated.Value(1)).current;
  const transitionDirection = useRef(1);
  const [submitting, setSubmitting] = useState(false);
  const stepIndex = teamCreationSteps.indexOf(step);

  const goToStep = useCallback(
    (nextStep: TeamCreationStep, direction = 1) => {
      transitionDirection.current = direction;
      setStep(nextStep);
    },
    [],
  );

  const updateDraft = useCallback((patch: Partial<TeamDraft>) => {
    setDraft((value) => ({ ...value, ...patch }));
  }, []);

  const selectCategory = useCallback(
    (categoryPreset: string) => {
      const structureType =
        teamCategoryStructure[categoryPreset] ?? teamCategoryStructure.Other;

      updateDraft({
        category:
          categoryPreset === 'Other' ? draft.customCategory : categoryPreset,
        categoryPreset,
        structureType,
      });
    },
    [draft.customCategory, updateDraft],
  );

  const setCustomCategory = useCallback(
    (customCategory: string) => {
      updateDraft({
        category: customCategory,
        customCategory,
        structureType: 'custom',
      });
    },
    [updateDraft],
  );

  const goNext = useCallback(async () => {
    if (submitting) {
      return;
    }

    const nextStep = teamCreationSteps[stepIndex + 1];

    if (nextStep) {
      goToStep(nextStep, 1);
      return;
    }

    setSubmitting(true);

    try {
      await onComplete({
        ...draft,
        category: draft.category.trim(),
        customCategory: draft.customCategory.trim(),
        location: draft.location.trim() || 'Remote',
        name: draft.name.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }, [draft, goToStep, onComplete, stepIndex, submitting]);

  const goBack = useCallback(() => {
    const previousStep = teamCreationSteps[stepIndex - 1];

    if (previousStep) {
      goToStep(previousStep, -1);
      return;
    }

    onBack();
  }, [goToStep, onBack, stepIndex]);

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [step, transition]);

  const animatedStyle = Platform.OS === 'web' ? {} : {
    opacity: transition,
    transform: [
      {
        translateX: transition.interpolate({
          inputRange: [0, 1],
          outputRange: [transitionDirection.current * 24, 0],
        }),
      },
    ],
  };

  const common = { height, s, scale, width, x, y };
  const canContinue =
    step === 'name'
      ? draft.name.trim().length >= 2
      : step === 'category'
        ? draft.categoryPreset === 'Other'
          ? draft.customCategory.trim().length >= 2
          : draft.category.length > 0
        : step === 'location'
          ? draft.location.trim().length > 0
          : step === 'join'
            ? draft.joinRule.length > 0
            : step === 'payout'
              ? draft.payoutMethod.length > 0
              : step === 'permissions'
                ? draft.permissions.length > 0
                : true;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ backgroundColor: '#ffffff', flex: 1 }}
    >
      <StatusBar style="dark" />
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {step === 'name' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="This is what you and your members will see across tasks, payouts, and team activity."
            title="What should we call this team?"
          >
            <TeamTextField
              label="Team name"
              onChangeText={(name) => updateDraft({ name })}
              placeholder="CrewPay Task Crew"
              s={s}
              value={draft.name}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}
        {step === 'category' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Choose the best default. You can still create other kinds of tasks later."
            title="What kind of tasks will this team handle?"
          >
            <TeamOptionList
              options={teamCategoryOptions}
              s={s}
              selected={draft.categoryPreset}
              setSelected={selectCategory}
              x={x}
              y={y}
            />
            {draft.categoryPreset === 'Other' ? (
              <TeamTextField
                label="Task type"
                onChangeText={setCustomCategory}
                placeholder="Tell us what this team handles"
                s={s}
                value={draft.customCategory}
                x={x}
                y={y}
              />
            ) : null}
          </TeamQuestionPage>
        ) : null}
        {step === 'location' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Use a city, area, or write Remote if the work happens online."
            title="Where will this team work?"
          >
            <TeamTextField
              label="Location"
              onChangeText={(location) => updateDraft({ location })}
              placeholder="Lagos, Lekki, or Remote"
              s={s}
              value={draft.location}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}
        {step === 'join' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="This controls how new members get into the team before they can be assigned work."
            title="How should people join?"
          >
            <TeamOptionList
              options={teamJoinOptions}
              s={s}
              selected={draft.joinRule}
              setSelected={(joinRule) => updateDraft({ joinRule })}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}
        {step === 'payout' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Continue"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="This will become the default payout rail when tasks are approved."
            title="How should this team get paid?"
          >
            <TeamOptionList
              options={teamPayoutOptions}
              s={s}
              selected={draft.payoutMethod}
              setSelected={(payoutMethod) => updateDraft({ payoutMethod })}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}
        {step === 'permissions' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel="Review team"
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="CrewPay will use this later for task creation permissions and approvals."
            title="Who can create tasks here?"
          >
            <TeamOptionList
              options={teamPermissionOptions}
              s={s}
              selected={draft.permissions}
              setSelected={(permissions) => updateDraft({ permissions })}
              x={x}
              y={y}
            />
          </TeamQuestionPage>
        ) : null}
        {step === 'review' ? (
          <TeamQuestionPage
            {...common}
            buttonLabel={submitting ? 'Creating team...' : 'Create team'}
            canContinue={!submitting}
            onBack={goBack}
            onContinue={goNext}
            stepIndex={stepIndex}
            subtitle="Check the setup before we create the team. These values are structured for the backend later."
            title="Review your team"
          >
            <View style={{ gap: y(12), marginTop: y(30) }}>
              <TeamReviewRow label="Team name" s={s} value={draft.name} />
              <TeamReviewRow label="Task type" s={s} value={draft.category} />
              <TeamReviewRow label="Location" s={s} value={draft.location} />
              <TeamReviewRow label="Join rule" s={s} value={draft.joinRule} />
              <TeamReviewRow
                label="Payout"
                s={s}
                value={draft.payoutMethod}
              />
              <TeamReviewRow
                label="Task creators"
                s={s}
                value={draft.permissions}
              />
            </View>
          </TeamQuestionPage>
        ) : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function TeamQuestionPage({
  buttonLabel,
  canContinue,
  children,
  onBack,
  onContinue,
  s,
  scale,
  stepIndex,
  subtitle,
  title,
  totalSteps = teamCreationSteps.length,
  x,
  y,
}: SetupMetrics & {
  buttonLabel: string;
  canContinue: boolean;
  children: ReactNode;
  onBack: () => void;
  onContinue: () => void;
  stepIndex: number;
  subtitle: string;
  title: string;
  totalSteps?: number;
}) {
  const questionContent = (
    <View>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
        <Text
          selectable
          style={{
            color: '#9c9f99',
            fontSize: appFontSize(s, 16),
            fontWeight: '600',
            letterSpacing: -0.1,
          }}
        >
          Step {stepIndex + 1} of {totalSteps}
        </Text>
      </View>
      <Text
        selectable
        style={{
          color: '#0b0c0a',
          fontSize: appFontSize(s, 44),
          fontWeight: '900',
          letterSpacing: -1.35,
          lineHeight: s(50),
          marginTop: y(44),
        }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: '#595c56',
          fontSize: appFontSize(s, 23),
          fontWeight: '400',
          letterSpacing: -0.25,
          lineHeight: s(34),
          marginTop: y(14),
        }}
      >
        {subtitle}
      </Text>
      <View style={{ paddingBottom: y(10) }}>{children}</View>
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingBottom: y(42),
        paddingHorizontal: x(25),
        paddingTop: y(88),
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: y(34),
        }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {Platform.OS === 'web' ? (
          questionContent
        ) : (
          <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
            {questionContent}
          </TouchableWithoutFeedback>
        )}
      </ScrollView>
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingTop: y(12),
        }}
      >
        <TeamContinueButton
          disabled={!canContinue}
          label={buttonLabel}
          onPress={onContinue}
          s={s}
        />
      </View>
    </View>
  );
}

function TeamTextField({
  label,
  onChangeText,
  placeholder,
  s,
  value,
  x,
  y,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  s: (value: number) => number;
  value: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <View style={{ marginTop: y(42) }}>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 18),
          fontWeight: '800',
          lineHeight: s(25),
        }}
      >
        {label}
      </Text>
      <TextInput
        autoCapitalize="words"
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor="#aeb1a8"
        style={{
          borderColor: isActive ? palette.greenDeep : '#a3a49f',
          borderRadius: s(12),
          borderWidth: isActive ? 2.2 : 1.25,
          color: palette.ink,
          fontSize: appFontSize(s, 22),
          fontWeight: '400',
          height: y(66),
          marginTop: y(8),
          paddingHorizontal: x(20),
        }}
        value={value}
      />
    </View>
  );
}

function TeamOptionList({
  options,
  s,
  selected,
  setSelected,
  x,
  y,
}: {
  options: string[];
  s: (value: number) => number;
  selected: string;
  setSelected: (value: string) => void;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <View style={{ gap: y(12), marginTop: y(36) }}>
      {options.map((option) => (
        <Pressable
          accessibilityRole="button"
          key={option}
          onPress={() => setSelected(option)}
          style={({ pressed }) => {
            const isSelected = selected === option;

            return {
              alignItems: 'center',
              backgroundColor: isSelected ? '#f1fce9' : '#ffffff',
              borderColor: isSelected ? palette.greenDeep : '#d4d6d0',
              borderRadius: s(18),
              borderWidth: isSelected ? 2 : 1.2,
              flexDirection: 'row',
              minHeight: y(64),
              opacity: pressed ? 0.72 : 1,
              paddingHorizontal: x(18),
            };
          }}
        >
          <View
            style={{
              alignItems: 'center',
              borderColor: selected === option ? palette.greenDeep : '#b7bab2',
              borderRadius: 999,
              borderWidth: 1.6,
              height: s(22),
              justifyContent: 'center',
              marginRight: x(14),
              width: s(22),
            }}
          >
            {selected === option ? (
              <View
                style={{
                  backgroundColor: palette.greenDeep,
                  borderRadius: 999,
                  height: s(10),
                  width: s(10),
                }}
              />
            ) : null}
          </View>
          <Text
            selectable
            style={{
              color: palette.ink,
              flex: 1,
              fontSize: appFontSize(s, 20),
              fontWeight: selected === option ? '800' : '500',
              letterSpacing: -0.22,
              lineHeight: s(26),
            }}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TeamReviewRow({
  label,
  s,
  value,
}: {
  label: string;
  s: (value: number) => number;
  value: string;
}) {
  return (
    <View
      style={{
        borderBottomColor: '#eceee8',
        borderBottomWidth: 1,
        paddingBottom: s(13),
      }}
    >
      <Text
        selectable
        style={{
          color: '#858982',
          fontSize: appFontSize(s, 15),
          fontWeight: '600',
          lineHeight: s(21),
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 20),
          fontWeight: '700',
          lineHeight: s(28),
          marginTop: s(2),
        }}
      >
        {value || 'Not set'}
      </Text>
    </View>
  );
}

function TeamContinueButton({
  disabled,
  label,
  onPress,
  s,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  s: (value: number) => number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: disabled ? '#dfe5db' : palette.green,
        borderRadius: 999,
        height: s(70),
        justifyContent: 'center',
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Text
        selectable
        style={{
          color: disabled ? '#8c9487' : palette.ink,
          fontSize: appFontSize(s, 24),
          fontWeight: '800',
          letterSpacing: -0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TopUpAmountScreen({
  amount,
  onBack,
  onChangeAmount,
  onReview,
  s,
  width,
  x,
  y,
}: {
  amount: string;
  onBack: () => void;
  onChangeAmount: (value: string) => void;
  onReview: () => void;
  s: (value: number) => number;
  width: number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const amountValue = parseMoneyAmount(amount);
  const displayAmount = formatMoneyInput(amount);
  const decimalAmount = formatNaira(amountValue);

  const pressDigit = useCallback(
    (value: string) => {
      if (value === '.') {
        if (!amount.includes('.')) {
          onChangeAmount(amount ? `${amount}.` : '0.');
        }
        return;
      }

      if (amount === '0') {
        onChangeAmount(value);
        return;
      }

      const [, decimal = ''] = amount.split('.');
      if (amount.includes('.') && decimal.length >= 2) {
        return;
      }

      onChangeAmount(`${amount}${value}`.slice(0, 11));
    },
    [amount, onChangeAmount],
  );

  const deleteDigit = useCallback(() => {
    onChangeAmount(amount.slice(0, -1));
  }, [amount, onChangeAmount]);

  const sheetProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    sheetProgress.setValue(1);
    Animated.timing(sheetProgress, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [sheetProgress]);

  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, y(760)],
  });

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 30,
      }}
    >
      <StatusBar style="light" />
      <BlurView
        intensity={28}
        tint="light"
        style={{
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: 'rgba(0,0,0,0.72)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <Animated.View
        style={[
          {
            backgroundColor: '#d7d7d7',
            borderRadius: s(10),
            height: y(78),
            left: x(22),
            opacity: 0.86,
            position: 'absolute',
            right: x(22),
            top: y(100),
          },
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      />
      <Animated.View
        style={[
          {
            backgroundColor: '#ffffff',
            borderTopLeftRadius: s(20),
            borderTopRightRadius: s(20),
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: y(118),
          },
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => ({
            alignItems: 'center',
            height: s(46),
            justifyContent: 'center',
            left: x(28),
            opacity: pressed ? 0.45 : 1,
            position: 'absolute',
            top: y(50),
            width: s(46),
          })}
        >
          <ArrowLeftIcon scale={s(1) * 0.8} />
        </Pressable>
        <Text
          selectable
          style={{
            alignSelf: 'center',
            color: '#050505',
            fontSize: appFontSize(s, 27),
            fontWeight: '900',
            letterSpacing: -0.65,
            lineHeight: s(35),
            marginTop: y(53),
          }}
        >
          Enter amount
        </Text>
        <View
          style={{
            left: x(51),
            position: 'absolute',
            right: x(51),
            top: y(350),
          }}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row' }}>
            <NairaBadge size={s(31)} />
            <Text
              selectable
              style={{
                color: '#050505',
                fontSize: appFontSize(s, 25),
                fontWeight: '800',
                letterSpacing: -0.45,
                marginLeft: x(13),
              }}
            >
              NGN
            </Text>
          </View>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: y(23),
            }}
          >
            <Text
              selectable
              style={{
                color: '#000000',
                flex: 1,
                fontSize: appFontSize(s, 58),
                fontWeight: '800',
                letterSpacing: -2.2,
                lineHeight: s(66),
              }}
            >
              {nairaSymbol}
              {displayAmount}
            </Text>
            <Text
              selectable
              style={{
                color: '#000000',
                display: 'none',
                flex: 1,
                fontSize: appFontSize(s, 58),
                fontWeight: '800',
                letterSpacing: -2.2,
                lineHeight: s(66),
              }}
            >
              ₦{displayAmount}
            </Text>
            <View
              style={{
                alignItems: 'center',
                borderColor: '#ededed',
                borderRadius: 999,
                borderWidth: 1,
                height: y(47),
                justifyContent: 'center',
                width: x(99),
              }}
            >
              <Text
                selectable
                style={{
                  color: '#bdbfc1',
                  fontSize: appFontSize(s, 21),
                  fontWeight: '800',
                  letterSpacing: -0.4,
                }}
              >
                MAX
              </Text>
            </View>
          </View>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: y(5),
            }}
          >
            <Text
              selectable
              style={{
                color: '#b8babc',
                fontSize: appFontSize(s, 19),
                fontWeight: '600',
              }}
            >
              {nairaSymbol}
              {decimalAmount}
            </Text>
            <Text
              selectable
              style={{
                color: '#b8babc',
                display: 'none',
                fontSize: appFontSize(s, 19),
                fontWeight: '600',
              }}
            >
              ₦{decimalAmount}
            </Text>
            <Text
              selectable
              style={{
                color: '#b8babc',
                fontSize: appFontSize(s, 19),
                fontWeight: '600',
              }}
            >
              {displayAmount}
            </Text>
          </View>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              marginTop: y(36),
            }}
          >
            <ExpoImage
              cachePolicy="memory-disk"
              contentFit="contain"
              source={passcodeSecuredImage}
              transition={0}
              style={{
                height: s(62),
                marginRight: x(18),
                width: s(62),
              }}
            />
            <View>
              <Text
                selectable
                style={{
                  color: '#b8babc',
                  fontSize: appFontSize(s, 20),
                  fontWeight: '700',
                  letterSpacing: -0.35,
                  lineHeight: s(28),
                }}
              >
                To:{' '}
                <Text style={{ color: '#050505', fontWeight: '900' }}>
                  CrewPay Wallet
                </Text>
              </Text>
              <Text
                selectable
                style={{
                  color: '#b8babc',
                  fontSize: appFontSize(s, 18),
                  fontWeight: '600',
                  lineHeight: s(26),
                  marginTop: y(4),
                }}
            >
                Fund through Flutterwave after review
              </Text>
            </View>
          </View>
        </View>
        <TopUpKeypad
          bottom={y(82)}
          disabled={amountValue <= 0}
          deleteDigit={deleteDigit}
          onReview={onReview}
          pressDigit={pressDigit}
          s={s}
          width={width}
          x={x}
          y={y}
        />
      </Animated.View>
    </View>
  );
}

function TopUpReviewScreen({
  amount,
  onBack,
  onContinue,
  s,
  x,
  y,
}: {
  amount: string;
  onBack: () => void;
  onContinue: () => void;
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const amountValue = parseMoneyAmount(amount);
  const displayAmount = formatMoneyInput(amount);
  const sheetProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    sheetProgress.setValue(1);
    Animated.timing(sheetProgress, {
      duration: 330,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [sheetProgress]);

  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, y(720)],
  });

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 30,
      }}
    >
      <StatusBar style="light" />
      <BlurView
        intensity={28}
        tint="light"
        style={{
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: 'rgba(0,0,0,0.72)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <Animated.View
        style={[
          {
            backgroundColor: '#d7d7d7',
            borderRadius: s(10),
            height: y(78),
            left: x(22),
            opacity: 0.86,
            position: 'absolute',
            right: x(22),
            top: y(100),
          },
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      />
      <Animated.View
        style={[
          {
            backgroundColor: '#ffffff',
            borderTopLeftRadius: s(20),
            borderTopRightRadius: s(20),
            bottom: 0,
            left: 0,
            paddingHorizontal: x(54),
            position: 'absolute',
            right: 0,
            top: y(118),
          },
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => ({
            alignItems: 'center',
            height: s(46),
            justifyContent: 'center',
            left: x(28),
            opacity: pressed ? 0.45 : 1,
            position: 'absolute',
            top: y(50),
            width: s(46),
          })}
        >
          <ArrowLeftIcon scale={s(1) * 0.8} />
        </Pressable>
        <Text
          selectable
          style={{
            alignSelf: 'center',
            color: '#050505',
            fontSize: appFontSize(s, 29),
            fontWeight: '900',
            letterSpacing: -0.7,
            lineHeight: s(36),
            marginTop: y(52),
          }}
        >
          Review
        </Text>

        <View style={{ marginTop: y(86) }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: x(24),
            }}
          >
            <NairaBadge size={s(58)} />
            <View style={{ flex: 1 }}>
              <Text
                selectable
                style={{
                  color: '#b9bbbd',
                  fontSize: appFontSize(s, 20),
                  fontWeight: '700',
                  letterSpacing: -0.2,
                }}
              >
                You add
              </Text>
              <Text
                selectable
                style={{
                  color: '#050505',
                  fontSize: appFontSize(s, 32),
                  fontWeight: '900',
                  letterSpacing: -0.8,
                  marginTop: y(5),
                }}
              >
                {nairaSymbol}
                {displayAmount}{' '}
                <Text style={{ color: '#c1c3c5', fontSize: appFontSize(s, 27) }}>NGN</Text>
              </Text>
            </View>
          </View>

          <View
            style={{
              alignItems: 'center',
              marginLeft: x(29),
              marginTop: y(25),
            }}
          >
            <ArrowDown color="#c7c9cb" size={s(30)} strokeWidth={2.2} />
          </View>

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: x(24),
              marginTop: y(24),
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#eef8e9',
                borderRadius: 999,
                height: s(58),
                justifyContent: 'center',
                width: s(58),
              }}
            >
              <CreditCard color={palette.greenDeep} size={s(29)} strokeWidth={2.7} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                selectable
                style={{
                  color: '#b9bbbd',
                  fontSize: appFontSize(s, 20),
                  fontWeight: '700',
                  letterSpacing: -0.2,
                }}
              >
                To
              </Text>
              <Text
                selectable
                style={{
                  color: '#050505',
                  fontSize: appFontSize(s, 30),
                  fontWeight: '900',
                  letterSpacing: -0.65,
                  marginTop: y(5),
                }}
              >
                CrewPay Wallet
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: '#eceeee',
              height: 1,
              marginTop: y(46),
            }}
          />
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: y(27),
            }}
          >
            <Text
              selectable
              style={{
                color: '#b9bbbd',
                fontSize: appFontSize(s, 19),
                fontWeight: '800',
              }}
            >
              Processing fee
            </Text>
            <Text
              selectable
              style={{
                color: '#050505',
                fontSize: appFontSize(s, 19),
                fontWeight: '800',
              }}
            >
              Calculated by Flutterwave
            </Text>
          </View>

          <View
            style={{
              alignItems: 'center',
              borderColor: '#ecedee',
              borderRadius: s(22),
              borderWidth: 1,
              flexDirection: 'row',
              marginTop: y(34),
              minHeight: y(67),
              paddingHorizontal: x(17),
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#111111',
                borderRadius: s(12),
                height: s(40),
                justifyContent: 'center',
                marginRight: x(16),
                width: s(40),
              }}
            >
              <CreditCard color="#ffffff" size={s(20)} strokeWidth={2.5} />
            </View>
            <Text
              selectable
              style={{
                color: '#050505',
                flex: 1,
                fontSize: appFontSize(s, 19),
                fontWeight: '800',
                letterSpacing: -0.2,
              }}
            >
              Secure wallet funding
            </Text>
            <ChevronRightIcon scale={s(1) * 0.54} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={amountValue <= 0}
          onPress={onContinue}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: amountValue <= 0 ? '#d9ddd3' : '#000000',
            borderRadius: 999,
            bottom: y(47),
            height: y(72),
            justifyContent: 'center',
            left: x(54),
            opacity: pressed ? 0.82 : 1,
            position: 'absolute',
            right: x(54),
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <Text
            selectable
            style={{
              color: amountValue <= 0 ? '#8a9082' : '#ffffff',
              fontSize: appFontSize(s, 24),
              fontWeight: '900',
              letterSpacing: -0.45,
            }}
          >
            Continue
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function TopUpPasscodeScreen({
  amount,
  error,
  onBack,
  onDelete,
  onDigit,
  s,
  scale,
  shakeTrigger,
  submitting,
  value,
  x,
  y,
}: {
  amount: string;
  error: string;
  onBack: () => void;
  onDelete: () => void;
  onDigit: (digit: string) => void;
  s: (value: number) => number;
  scale: number;
  shakeTrigger: number;
  submitting: boolean;
  value: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  const displayAmount = formatMoneyInput(amount);

  useEffect(() => {
    if (!shakeTrigger) {
      return;
    }

    Animated.sequence([
      Animated.timing(shake, {
        duration: 55,
        toValue: -10,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 55,
        toValue: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 55,
        toValue: -7,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 55,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shake, shakeTrigger]);

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        bottom: 0,
        left: 0,
        paddingHorizontal: x(38),
        paddingTop: y(78),
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 30,
      }}
    >
      <StatusBar style="dark" />
      <CircleControl icon="back" onPress={onBack} s={s} scale={scale} />
      <Text
        selectable
        style={{
          color: '#090a08',
          fontSize: appFontSize(s, 43),
          fontWeight: '900',
          letterSpacing: -1.1,
          lineHeight: s(54),
          marginTop: y(66),
        }}
      >
        Confirm top up
      </Text>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 23),
          fontWeight: '400',
          letterSpacing: -0.15,
          lineHeight: s(34),
          marginTop: y(17),
        }}
      >
        Enter your passcode to approve adding {nairaSymbol}
        {displayAmount} to your CrewPay wallet.
      </Text>
      <PasscodeDots
        count={value.length}
        error={Boolean(error)}
        marginTop={y(error ? 56 : 78)}
        s={s}
        scale={scale}
        shake={shake}
      />
      {error ? (
        <Text
          selectable
          style={{
            color: '#a33424',
            fontSize: appFontSize(s, 16),
            fontWeight: '700',
            lineHeight: s(22),
            marginTop: y(18),
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
      ) : null}
      {submitting ? (
        <Text
          selectable
          style={{
            color: palette.greenDeep,
            fontSize: appFontSize(s, 16),
            fontWeight: '800',
            lineHeight: s(22),
            marginTop: y(error ? 8 : 18),
            textAlign: 'center',
          }}
        >
          Opening Flutterwave checkout...
        </Text>
      ) : null}
      <PasscodeKeypad
        onDelete={onDelete}
        onDigit={onDigit}
        s={s}
        scale={scale}
        x={x}
        y={y}
      />
    </View>
  );
}

function NairaBadge({ size }: { size: number }) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: palette.green,
        borderRadius: 999,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <Text
        selectable
        style={{
          color: '#10260c',
          fontSize: Math.round(size * 0.58),
          fontWeight: '900',
          lineHeight: Math.round(size * 0.7),
        }}
      >
        {nairaSymbol}
      </Text>
      <Text
        selectable
        style={{
          color: '#10260c',
          display: 'none',
          fontSize: Math.round(size * 0.58),
          fontWeight: '900',
          lineHeight: Math.round(size * 0.7),
        }}
      >
        ₦
      </Text>
    </View>
  );
}

function TopUpKeypad({
  bottom,
  disabled,
  deleteDigit,
  onReview,
  pressDigit,
  s,
  width,
  x,
  y,
}: {
  bottom: number;
  disabled: boolean;
  deleteDigit: () => void;
  onReview: () => void;
  pressDigit: (value: string) => void;
  s: (value: number) => number;
  width: number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'delete'],
  ];

  return (
    <View
      style={{
        bottom,
        left: x(30),
        position: 'absolute',
        width: width - x(60),
      }}
    >
      <View style={{ gap: y(32) }}>
        {rows.map((row, rowIndex) => (
          <View
            key={`topup-row-${rowIndex}`}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            {row.map((value) => (
              <Pressable
                accessibilityRole="button"
                key={`topup-key-${value}`}
                onPress={() =>
                  value === 'delete' ? deleteDigit() : pressDigit(value)
                }
                style={({ pressed }) => ({
                  alignItems: 'center',
                  height: y(45),
                  justifyContent: 'center',
                  opacity: pressed ? 0.45 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  width: x(111),
                })}
              >
                {value === 'delete' ? (
                  <SmallClearIcon scale={s(1) * 1.05} />
                ) : (
                  <Text
                    selectable
                    style={{
                      color: '#000000',
                      fontSize: appFontSize(s, 34),
                      fontWeight: '600',
                      lineHeight: s(42),
                    }}
                  >
                    {value}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onReview}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: disabled ? '#d9ddd3' : '#000000',
          borderRadius: 999,
          height: y(72),
          justifyContent: 'center',
          marginTop: y(35),
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <Text
          selectable
          style={{
            color: disabled ? '#8a9082' : '#ffffff',
            fontSize: appFontSize(s, 24),
            fontWeight: '900',
            letterSpacing: -0.45,
          }}
        >
          Review
        </Text>
      </Pressable>
    </View>
  );
}

function HomeActionCard({
  action,
  height,
  onPress,
  s,
  scale,
  width,
  x,
  y,
}: {
  action: HomeActionConfig;
  height: number;
  onPress: () => void;
  s: (value: number) => number;
  scale: number;
  width: number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: s(27),
        height,
        opacity: pressed ? 0.74 : 1,
        paddingBottom: y(21),
        paddingHorizontal: x(24),
        paddingTop: y(23),
        transform: [{ scale: pressed ? 0.975 : 1 }],
        width,
      })}
    >
      <HomeActionIcon scale={scale} tone={action.tone} />
      <View style={{ height: y(43) }} />
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 20),
          fontWeight: '500',
          letterSpacing: -0.35,
          lineHeight: s(25),
        }}
      >
        {action.title}
      </Text>
      <Text
        selectable
        style={{
          color: '#b3b5b7',
          fontSize: appFontSize(s, 18),
          fontWeight: '400',
          lineHeight: s(23),
          marginTop: y(7),
        }}
      >
        {action.subtitle}
      </Text>
    </Pressable>
  );
}

function HomeActionIcon({
  scale,
  tone,
}: {
  scale: number;
  tone: 'blue' | 'orange' | 'purple' | 'black';
}) {
  const background =
    tone === 'blue'
      ? '#5b83ff'
      : tone === 'orange'
        ? '#ff855f'
        : tone === 'purple'
          ? '#9b63ff'
          : '#151515';

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: background,
        borderRadius: sFor(scale, 12),
        height: sFor(scale, 46),
        justifyContent: 'center',
        overflow: 'hidden',
        width: sFor(scale, 46),
      }}
    >
      {tone === 'blue' ? <CoinLoopIcon scale={scale} /> : null}
      {tone === 'orange' ? <DotGridIcon scale={scale} /> : null}
      {tone === 'purple' ? <BarsIcon scale={scale} /> : null}
      {tone === 'black' ? (
        <Text
          selectable
          style={{
            color: '#ffffff',
            fontSize: sFor(scale, 10),
            fontWeight: '900',
            letterSpacing: -0.4,
          }}
        >
          TEAM
        </Text>
      ) : null}
    </View>
  );
}

function HomeTabButton({
  active,
  icon,
  onPress,
  scale,
}: {
  active: boolean;
  icon: HomeTab;
  onPress: () => void;
  scale: number;
}) {
  const color = active ? '#000000' : '#adadae';
  const iconSize = sFor(scale, 34);
  const strokeWidth = active ? 3.1 : 3;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        height: sFor(scale, 44),
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
        width: sFor(scale, 44),
      })}
    >
      {icon === 'home' ? (
        <House
          color={color}
          fill={active ? color : 'transparent'}
          size={iconSize}
          strokeWidth={strokeWidth}
        />
      ) : null}
      {icon === 'activity' ? (
        <MessageCircle
          color={color}
          fill={active ? color : 'transparent'}
          size={iconSize}
          strokeWidth={strokeWidth}
        />
      ) : null}
      {icon === 'settings' ? (
        <Settings color={color} size={iconSize} strokeWidth={strokeWidth} />
      ) : null}
    </Pressable>
  );
}

function HomeQuickActionOverlay({
  onClose,
  onSelect,
  requestCount,
  role,
  s,
  x,
  y,
}: {
  onClose: () => void;
  onSelect: (action: HomeAction | null) => void;
  requestCount: number;
  role: AccountRole;
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const isCrewMate = role === 'crewmate';

  return (
    <Pressable
      onPress={onClose}
      style={{
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
      }}
    >
      <BlurView
        intensity={42}
        tint="light"
        style={{
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: 'rgba(255,255,255,0.18)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        style={{
          alignItems: 'flex-end',
          bottom: y(174),
          gap: y(31),
          position: 'absolute',
          right: x(45),
        }}
      >
        {isCrewMate ? (
          <>
            <QuickActionRow
              color="#7f57ef"
              icon="join"
              label="Join team"
              onPress={() => onSelect('join-team')}
              s={s}
            />
            <QuickActionRow
              color="#f58a4f"
              icon="proof"
              label="Submit proof"
              onPress={() => onSelect('submit-proof')}
              s={s}
            />
          </>
        ) : (
          <>
            <QuickActionRow
              color="#f58a4f"
              icon="bulk"
              label="Bulk transfer"
              onPress={() => onSelect(null)}
              s={s}
            />
            <QuickActionRow
              color="#7f57ef"
              icon="review"
              label="Review tasks"
              onPress={() => onSelect('submitted-work')}
              s={s}
            />
            <QuickActionRow
              color={palette.greenDeep}
              icon="requests"
              label={`Requests${requestCount > 0 ? ` (${requestCount})` : ''}`}
              onPress={() => onSelect('requests')}
              s={s}
            />
          </>
        )}
      </View>
    </Pressable>
  );
}

function QuickActionRow({
  color,
  icon,
  label,
  onPress,
  s,
}: {
  color: string;
  icon: 'bulk' | 'join' | 'proof' | 'requests' | 'review';
  label: string;
  onPress: () => void;
  s: (value: number) => number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: s(20),
        justifyContent: 'flex-end',
        opacity: pressed ? 0.65 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        width: s(278),
      })}
    >
      <Text
        selectable
        style={{
          color: '#050505',
          fontSize: appFontSize(s, 25),
          fontWeight: '500',
          letterSpacing: -0.45,
          lineHeight: s(32),
        }}
      >
        {label}
      </Text>
      {icon === 'bulk' ? (
        <Send color={color} size={s(36)} strokeWidth={3.2} />
      ) : null}
      {icon === 'review' ? (
        <ClipboardCheck color={color} size={s(36)} strokeWidth={3.2} />
      ) : null}
      {icon === 'join' ? (
        <Users color={color} size={s(36)} strokeWidth={3.2} />
      ) : null}
      {icon === 'proof' ? (
        <Upload color={color} size={s(36)} strokeWidth={3.2} />
      ) : null}
      {icon === 'requests' ? (
        <UserPlus color={color} size={s(36)} strokeWidth={3.2} />
      ) : null}
    </Pressable>
  );
}

function ArrowDownMiniIcon({ scale }: { scale: number }) {
  return (
    <View style={{ height: sFor(scale, 13), width: sFor(scale, 13) }}>
      <View
        style={{
          backgroundColor: '#000000',
          borderRadius: 999,
          height: sFor(scale, 9),
          left: sFor(scale, 5),
          position: 'absolute',
          top: 0,
          width: Math.max(2, sFor(scale, 2)),
        }}
      />
      <View
        style={{
          borderBottomWidth: sFor(scale, 2),
          borderColor: '#000000',
          borderRightWidth: sFor(scale, 2),
          height: sFor(scale, 7),
          left: sFor(scale, 3),
          position: 'absolute',
          top: sFor(scale, 4),
          transform: [{ rotate: '45deg' }],
          width: sFor(scale, 7),
        }}
      />
    </View>
  );
}

function BankMiniIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#5792ff',
        borderRadius: sFor(scale, 15),
        height: sFor(scale, 40),
        justifyContent: 'center',
        transform: [{ rotate: '-9deg' }],
        width: sFor(scale, 40),
      }}
    >
      <View
        style={{
          borderBottomWidth: sFor(scale, 10),
          borderBottomColor: '#ffffff',
          borderLeftWidth: sFor(scale, 13),
          borderLeftColor: 'transparent',
          borderRightWidth: sFor(scale, 13),
          borderRightColor: 'transparent',
          height: 0,
          marginBottom: sFor(scale, 2),
          width: 0,
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          gap: sFor(scale, 3),
        }}
      >
        {[0, 1, 2].map((bar) => (
          <View
            key={`bank-bar-${bar}`}
            style={{
              backgroundColor: '#ffffff',
              height: sFor(scale, 9),
              width: sFor(scale, 3),
            }}
          />
        ))}
      </View>
      <View
        style={{
          backgroundColor: '#ffffff',
          height: sFor(scale, 3),
          marginTop: sFor(scale, 2),
          width: sFor(scale, 25),
        }}
      />
    </View>
  );
}

function CloseMiniIcon({
  color,
  scale,
}: {
  color: string;
  scale: number;
}) {
  return (
    <View style={{ height: sFor(scale, 18), width: sFor(scale, 18) }}>
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(scale, 2),
          left: 0,
          position: 'absolute',
          top: sFor(scale, 8),
          transform: [{ rotate: '45deg' }],
          width: sFor(scale, 18),
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(scale, 2),
          left: 0,
          position: 'absolute',
          top: sFor(scale, 8),
          transform: [{ rotate: '-45deg' }],
          width: sFor(scale, 18),
        }}
      />
    </View>
  );
}

function ShareIcon({ scale }: { scale: number }) {
  return <Upload color="#11130f" size={sFor(scale, 28)} strokeWidth={2.3} />;
}

function PlusIcon({ color, scale }: { color: string; scale: number }) {
  return (
    <View style={{ height: sFor(scale, 31), width: sFor(scale, 31) }}>
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(scale, 4),
          left: 0,
          position: 'absolute',
          top: sFor(scale, 13),
          width: sFor(scale, 31),
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(scale, 31),
          left: sFor(scale, 13),
          position: 'absolute',
          top: 0,
          width: sFor(scale, 4),
        }}
      />
    </View>
  );
}

function CoinLoopIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        alignItems: 'center',
        borderColor: '#ffffff',
        borderRadius: 999,
        borderWidth: sFor(scale, 2),
        height: sFor(scale, 27),
        justifyContent: 'center',
        width: sFor(scale, 27),
      }}
    >
      <Text
        selectable
        style={{
          color: '#ffffff',
          fontSize: sFor(scale, 19),
          fontWeight: '900',
          lineHeight: sFor(scale, 22),
        }}
      >
        $
      </Text>
    </View>
  );
}

function DotGridIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: sFor(scale, 2),
        width: sFor(scale, 25),
      }}
    >
      {Array.from({ length: 25 }).map((_, index) => (
        <View
          key={`dot-grid-${index}`}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 999,
            height: sFor(scale, 3),
            opacity: index % 2 === 0 ? 1 : 0.72,
            width: sFor(scale, 3),
          }}
        />
      ))}
    </View>
  );
}

function BarsIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: sFor(scale, 4),
        height: sFor(scale, 25),
      }}
    >
      {[11, 18, 25].map((barHeight) => (
        <View
          key={`bars-${barHeight}`}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 999,
            height: sFor(scale, barHeight),
            width: sFor(scale, 4),
          }}
        />
      ))}
    </View>
  );
}

function HomeNavIcon({
  active,
  scale,
}: {
  active: boolean;
  scale: number;
}) {
  const color = active ? '#000000' : '#adadae';

  return (
    <View
      style={{
        height: sFor(scale, 32),
        width: sFor(scale, 34),
      }}
    >
      <View
        style={{
          backgroundColor: color,
          borderRadius: sFor(scale, 4),
          height: sFor(scale, 24),
          left: sFor(scale, 4),
          position: 'absolute',
          top: sFor(scale, 8),
          width: sFor(scale, 26),
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: sFor(scale, 4),
          height: sFor(scale, 21),
          left: sFor(scale, 6),
          position: 'absolute',
          top: sFor(scale, 1),
          transform: [{ rotate: '45deg' }],
          width: sFor(scale, 21),
        }}
      />
    </View>
  );
}

function ClockNavIcon({
  active,
  scale,
}: {
  active: boolean;
  scale: number;
}) {
  const color = active ? '#000000' : '#adadae';

  return (
    <View
      style={{
        alignItems: 'center',
        borderColor: color,
        borderRadius: 999,
        borderWidth: sFor(scale, 7),
        height: sFor(scale, 36),
        justifyContent: 'center',
        width: sFor(scale, 36),
      }}
    >
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(scale, 12),
          position: 'absolute',
          top: sFor(scale, 5),
          width: sFor(scale, 4),
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(scale, 4),
          left: sFor(scale, 14),
          position: 'absolute',
          top: sFor(scale, 16),
          width: sFor(scale, 10),
        }}
      />
    </View>
  );
}

function SettingsNavIcon({
  active,
  scale,
}: {
  active: boolean;
  scale: number;
}) {
  const color = active ? '#000000' : '#adadae';

  return (
    <View
      style={{
        alignItems: 'center',
        height: sFor(scale, 38),
        justifyContent: 'center',
        width: sFor(scale, 38),
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((tooth) => (
        <View
          key={`gear-tooth-${tooth}`}
          style={{
            backgroundColor: color,
            borderRadius: sFor(scale, 3),
            height: sFor(scale, 11),
            position: 'absolute',
            top: sFor(scale, 1),
            transform: [
              { rotate: `${tooth * 45}deg` },
              { translateY: sFor(scale, 13) },
            ],
            width: sFor(scale, 8),
          }}
        />
      ))}
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(scale, 29),
          position: 'absolute',
          width: sFor(scale, 29),
        }}
      />
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 999,
          height: sFor(scale, 12),
          position: 'absolute',
          width: sFor(scale, 12),
        }}
      />
    </View>
  );
}

function SetupPage({
  children,
  paddingBottom,
  paddingTop,
  x,
}: {
  children: ReactNode;
  paddingBottom: number;
  paddingTop: number;
  x: (value: number) => number;
}) {
  const pageContent = (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
        paddingBottom,
        paddingHorizontal: x(25),
        paddingTop,
      }}
    >
      {children}
    </View>
  );

  if (Platform.OS === 'web') {
    return pageContent;
  }

  return (
    <TouchableWithoutFeedback
      accessible={false}
      onPress={Keyboard.dismiss}
    >
      {pageContent}
    </TouchableWithoutFeedback>
  );
}

function PrimaryPillButton({
  disabled = false,
  label,
  onPress,
  s,
  style,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  s: (value: number) => number;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: disabled ? '#dce5d6' : palette.green,
          borderRadius: 999,
          height: s(70),
          justifyContent: 'center',
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <Text
        selectable
        style={{
          color: disabled ? '#8d9488' : palette.ink,
          fontSize: appFontSize(s, 24),
          fontWeight: '800',
          letterSpacing: -0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function WiseTextInput({
  keyboardType = 'default',
  label,
  onChangeText,
  s,
  scale,
  value,
  x,
  y,
}: {
  keyboardType?: 'default' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  s: (value: number) => number;
  scale: number;
  value: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <View style={{ marginTop: y(23) }}>
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: appFontSize(s, 18),
          fontWeight: '800',
          letterSpacing: -Math.max(0.1, 0.16 * scale),
          lineHeight: s(25),
        }}
      >
        {label}
      </Text>
      <TextInput
        keyboardType={keyboardType}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        style={{
          borderColor: isActive ? palette.greenDeep : '#a3a49f',
          borderRadius: s(10),
          borderWidth: isActive ? 2.2 : 1.25,
          color: palette.ink,
          fontSize: appFontSize(s, 21),
          fontWeight: '400',
          height: y(61),
          marginTop: y(8),
          paddingHorizontal: x(20),
        }}
        value={value}
      />
    </View>
  );
}

function DateTextInput({
  label,
  maxLength,
  onChangeText,
  s,
  scale,
  value,
  width,
  y,
}: {
  label: string;
  maxLength: number;
  onChangeText: (value: string) => void;
  s: (value: number) => number;
  scale: number;
  value: string;
  width: number;
  y: (value: number) => number;
}) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <View style={{ marginTop: y(4), width }}>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 16),
          fontWeight: '500',
          letterSpacing: -Math.max(0.08, 0.12 * scale),
          lineHeight: s(23),
        }}
      >
        {label}
      </Text>
      <TextInput
        keyboardType="number-pad"
        maxLength={maxLength}
        onBlur={() => setFocused(false)}
        onChangeText={(text) =>
          onChangeText(text.replace(/\D/g, '').slice(0, maxLength))
        }
        onFocus={() => setFocused(true)}
        style={{
          borderColor: isActive ? palette.greenDeep : '#a3a49f',
          borderRadius: s(10),
          borderWidth: isActive ? 2.2 : 1.25,
          color: palette.ink,
          fontSize: appFontSize(s, 21),
          fontWeight: '400',
          height: y(58),
          paddingHorizontal: 0,
          textAlign: 'center',
        }}
        value={value}
      />
    </View>
  );
}

function DatePickerButton({
  label,
  onPress,
  placeholder,
  s,
  scale,
  value,
  width,
  y,
}: {
  label: string;
  onPress: () => void;
  placeholder: string;
  s: (value: number) => number;
  scale: number;
  value: string;
  width: number;
  y: (value: number) => number;
}) {
  return (
    <View style={{ marginTop: y(4), width }}>
      <Text
        selectable
        style={{
          color: '#555851',
          fontSize: appFontSize(s, 16),
          fontWeight: '500',
          letterSpacing: -Math.max(0.08, 0.12 * scale),
          lineHeight: s(23),
        }}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          alignItems: 'center',
          borderColor: value ? palette.greenDeep : '#a3a49f',
          borderRadius: s(10),
          borderWidth: value ? 2.2 : 1.25,
          flexDirection: 'row',
          height: y(58),
          justifyContent: 'space-between',
          paddingHorizontal: s(18),
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}
      >
        <Text
          selectable
          style={{
            color: value ? palette.ink : '#888a85',
            fontSize: appFontSize(s, 20),
            fontWeight: '400',
            letterSpacing: -Math.max(0.08, 0.16 * scale),
          }}
        >
          {value || placeholder}
        </Text>
        <ChevronDownIcon scale={scale} />
      </Pressable>
    </View>
  );
}

function MonthPickerModal({
  months: monthOptions,
  onClose,
  onSelect,
  selectedMonth,
  visible,
}: {
  months: string[];
  onClose: () => void;
  onSelect: (month: string) => void;
  selectedMonth: string;
  visible: boolean;
}) {
  const { height, width } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const s = (value: number) => Math.round(value * scale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.36)',
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: s(32),
            borderTopRightRadius: s(32),
            maxHeight: height * 0.84,
            paddingBottom: y(34),
            paddingHorizontal: x(36),
            paddingTop: y(40),
          }}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row' }}>
            <Text
              selectable
              style={{
                color: palette.ink,
                flex: 1,
                fontSize: appFontSize(s, 28),
                fontWeight: '800',
                letterSpacing: -Math.max(0.35, 0.7 * scale),
              }}
            >
              Month
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: '#f1f2ee',
                borderRadius: 999,
                height: s(42),
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
                width: s(42),
              })}
            >
              <CloseIcon scale={scale * 0.78} />
            </Pressable>
          </View>
          <FlatList
            contentContainerStyle={{ paddingTop: y(31) }}
            data={monthOptions}
            keyExtractor={(month) => month}
            renderItem={({ item }) => {
              const selected = item === selectedMonth;

              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    flexDirection: 'row',
                    minHeight: y(76),
                    opacity: pressed ? 0.74 : 1,
                  })}
                >
                  <Text
                    selectable
                    style={{
                      color: palette.ink,
                      flex: 1,
                      fontSize: appFontSize(s, 19),
                      fontWeight: '800',
                      letterSpacing: -Math.max(0.1, 0.18 * scale),
                    }}
                  >
                    {item}
                  </Text>
                  <View
                    style={{
                      alignItems: 'center',
                      borderColor: selected ? palette.greenDeep : '#a3a49f',
                      borderRadius: 999,
                      borderWidth: Math.max(1.2, 1.4 * scale),
                      height: s(28),
                      justifyContent: 'center',
                      width: s(28),
                    }}
                  >
                    {selected ? (
                      <View
                        style={{
                          backgroundColor: palette.greenDeep,
                          borderRadius: 999,
                          height: s(15),
                          width: s(15),
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function FullWidthBarButton({
  label,
  onPress,
  top,
}: {
  label: string;
  onPress: () => void;
  top: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: palette.green,
        height: 76,
        justifyContent: 'center',
        left: 0,
        opacity: pressed ? 0.92 : 1,
        position: 'absolute',
        right: 0,
        top,
      })}
    >
      <Text
        selectable
        style={{
          color: palette.ink,
          fontSize: 24,
          fontWeight: '800',
          letterSpacing: -0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CircleControl({
  icon,
  onPress,
  s,
  scale,
}: {
  icon: 'back' | 'close';
  onPress: () => void;
  s: (value: number) => number;
  scale: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: '#f1f2ee',
        borderRadius: 999,
        height: s(60),
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.97 : 1 }],
        width: s(60),
      })}
    >
      {icon === 'back' ? (
        <ArrowLeftIcon scale={scale} />
      ) : (
        <CloseIcon scale={scale} />
      )}
    </Pressable>
  );
}

function CloseIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        height: sFor(scale, 28),
        width: sFor(scale, 28),
      }}
    >
      <View
        style={{
          backgroundColor: palette.greenDeep,
          borderRadius: 999,
          height: sFor(scale, 3),
          left: sFor(scale, 2),
          position: 'absolute',
          top: sFor(scale, 12),
          transform: [{ rotate: '45deg' }],
          width: sFor(scale, 25),
        }}
      />
      <View
        style={{
          backgroundColor: palette.greenDeep,
          borderRadius: 999,
          height: sFor(scale, 3),
          left: sFor(scale, 2),
          position: 'absolute',
          top: sFor(scale, 12),
          transform: [{ rotate: '-45deg' }],
          width: sFor(scale, 25),
        }}
      />
    </View>
  );
}

function SearchIcon({ scale }: { scale: number }) {
  return (
    <View style={{ height: sFor(scale, 26), width: sFor(scale, 26) }}>
      <View
        style={{
          borderColor: '#6e716b',
          borderRadius: 999,
          borderWidth: Math.max(2, 2.5 * scale),
          height: sFor(scale, 17),
          left: 1,
          position: 'absolute',
          top: 1,
          width: sFor(scale, 17),
        }}
      />
      <View
        style={{
          backgroundColor: '#6e716b',
          borderRadius: 999,
          height: Math.max(2, 2.5 * scale),
          position: 'absolute',
          right: sFor(scale, 2),
          top: sFor(scale, 18),
          transform: [{ rotate: '45deg' }],
          width: sFor(scale, 10),
        }}
      />
    </View>
  );
}

function SmallClearIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#90938d',
        borderRadius: 999,
        height: sFor(scale, 25),
        justifyContent: 'center',
        width: sFor(scale, 25),
      }}
    >
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 999,
          height: sFor(scale, 2.5),
          position: 'absolute',
          transform: [{ rotate: '45deg' }],
          width: sFor(scale, 13),
        }}
      />
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 999,
          height: sFor(scale, 2.5),
          position: 'absolute',
          transform: [{ rotate: '-45deg' }],
          width: sFor(scale, 13),
        }}
      />
    </View>
  );
}

function CountryPickerModal({
  countries,
  onClose,
  onSelect,
  selectedCountry,
  visible,
}: {
  countries: CountryOption[];
  onClose: () => void;
  onSelect: (country: CountryOption) => void;
  selectedCountry: CountryOption;
  visible: boolean;
}) {
  const [query, setQuery] = useState('');
  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return countries;
    }

    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.dialCode.includes(normalizedQuery),
    );
  }, [countries, query]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View
        style={{
          backgroundColor: '#ffffff',
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 64,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row' }}>
          <Text
            selectable
            style={{
              color: palette.ink,
              flex: 1,
              fontSize: 32,
              fontWeight: '800',
              letterSpacing: -0.9,
            }}
          >
            Country or region
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: '#f1f2ee',
              borderRadius: 999,
              height: 48,
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
              width: 48,
            })}
          >
            <CloseIcon scale={0.85} />
          </Pressable>
        </View>
        <TextInput
          onChangeText={setQuery}
          placeholder="Search country"
          placeholderTextColor="#7d8178"
          style={{
            borderColor: '#d7d8d2',
            borderRadius: 14,
            borderWidth: 1.2,
            color: palette.ink,
            fontSize: 20,
            fontWeight: '400',
            height: 58,
            marginTop: 24,
            paddingHorizontal: 18,
          }}
          value={query}
        />
        <FlatList
          contentContainerStyle={{ paddingBottom: 28, paddingTop: 14 }}
          data={filteredCountries}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item.code === selectedCountry.code;

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelect(item)}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: isSelected ? '#f1fce9' : '#ffffff',
                  borderRadius: 16,
                  flexDirection: 'row',
                  minHeight: 64,
                  opacity: pressed ? 0.78 : 1,
                  paddingHorizontal: 14,
                })}
              >
                <Text style={{ fontSize: 29, marginRight: 16 }}>
                  {item.flag}
                </Text>
                <Text
                  selectable
                  style={{
                    color: palette.ink,
                    flex: 1,
                    fontSize: 19,
                    fontWeight: isSelected ? '800' : '500',
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  selectable
                  style={{
                    color: palette.muted,
                    fontSize: 17,
                    fontWeight: '600',
                  }}
                >
                  {item.dialCode}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

function EyeIcon({
  pulse,
  scale,
  visible,
}: {
  pulse: Animated.Value;
  scale: number;
  visible: boolean;
}) {
  const blinkScaleY = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.34],
  });
  const blinkRotate = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', visible ? '-8deg' : '8deg'],
  });

  return (
    <Animated.View
      style={{
        alignItems: 'center',
        height: sFor(scale, 28),
        justifyContent: 'center',
        transform: [{ scaleY: blinkScaleY }, { rotate: blinkRotate }],
        width: sFor(scale, 38),
      }}
    >
      <View
        style={{
          borderColor: palette.greenDeep,
          borderRadius: 999,
          borderTopWidth: Math.max(2, 3 * scale),
          height: sFor(scale, 18),
          position: 'absolute',
          top: sFor(scale, 6),
          width: sFor(scale, 30),
        }}
      />
      <View
        style={{
          borderColor: palette.greenDeep,
          borderRadius: 999,
          borderWidth: Math.max(2, 3 * scale),
          height: sFor(scale, 9),
          width: sFor(scale, 9),
        }}
      />
      {!visible ? (
        <View
          style={{
            backgroundColor: palette.greenDeep,
            borderRadius: 999,
            height: Math.max(2, 3 * scale),
            position: 'absolute',
            transform: [{ rotate: '-38deg' }],
            width: sFor(scale, 34),
          }}
        />
      ) : null}
    </Animated.View>
  );
}

function ChevronDownIcon({ scale }: { scale: number }) {
  return (
    <View style={{ height: sFor(scale, 16), width: sFor(scale, 22) }}>
      <View
        style={{
          backgroundColor: palette.greenDeep,
          borderRadius: 999,
          height: sFor(scale, 3),
          left: sFor(scale, 2),
          position: 'absolute',
          top: sFor(scale, 7),
          transform: [{ rotate: '45deg' }],
          width: sFor(scale, 13),
        }}
      />
      <View
        style={{
          backgroundColor: palette.greenDeep,
          borderRadius: 999,
          height: sFor(scale, 3),
          position: 'absolute',
          right: sFor(scale, 1),
          top: sFor(scale, 7),
          transform: [{ rotate: '-45deg' }],
          width: sFor(scale, 13),
        }}
      />
    </View>
  );
}

function PayoutHistoryScreen({ onBack }: { onBack: () => void }) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 624;
  const heightScale = height / 1239;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await listWalletTransactions();
        setTransactions(rows.filter((t) => t.direction === 'reserve' || t.direction === 'debit'));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const directionLabel = (dir: string) => {
    if (dir === 'reserve') return 'Reserved';
    if (dir === 'debit') return 'Paid out';
    return dir;
  };

  const directionColor = (dir: string) => {
    if (dir === 'reserve') return '#f0a532';
    if (dir === 'debit') return '#e05252';
    return '#22242e';
  };

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        flex: 1,
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          paddingHorizontal: x(38),
          paddingTop: y(54),
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: '#f3f4ef',
            borderRadius: 999,
            height: s(58),
            justifyContent: 'center',
            opacity: pressed ? 0.55 : 1,
            width: s(58),
          })}
        >
          <ArrowLeftIcon scale={s(1) * 0.78} />
        </Pressable>
        <Text
          style={{
            color: '#22242e',
            fontSize: s(32),
            fontWeight: '900',
            letterSpacing: -0.8,
            marginTop: y(36),
          }}
        >
          Payout History
        </Text>
        <Text
          style={{
            color: '#777a83',
            fontSize: s(16),
            fontWeight: '500',
            lineHeight: s(23),
            marginTop: y(8),
          }}
        >
          All reserved and completed payouts from your wallet.
        </Text>
      </View>

      {loading ? (
        <View
          style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}
        >
          <ActivityIndicator color={palette.greenDeep} size="large" />
        </View>
      ) : error ? (
        <View
          style={{
            backgroundColor: '#fff0ed',
            borderColor: '#ffd3ca',
            borderRadius: s(18),
            borderWidth: 1,
            marginHorizontal: x(38),
            marginTop: y(24),
            paddingHorizontal: x(16),
            paddingVertical: y(12),
          }}
        >
          <Text
            style={{ color: '#a12d1c', fontSize: s(14), fontWeight: '600' }}
          >
            {error}
          </Text>
        </View>
      ) : transactions.length === 0 ? (
        <View
          style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}
        >
          <Text
            style={{
              color: '#a0a3ac',
              fontSize: s(17),
              fontWeight: '600',
              paddingHorizontal: x(48),
              textAlign: 'center',
            }}
          >
            No payouts yet. Process your first bulk transfer to see records here.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{
            paddingBottom: y(60),
            paddingHorizontal: x(38),
            paddingTop: y(32),
          }}
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: '#f8f9f3',
                borderColor: '#eceee7',
                borderRadius: s(18),
                borderWidth: 1,
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: y(12),
                paddingHorizontal: x(18),
                paddingVertical: y(16),
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: '#22242e',
                    fontSize: s(16),
                    fontWeight: '800',
                  }}
                >
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text
                    style={{
                      color: '#747a70',
                      fontSize: s(13),
                      fontWeight: '500',
                      marginTop: y(3),
                    }}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: x(8),
                    marginTop: y(8),
                  }}
                >
                  <View
                    style={{
                      backgroundColor:
                        item.direction === 'reserve' ? '#fff4d4' : '#ffe8e8',
                      borderRadius: s(8),
                      paddingHorizontal: x(8),
                      paddingVertical: y(3),
                    }}
                  >
                    <Text
                      style={{
                        color: directionColor(item.direction),
                        fontSize: s(11),
                        fontWeight: '800',
                        letterSpacing: 0.2,
                        textTransform: 'uppercase',
                      }}
                    >
                      {directionLabel(item.direction)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: '#a0a59d',
                      fontSize: s(12),
                      fontWeight: '500',
                    }}
                  >
                    {formatRequestTime(item.createdAt)}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: directionColor(item.direction),
                  fontSize: s(18),
                  fontWeight: '900',
                }}
              >
                -{'\u20a6'}
                {Number(item.amountNaira || 0).toLocaleString()}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function BulkTransferScreen({
  onBack,
  teams,
}: {
  onBack: () => void;
  teams: TeamDraft[];
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 624;
  const heightScale = height / 1239;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);

  type BulkStep = 'select-team' | 'queue' | 'review' | 'passcode' | 'done';
  const [step, setStep] = useState<BulkStep>('select-team');
  const [selectedTeam, setSelectedTeam] = useState<TeamDraft | null>(null);

  // queue step state
  const [queueItems, setQueueItems] = useState<PayoutQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [savingAmountId, setSavingAmountId] = useState('');

  // passcode step state
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [reserving, setReserving] = useState(false);
  const [reservedBatch, setReservedBatch] = useState<{ itemCount: number; totalNaira: number } | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideAnim.setValue(1);
    Animated.timing(slideAnim, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [step]);

  function money(v: number) {
    return `\u20a6${Number(v || 0).toLocaleString()}`;
  }

  function parseAmt(str: string) {
    return Number(str.replace(/[^0-9.]/g, '')) || 0;
  }

  const pendingItems = queueItems.filter((item) => item.status === 'pending');
  const allSelected =
    pendingItems.length > 0 &&
    pendingItems.every((item) => selectedIds.includes(item.payout_approval_id));

  const selectedTotal = useMemo(() => {
    const sel = new Set(selectedIds);
    return queueItems.reduce((total, item) => {
      if (!sel.has(item.payout_approval_id)) return total;
      return total + parseAmt(amountDrafts[item.payout_approval_id] ?? '0');
    }, 0);
  }, [amountDrafts, queueItems, selectedIds]);

  const selectedItems = useMemo(() => {
    const sel = new Set(selectedIds);
    return queueItems.filter((item) => sel.has(item.payout_approval_id));
  }, [queueItems, selectedIds]);

  const loadQueue = async (teamId: string) => {
    setQueueLoading(true);
    setQueueError('');
    try {
      const items = await listTeamPayoutQueue(teamId);
      setQueueItems(items);
      const initialIds = items
        .filter((item) => item.status === 'pending')
        .map((item) => item.payout_approval_id);
      setSelectedIds(initialIds);
      setAmountDrafts(
        items.reduce<Record<string, string>>((acc, item) => {
          acc[item.payout_approval_id] = String(Number(item.amount_naira || 0));
          return acc;
        }, {}),
      );
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Could not load payout queue.');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleSelectTeam = async (team: TeamDraft) => {
    setSelectedTeam(team);
    setStep('queue');
    if (team.id) {
      await loadQueue(team.id);
    }
  };

  const saveAmount = async (item: PayoutQueueItem) => {
    const nextAmount = parseAmt(amountDrafts[item.payout_approval_id] ?? '0');
    if (nextAmount <= 0) {
      Alert.alert('Enter an amount', 'Payout amount must be greater than zero.');
      return;
    }
    setSavingAmountId(item.payout_approval_id);
    try {
      await updatePayoutApprovalAmount(item.payout_approval_id, nextAmount);
      setQueueItems((prev) =>
        prev.map((qi) =>
          qi.payout_approval_id === item.payout_approval_id
            ? { ...qi, amount_naira: nextAmount }
            : qi,
        ),
      );
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSavingAmountId('');
    }
  };

  const toggleItem = (approvalId: string) => {
    setSelectedIds((prev) =>
      prev.includes(approvalId) ? prev.filter((id) => id !== approvalId) : [...prev, approvalId],
    );
  };

  const handleConfirmPasscode = async () => {
    if (passcode.length !== 4) {
      setPasscodeError('Enter your 4-digit passcode.');
      return;
    }
    setReserving(true);
    setPasscodeError('');
    try {
      const user = await getCurrentUser();
      const valid = await verifyLocalPasscode(user.id, passcode);
      if (!valid) {
        setPasscodeError('Wrong passcode. Try again.');
        setReserving(false);
        return;
      }
      if (!selectedTeam?.id) throw new Error('No team selected.');
      const batch = await reservePayoutApprovals(selectedTeam.id, selectedIds);
      setReservedBatch({ itemCount: batch.item_count, totalNaira: batch.total_amount_naira });
      setStep('done');
    } catch (err) {
      setPasscodeError(err instanceof Error ? err.message : 'Could not process payouts.');
    } finally {
      setReserving(false);
    }
  };

  const screenTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  // ── select-team step ─────────────────────────────────────────────────────
  if (step === 'select-team') {
    return (
      <Animated.View
        style={{
          flex: 1,
          opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: screenTranslate }],
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: palette.paper,
            paddingHorizontal: x(24),
            paddingTop: y(18),
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed ? '#e8ead3' : '#f0f1ea',
              borderRadius: 999,
              height: s(40),
              justifyContent: 'center',
              marginBottom: y(28),
              width: s(40),
            })}
          >
            <ArrowLeftIcon color={palette.ink} size={s(20)} strokeWidth={2.5} />
          </Pressable>

          <Text
            selectable
            style={{
              color: palette.ink,
              fontSize: s(30),
              fontWeight: '900',
              letterSpacing: -0.8,
              lineHeight: s(36),
            }}
          >
            Bulk transfer
          </Text>
          <Text
            selectable
            style={{
              color: '#747a70',
              fontSize: s(15),
              fontWeight: '500',
              lineHeight: s(22),
              marginTop: y(7),
            }}
          >
            Pay your crew's approved task submissions in one batch. Select a team to see payout-ready work.
          </Text>

          <ScrollView
            contentContainerStyle={{ gap: y(10), paddingTop: y(24), paddingBottom: y(40) }}
            showsVerticalScrollIndicator={false}
          >
            {teams.length === 0 ? (
              <Text style={{ color: '#8c9188', fontSize: s(15), fontWeight: '500', marginTop: y(16) }}>
                No teams available.
              </Text>
            ) : (
              teams.map((team) => (
                <Pressable
                  key={team.id ?? team.name}
                  accessibilityRole="button"
                  onPress={() => handleSelectTeam(team)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: pressed ? '#eceee5' : '#f5f6f0',
                    borderColor: '#e2e4db',
                    borderRadius: s(20),
                    borderWidth: 1,
                    flexDirection: 'row',
                    gap: x(12),
                    paddingHorizontal: x(16),
                    paddingVertical: y(14),
                  })}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: palette.green,
                      borderRadius: 999,
                      height: s(40),
                      justifyContent: 'center',
                      width: s(40),
                    }}
                  >
                    <Text style={{ fontSize: s(18) }}>
                      {(team.name ?? 'T').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      selectable
                      style={{ color: palette.ink, fontSize: s(16), fontWeight: '800', letterSpacing: -0.2 }}
                    >
                      {team.name ?? 'Unnamed team'}
                    </Text>
                    {team.description ? (
                      <Text
                        selectable
                        style={{ color: '#747a70', fontSize: s(13), fontWeight: '500', marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {team.description}
                      </Text>
                    ) : null}
                  </View>
                  <ArrowLeftIcon
                    color="#a0a59d"
                    size={s(18)}
                    strokeWidth={2.5}
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Animated.View>
    );
  }

  // ── queue step ────────────────────────────────────────────────────────────
  if (step === 'queue') {
    return (
      <Animated.View
        style={{
          flex: 1,
          opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: screenTranslate }],
        }}
      >
        <View style={{ flex: 1, backgroundColor: palette.paper }}>
          {/* Header */}
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: x(10),
              paddingHorizontal: x(24),
              paddingTop: y(18),
              paddingBottom: y(14),
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('select-team')}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? '#e8ead3' : '#f0f1ea',
                borderRadius: 999,
                height: s(40),
                justifyContent: 'center',
                width: s(40),
              })}
            >
              <ArrowLeftIcon color={palette.ink} size={s(20)} strokeWidth={2.5} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text
                selectable
                style={{ color: palette.ink, fontSize: s(20), fontWeight: '900', letterSpacing: -0.5 }}
              >
                {selectedTeam?.name ?? 'Payout queue'}
              </Text>
              <Text
                selectable
                style={{ color: '#747a70', fontSize: s(12), fontWeight: '600', marginTop: 1 }}
              >
                Approved task submissions
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => selectedTeam?.id && loadQueue(selectedTeam.id)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? '#e8ead3' : '#f0f1ea',
                borderRadius: 999,
                height: s(36),
                justifyContent: 'center',
                width: s(36),
              })}
            >
              <Text style={{ fontSize: s(16) }}>↻</Text>
            </Pressable>
          </View>

          {/* Selected total bar */}
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#f7f8f4',
              borderColor: '#eceee7',
              borderRadius: s(18),
              borderWidth: 1,
              flexDirection: 'row',
              marginHorizontal: x(20),
              marginBottom: y(10),
              padding: x(14),
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: palette.green,
                borderRadius: 999,
                height: s(36),
                justifyContent: 'center',
                width: s(36),
              }}
            >
              <Text style={{ fontSize: s(16) }}>₦</Text>
            </View>
            <View style={{ flex: 1, marginLeft: x(10) }}>
              <Text
                selectable
                style={{ color: palette.ink, fontSize: s(19), fontWeight: '900' }}
              >
                {money(selectedTotal)}
              </Text>
              <Text
                selectable
                style={{ color: '#8c9188', fontSize: s(11), fontWeight: '800', textTransform: 'uppercase', marginTop: 1 }}
              >
                {selectedIds.length} selected
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setSelectedIds(
                  allSelected ? [] : pendingItems.map((item) => item.payout_approval_id),
                )
              }
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <Text
                selectable
                style={{
                  color: allSelected ? '#747a70' : palette.greenDeep,
                  fontSize: s(13),
                  fontWeight: '900',
                }}
              >
                {allSelected ? 'Clear' : 'Select all'}
              </Text>
            </Pressable>
          </View>

          {/* Queue list */}
          {queueLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: y(48) }}>
              <ActivityIndicator color={palette.greenDeep} />
              <Text style={{ color: '#8c9188', fontSize: s(14), fontWeight: '600', marginTop: y(12) }}>
                Loading payout queue...
              </Text>
            </View>
          ) : queueError ? (
            <View style={{ alignItems: 'center', paddingHorizontal: x(32), paddingVertical: y(36) }}>
              <Text style={{ color: '#e05252', fontSize: s(14), fontWeight: '700', textAlign: 'center' }}>
                {queueError}
              </Text>
              <Pressable
                onPress={() => selectedTeam?.id && loadQueue(selectedTeam.id)}
                style={{ marginTop: y(14) }}
              >
                <Text style={{ color: palette.greenDeep, fontSize: s(14), fontWeight: '900' }}>Try again</Text>
              </Pressable>
            </View>
          ) : queueItems.length === 0 ? (
            <View style={{ alignItems: 'center', paddingHorizontal: x(32), paddingVertical: y(48) }}>
              <Text
                selectable
                style={{ color: palette.ink, fontSize: s(17), fontWeight: '900', textAlign: 'center' }}
              >
                No approved submissions yet
              </Text>
              <Text
                selectable
                style={{ color: '#8c9188', fontSize: s(14), fontWeight: '500', lineHeight: s(20), marginTop: y(8), textAlign: 'center' }}
              >
                Once you approve crew work it appears here for payout.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ gap: y(10), paddingHorizontal: x(20), paddingBottom: y(120) }}
              showsVerticalScrollIndicator={false}
            >
              {queueItems.map((item) => {
                const selected = selectedIds.includes(item.payout_approval_id);
                const draft = amountDrafts[item.payout_approval_id] ?? '';
                const isDirty = parseAmt(draft) !== Number(item.amount_naira || 0);
                const isSaving = savingAmountId === item.payout_approval_id;
                const isPending = item.status === 'pending';

                return (
                  <View
                    key={item.payout_approval_id}
                    style={{
                      backgroundColor: '#fbfcf8',
                      borderColor: selected ? palette.green : '#eceee7',
                      borderRadius: s(20),
                      borderWidth: 1.5,
                      padding: x(14),
                    }}
                  >
                    <View style={{ flexDirection: 'row' }}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        disabled={!isPending}
                        onPress={() => toggleItem(item.payout_approval_id)}
                        style={({ pressed }) => ({
                          alignItems: 'center',
                          backgroundColor: selected ? palette.green : '#ffffff',
                          borderColor: selected ? palette.green : '#dfe2da',
                          borderRadius: 999,
                          borderWidth: 1,
                          height: s(28),
                          justifyContent: 'center',
                          opacity: pressed ? 0.7 : 1,
                          width: s(28),
                        })}
                      >
                        {selected ? (
                          <Text style={{ color: palette.ink, fontSize: s(14), fontWeight: '900' }}>✓</Text>
                        ) : null}
                      </Pressable>
                      <View style={{ flex: 1, marginLeft: x(11) }}>
                        <Text
                          selectable
                          style={{ color: palette.ink, fontSize: s(16), fontWeight: '900', letterSpacing: -0.2 }}
                        >
                          {item.member_name}
                        </Text>
                        <Text
                          selectable
                          style={{ color: '#747a70', fontSize: s(12), fontWeight: '600', marginTop: 2 }}
                        >
                          {item.task_title}
                        </Text>
                        <Text
                          selectable
                          style={{ color: '#a0a59d', fontSize: s(11), fontWeight: '700', marginTop: 3 }}
                        >
                          {item.bank_name || 'No bank'} · {item.account_number || 'No account'}
                        </Text>
                      </View>
                      {!isPending ? (
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            backgroundColor: '#eceee7',
                            borderRadius: 999,
                            paddingHorizontal: x(10),
                            paddingVertical: 3,
                          }}
                        >
                          <Text style={{ color: '#747a70', fontSize: s(11), fontWeight: '900', textTransform: 'uppercase' }}>
                            {item.status}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {isPending ? (
                      <View style={{ alignItems: 'center', flexDirection: 'row', gap: x(8), marginTop: y(12) }}>
                        <TextInput
                          keyboardType="decimal-pad"
                          onChangeText={(val) =>
                            setAmountDrafts((prev) => ({ ...prev, [item.payout_approval_id]: val }))
                          }
                          placeholder="0"
                          placeholderTextColor="#a5aaa0"
                          style={{
                            backgroundColor: '#ffffff',
                            borderColor: '#dfe2da',
                            borderRadius: s(14),
                            borderWidth: 1,
                            color: palette.ink,
                            flex: 1,
                            fontSize: s(17),
                            fontWeight: '900',
                            height: s(46),
                            paddingHorizontal: x(13),
                          }}
                          value={draft}
                        />
                        <Pressable
                          accessibilityRole="button"
                          disabled={!isDirty || isSaving}
                          onPress={() => saveAmount(item)}
                          style={({ pressed }) => ({
                            alignItems: 'center',
                            backgroundColor: isDirty ? palette.green : '#f0f1eb',
                            borderRadius: 999,
                            height: s(46),
                            justifyContent: 'center',
                            opacity: pressed ? 0.72 : 1,
                            paddingHorizontal: x(18),
                          })}
                        >
                          <Text style={{ color: palette.ink, fontSize: s(13), fontWeight: '900' }}>
                            {isSaving ? 'Saving' : 'Save'}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Continue button */}
          {!queueLoading && !queueError && selectedIds.length > 0 ? (
            <View
              style={{
                backgroundColor: palette.paper,
                borderTopColor: '#eceee7',
                borderTopWidth: 1,
                bottom: 0,
                left: 0,
                paddingBottom: y(32),
                paddingHorizontal: x(20),
                paddingTop: y(14),
                position: 'absolute',
                right: 0,
              }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep('review')}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: palette.ink,
                  borderRadius: 999,
                  height: s(54),
                  justifyContent: 'center',
                  opacity: pressed ? 0.78 : 1,
                })}
              >
                <Text style={{ color: '#ffffff', fontSize: s(15), fontWeight: '900', letterSpacing: -0.1 }}>
                  Review {selectedIds.length} payout{selectedIds.length === 1 ? '' : 's'} · {money(selectedTotal)}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Animated.View>
    );
  }

  // ── review step ───────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <Animated.View
        style={{
          flex: 1,
          opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: screenTranslate }],
        }}
      >
        <View style={{ flex: 1, backgroundColor: palette.paper }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: x(10),
              paddingHorizontal: x(24),
              paddingTop: y(18),
              paddingBottom: y(14),
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('queue')}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? '#e8ead3' : '#f0f1ea',
                borderRadius: 999,
                height: s(40),
                justifyContent: 'center',
                width: s(40),
              })}
            >
              <ArrowLeftIcon color={palette.ink} size={s(20)} strokeWidth={2.5} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text
                selectable
                style={{ color: palette.ink, fontSize: s(22), fontWeight: '900', letterSpacing: -0.6 }}
              >
                Review transfers
              </Text>
            </View>
          </View>

          {/* Total card */}
          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.ink,
              borderRadius: s(24),
              marginHorizontal: x(20),
              marginBottom: y(18),
              paddingVertical: y(22),
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: s(12), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total payout
            </Text>
            <Text style={{ color: '#ffffff', fontSize: s(36), fontWeight: '900', letterSpacing: -1, marginTop: y(4) }}>
              {money(selectedTotal)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: s(13), fontWeight: '600', marginTop: y(4) }}>
              {selectedItems.length} recipient{selectedItems.length === 1 ? '' : 's'} · {selectedTeam?.name}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: y(8), paddingHorizontal: x(20), paddingBottom: y(120) }}
            showsVerticalScrollIndicator={false}
          >
            {selectedItems.map((item) => (
              <View
                key={item.payout_approval_id}
                style={{
                  backgroundColor: '#f8f9f3',
                  borderColor: '#eceee7',
                  borderRadius: s(18),
                  borderWidth: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingHorizontal: x(16),
                  paddingVertical: y(14),
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text selectable style={{ color: palette.ink, fontSize: s(15), fontWeight: '800' }}>
                    {item.member_name}
                  </Text>
                  <Text selectable style={{ color: '#747a70', fontSize: s(12), fontWeight: '600', marginTop: 2 }}>
                    {item.task_title}
                  </Text>
                  <Text selectable style={{ color: '#a0a59d', fontSize: s(11), fontWeight: '700', marginTop: 3 }}>
                    {item.bank_name} · {item.account_number}
                  </Text>
                </View>
                <Text selectable style={{ color: palette.ink, fontSize: s(16), fontWeight: '900', letterSpacing: -0.3 }}>
                  {money(parseAmt(amountDrafts[item.payout_approval_id] ?? '0'))}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View
            style={{
              backgroundColor: palette.paper,
              borderTopColor: '#eceee7',
              borderTopWidth: 1,
              bottom: 0,
              left: 0,
              paddingBottom: y(32),
              paddingHorizontal: x(20),
              paddingTop: y(14),
              position: 'absolute',
              right: 0,
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => { setPasscode(''); setPasscodeError(''); setStep('passcode'); }}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: palette.ink,
                borderRadius: 999,
                height: s(54),
                justifyContent: 'center',
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text style={{ color: '#ffffff', fontSize: s(15), fontWeight: '900' }}>
                Confirm with passcode
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  }

  // ── passcode step ─────────────────────────────────────────────────────────
  if (step === 'passcode') {
    return (
      <Animated.View
        style={{
          flex: 1,
          opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: screenTranslate }],
        }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            backgroundColor: palette.paper,
            justifyContent: 'center',
            paddingHorizontal: x(32),
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep('review')}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed ? '#e8ead3' : '#f0f1ea',
              borderRadius: 999,
              height: s(40),
              justifyContent: 'center',
              left: x(20),
              position: 'absolute',
              top: y(18),
              width: s(40),
            })}
          >
            <ArrowLeftIcon color={palette.ink} size={s(20)} strokeWidth={2.5} />
          </Pressable>

          <Text
            selectable
            style={{ color: palette.ink, fontSize: s(26), fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' }}
          >
            Enter your passcode
          </Text>
          <Text
            selectable
            style={{ color: '#747a70', fontSize: s(14), fontWeight: '500', marginTop: y(8), textAlign: 'center', lineHeight: s(21) }}
          >
            Authorise payout of {money(selectedTotal)} to {selectedItems.length} crew member{selectedItems.length === 1 ? '' : 's'}.
          </Text>

          {/* Dot display */}
          <View style={{ flexDirection: 'row', gap: x(14), marginTop: y(32), marginBottom: y(8) }}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  backgroundColor: i < passcode.length ? palette.ink : '#dfe2da',
                  borderRadius: 999,
                  height: s(14),
                  width: s(14),
                }}
              />
            ))}
          </View>

          {passcodeError ? (
            <Text style={{ color: '#e05252', fontSize: s(13), fontWeight: '700', marginBottom: y(8), textAlign: 'center' }}>
              {passcodeError}
            </Text>
          ) : (
            <View style={{ height: s(20) + y(8) }} />
          )}

          {/* Numpad */}
          <View style={{ gap: y(10), width: '100%' }}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']].map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: x(10) }}>
                {row.map((digit) => (
                  <Pressable
                    key={digit}
                    accessibilityRole="button"
                    disabled={reserving}
                    onPress={() => {
                      if (digit === '⌫') {
                        setPasscode((p) => p.slice(0, -1));
                        setPasscodeError('');
                      } else if (digit === '') {
                        // spacer
                      } else if (passcode.length < 4) {
                        const next = passcode + digit;
                        setPasscode(next);
                        setPasscodeError('');
                      }
                    }}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor:
                        digit === ''
                          ? 'transparent'
                          : pressed
                          ? '#e0e2d8'
                          : '#f0f1ea',
                      borderRadius: s(18),
                      flex: 1,
                      height: s(60),
                      justifyContent: 'center',
                      opacity: reserving ? 0.5 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: palette.ink,
                        fontSize: s(22),
                        fontWeight: '900',
                      }}
                    >
                      {digit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={reserving || passcode.length !== 4}
            onPress={handleConfirmPasscode}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: passcode.length === 4 ? palette.ink : '#d8dbd2',
              borderRadius: 999,
              height: s(54),
              justifyContent: 'center',
              marginTop: y(18),
              opacity: pressed ? 0.78 : 1,
              width: '100%',
            })}
          >
            <Text
              style={{
                color: passcode.length === 4 ? '#ffffff' : '#747a70',
                fontSize: s(15),
                fontWeight: '900',
              }}
            >
              {reserving ? 'Processing...' : 'Confirm & pay crew'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // ── done step ─────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <Animated.View
        style={{
          flex: 1,
          opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: screenTranslate }],
        }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            backgroundColor: palette.paper,
            justifyContent: 'center',
            paddingHorizontal: x(32),
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.green,
              borderRadius: 999,
              height: s(80),
              justifyContent: 'center',
              marginBottom: y(24),
              width: s(80),
            }}
          >
            <Text style={{ fontSize: s(36) }}>✓</Text>
          </View>
          <Text
            selectable
            style={{ color: palette.ink, fontSize: s(28), fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' }}
          >
            Payouts reserved!
          </Text>
          <Text
            selectable
            style={{
              color: '#747a70',
              fontSize: s(15),
              fontWeight: '500',
              lineHeight: s(22),
              marginTop: y(10),
              textAlign: 'center',
            }}
          >
            {reservedBatch
              ? `${money(reservedBatch.totalNaira)} for ${reservedBatch.itemCount} payout${reservedBatch.itemCount === 1 ? '' : 's'} has been reserved and queued for Flutterwave transfer.`
              : 'Your payouts have been reserved and queued for Flutterwave transfer.'}
          </Text>
          <Text
            selectable
            style={{
              color: '#a0a59d',
              fontSize: s(13),
              fontWeight: '600',
              lineHeight: s(19),
              marginTop: y(10),
              textAlign: 'center',
            }}
          >
            Funds are locked from the wallet. Crew members will receive bank transfers as Flutterwave processes the batch.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: palette.ink,
              borderRadius: 999,
              height: s(54),
              justifyContent: 'center',
              marginTop: y(40),
              opacity: pressed ? 0.78 : 1,
              width: '100%',
            })}
          >
            <Text style={{ color: '#ffffff', fontSize: s(15), fontWeight: '900' }}>Done</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return null;
}

function AccountIntroScreen({
  onBack,
  onSelectRole,
}: {
  onBack: () => void;
  onSelectRole: (role: AccountRole) => void;
}) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 590;
  const heightScale = height / 1280;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const sidePadding = x(25);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1,
          paddingBottom: y(46),
          paddingHorizontal: sidePadding,
          paddingTop: y(109),
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: '#f1f2ee',
            borderRadius: 999,
            height: s(60),
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }],
            width: s(60),
          })}
        >
          <ArrowLeftIcon scale={scale} />
        </Pressable>

        <Text
          selectable
          style={{
            color: '#090a08',
            fontSize: appFontSize(s, 45),
            fontWeight: '800',
            letterSpacing: -Math.max(0.6, 1.1 * scale),
            lineHeight: s(58),
            marginTop: y(34),
          }}
        >
          What kind of account would you like to open today?
        </Text>
        <Text
          selectable
          style={{
            color: '#5d5f5a',
            fontSize: appFontSize(s, 24),
            fontWeight: '400',
            letterSpacing: -Math.max(0.1, 0.15 * scale),
            lineHeight: s(34),
            marginTop: y(23),
          }}
        >
          You can add another account later on, too.
        </Text>

        <View
          style={{
            gap: y(58),
            marginTop: y(101),
          }}
        >
          <AccountKindRow
            description="Post, create, assign, and pay for tasks."
            icon="lead"
            iconSize={s(48)}
            onPress={() => onSelectRole('crewlead')}
            scale={scale}
            textGap={x(34)}
            titleSize={s(24)}
            descriptionSize={s(19)}
            title="CrewLead"
          />
          <AccountKindRow
            description="Find tasks, complete them, and get paid."
            icon="mate"
            iconSize={s(48)}
            onPress={() => onSelectRole('crewmate')}
            scale={scale}
            textGap={x(34)}
            titleSize={s(24)}
            descriptionSize={s(19)}
            title="CrewMate"
          />
        </View>

        <View style={{ flex: 1 }} />
        <Text
          selectable
          style={{
            color: '#555851',
            fontSize: appFontSize(s, 20),
            fontWeight: '400',
            letterSpacing: -Math.max(0.1, 0.15 * scale),
            lineHeight: s(34),
            paddingHorizontal: x(22),
            textAlign: 'center',
          }}
        >
          You must use CrewPay in line with our{' '}
          <Text
            style={{
              color: palette.greenDeep,
              fontWeight: '800',
              textDecorationLine: 'underline',
            }}
          >
            Acceptable Use Policy
          </Text>
          . You can switch roles later from your profile.
        </Text>
      </View>
    </View>
  );
}

function AccountKindRow({
  description,
  icon,
  iconSize,
  onPress,
  scale,
  textGap,
  title,
  titleSize,
  descriptionSize,
}: {
  description: string;
  icon: 'lead' | 'mate';
  iconSize: number;
  onPress: () => void;
  scale: number;
  textGap: number;
  title: string;
  titleSize: number;
  descriptionSize: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: textGap,
        minHeight: Math.round(78 * scale),
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View
        style={{
          alignItems: 'center',
          borderRadius: 999,
          height: iconSize,
          justifyContent: 'center',
          width: iconSize,
        }}
      >
        {icon === 'lead' ? (
          <CrewLeadIcon scale={scale * 0.7} />
        ) : (
          <CrewMateIcon scale={scale * 0.7} />
        )}
      </View>
      <View style={{ flex: 1, flexShrink: 1, gap: sFor(scale, 7) }}>
        <Text
          selectable
          style={{
            color: '#090a08',
            fontSize: titleSize,
            fontWeight: '700',
            letterSpacing: -Math.max(0.2, 0.4 * scale),
            lineHeight: Math.round(titleSize * 1.2),
          }}
        >
          {title}
        </Text>
        <Text
          selectable
          style={{
            color: '#565953',
            fontSize: descriptionSize,
            fontWeight: '400',
            letterSpacing: -Math.max(0.1, 0.2 * scale),
            lineHeight: Math.round(descriptionSize * 1.35),
          }}
        >
          {description}
        </Text>
      </View>
      <ChevronRightIcon scale={scale} />
    </Pressable>
  );
}

function sFor(scale: number, value: number) {
  return Math.round(value * scale);
}

function appFontSize(s: (value: number) => number, value: number) {
  const scaled = s(value);
  const minimumLift = value < 18 ? 1 : 2;

  return Math.max(scaled + minimumLift, Math.round(scaled * 1.08), Math.round(value * 0.82));
}

function ArrowLeftIcon({
  color = palette.greenDeep,
  scale,
  size,
  style,
}: {
  color?: string;
  scale?: number;
  size?: number;
  strokeWidth?: number;
  style?: ViewStyle;
}) {
  const iconScale = scale ?? (size ? size / 26 : 1);
  return (
    <View
      style={{
        height: sFor(iconScale, 26),
        width: sFor(iconScale, 30),
        ...(style as object),
      }}
    >
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(iconScale, 3),
          left: sFor(iconScale, 2),
          position: 'absolute',
          top: sFor(iconScale, 12),
          width: sFor(iconScale, 25),
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(iconScale, 3),
          left: sFor(iconScale, 1),
          position: 'absolute',
          top: sFor(iconScale, 7),
          transform: [{ rotate: '-42deg' }],
          width: sFor(iconScale, 15),
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: sFor(iconScale, 3),
          left: sFor(iconScale, 1),
          position: 'absolute',
          top: sFor(iconScale, 17),
          transform: [{ rotate: '42deg' }],
          width: sFor(iconScale, 15),
        }}
      />
    </View>
  );
}

function ChevronRightIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        height: sFor(scale, 28),
        marginLeft: sFor(scale, 4),
        width: sFor(scale, 16),
      }}
    >
      <View
        style={{
          backgroundColor: palette.greenDeep,
          borderRadius: 999,
          height: sFor(scale, 3),
          position: 'absolute',
          right: 0,
          top: sFor(scale, 7),
          transform: [{ rotate: '45deg' }],
          width: sFor(scale, 17),
        }}
      />
      <View
        style={{
          backgroundColor: palette.greenDeep,
          borderRadius: 999,
          height: sFor(scale, 3),
          position: 'absolute',
          right: 0,
          top: sFor(scale, 18),
          transform: [{ rotate: '-45deg' }],
          width: sFor(scale, 17),
        }}
      />
    </View>
  );
}

function CrewMateIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        alignItems: 'center',
        height: sFor(scale, 34),
        width: sFor(scale, 34),
      }}
    >
      <View
        style={{
          borderColor: palette.ink,
          borderRadius: 999,
          borderWidth: Math.max(2, 3.4 * scale),
          height: sFor(scale, 17),
          width: sFor(scale, 17),
        }}
      />
      <View
        style={{
          borderColor: palette.ink,
          borderRadius: 999,
          borderTopWidth: Math.max(2, 3.4 * scale),
          height: sFor(scale, 18),
          marginTop: sFor(scale, 2),
          width: sFor(scale, 31),
        }}
      />
    </View>
  );
}

function CrewLeadIcon({ scale }: { scale: number }) {
  return (
    <View
      style={{
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: sFor(scale, 4),
        height: sFor(scale, 34),
      }}
    >
      {[20, 29, 24].map((barHeight, index) => (
        <View
          key={barHeight}
          style={{
            borderColor: palette.ink,
            borderRadius: sFor(scale, 3),
            borderWidth: Math.max(2, 2.8 * scale),
            height: sFor(scale, barHeight),
            width: sFor(scale, 11),
          }}
        >
          {index === 1 ? (
            <View
              style={{
                backgroundColor: palette.ink,
                height: sFor(scale, 7),
                left: sFor(scale, 2),
                position: 'absolute',
                right: sFor(scale, 2),
                top: -sFor(scale, 8),
              }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
