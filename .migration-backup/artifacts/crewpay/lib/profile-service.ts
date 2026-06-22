import { supabase } from './supabase';

export type AccountRole = 'crewlead' | 'crewmate';

export type ProfileRecord = {
  account_role: AccountRole;
  country_code: string | null;
  country_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  id: string;
  last_name: string | null;
  onboarding_completed_at: string | null;
  onboarding_status: string;
};

export type ProfileAddressRecord = {
  address_source: string;
  city: string;
  country_code: string;
  country_name: string;
  home_address: string;
  id: string;
  postcode: string | null;
  profile_id: string;
};

export async function getMyProfile(): Promise<ProfileRecord | null> {
  const userResult = await supabase.auth.getUser();
  const userId = userResult.data.user?.id;

  if (!userId) {
    return null;
  }

  const result = await supabase
    .from('profiles')
    .select(
      'account_role, country_code, country_name, date_of_birth, email, first_name, full_name, id, last_name, onboarding_completed_at, onboarding_status',
    )
    .eq('id', userId)
    .limit(1);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data?.[0] as ProfileRecord | undefined) ?? null;
}

export async function getMyProfileAddress(): Promise<ProfileAddressRecord | null> {
  const result = await supabase
    .from('profile_addresses')
    .select(
      'address_source, city, country_code, country_name, home_address, id, postcode, profile_id',
    )
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ProfileAddressRecord | null;
}

export async function saveProfileRole(input: {
  email: string;
  role: AccountRole;
}) {
  const result = await supabase.rpc('upsert_profile_onboarding', {
    p_account_role: input.role,
    p_email: input.email,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ProfileRecord;
}

export async function saveProfileDetails(input: {
  countryCode: string;
  countryName: string;
  dateOfBirth: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AccountRole;
}) {
  const result = await supabase.rpc('upsert_profile_details', {
    p_account_role: input.role,
    p_country_code: input.countryCode,
    p_country_name: input.countryName,
    p_date_of_birth: input.dateOfBirth,
    p_email: input.email,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ProfileRecord;
}

export async function saveProfileAddress(input: {
  city: string;
  countryCode: string;
  countryName: string;
  homeAddress: string;
  postcode: string;
  source?: string;
}) {
  const result = await supabase.rpc('upsert_profile_address', {
    p_address_source: input.source ?? 'manual',
    p_city: input.city,
    p_country_code: input.countryCode,
    p_country_name: input.countryName,
    p_home_address: input.homeAddress,
    p_postcode: input.postcode,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ProfileAddressRecord;
}

export async function markOnboardingComplete() {
  const result = await supabase.rpc('mark_onboarding_complete');

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ProfileRecord;
}
