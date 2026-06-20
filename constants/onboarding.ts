import rawCountries from 'world-countries';
import type { ImageSourcePropType } from 'react-native';

import { palette } from './theme';
import type { CountryOption, SetupStep, Slide } from '../types/app';

type RawCountry = {
  cca2: string;
  idd?: {
    root?: string;
    suffixes?: string[];
  };
  name: {
    common: string;
  };
};

function countryCodeToFlag(code: string) {
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0)),
    );
}

export const slides: Slide[] = [
  {
    eyebrow: 'CrewPay',
    title: 'crewpay',
    body: '',
    accent: palette.green,
    cta: 'Next',
  },
  {
    eyebrow: 'Find work',
    title: 'GET PAID FOR QUICK TASKS',
    body: 'Pick a job that fits your day, finish it well, and watch your payout move.',
    image: require('../assets/onboarding/optimized/payout-plane.jpg'),
    imageScale: 1.13,
    imageOffsetY: -12,
    cta: 'Next',
  },
  {
    eyebrow: 'Do the work',
    title: 'COMPLETE TASKS WITH CONFIDENCE',
    body: 'Every task has a clear brief, reward, and proof step before money changes hands.',
    image: require('../assets/onboarding/optimized/earnings-bars.jpg'),
    imageScale: 1.03,
    imageOffsetY: 6,
    cta: 'Next',
  },
  {
    eyebrow: 'Post jobs',
    title: 'POST A TASK WITH A CLEAR REWARD',
    body: 'Need help fast? Set the work, set the pay, and let the right person claim it.',
    image: require('../assets/onboarding/optimized/crew-card.jpg'),
    imageScale: 1.13,
    imageOffsetY: 4,
    cta: 'Next',
  },
  {
    eyebrow: 'Track money',
    title: 'SEE EVERY PAYOUT IN ONE PLACE',
    body: 'Completed jobs, pending rewards, and saved earnings stay tidy inside CrewPay.',
    image: require('../assets/onboarding/optimized/reward-pots.jpg'),
    imageScale: 1.08,
    imageOffsetY: 16,
    cta: 'Next',
  },
  {
    eyebrow: 'Stay protected',
    title: 'KEEP EACH JOB LOCKED DOWN',
    body: 'CrewPay keeps task details and payment steps organized from claim to cashout.',
    image: require('../assets/onboarding/optimized/secure-lock.jpg'),
    imageScale: 1.08,
    imageOffsetX: 12,
    imageOffsetY: 10,
    cta: 'Next',
  },
  {
    eyebrow: 'Wallet ready',
    title: 'ONE CREWPAY WALLET FOR EVERY JOB',
    body: 'Earn from tasks, post work, and manage your CrewPay balance from one clean place.',
    image: require('../assets/onboarding/optimized/global-wallet.jpg'),
    imageScale: 1.16,
    imageOffsetX: -10,
    imageOffsetY: 8,
    cta: 'Create account',
  },
];

export const passcodeSecuredImage = require('../assets/onboarding/optimized/passcode-secured.png');
export const checkEmailImage = require('../assets/onboarding/optimized/check-email.jpg');
export const debitCard3dImage = require('../assets/home/debit-card-3d.png');

export const splashImageAssets = slides
  .map((slide) => slide.image)
  .filter((image): image is ImageSourcePropType => Boolean(image));

export const persistentImageAssets = [
  ...splashImageAssets,
  passcodeSecuredImage,
  checkEmailImage,
];

export const crewLeadSetupSteps: SetupStep[] = [
  'country',
  'password',
  'confirmPassword',
  'passcode',
  'confirmPasscode',
  'complete',
  'profile',
  'address',
];

export const crewMateSetupSteps: SetupStep[] = [
  'country',
  'password',
  'confirmPassword',
  'passcode',
  'confirmPasscode',
  'complete',
  'profile',
  'address',
  'bankDetails',
];

export const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const countries: CountryOption[] = (rawCountries as RawCountry[])
  .map((country) => {
    const dialCode = `${country.idd?.root ?? ''}${
      country.idd?.suffixes?.[0] ?? ''
    }`;

    return {
      code: country.cca2,
      dialCode,
      flag: countryCodeToFlag(country.cca2),
      name: country.name.common,
    };
  })
  .filter((country) => country.code && country.name && country.dialCode)
  .sort((a, b) => a.name.localeCompare(b.name));

export const defaultCountry =
  countries.find((country) => country.code === 'NG') ?? countries[0];
