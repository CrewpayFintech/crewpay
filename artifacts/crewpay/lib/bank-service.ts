import { supabase } from './supabase';
import { ensureAuthenticatedUser } from './team-service';

export type NigerianBank = {
  code: string;
  name: string;
};

export type BankAccountInput = {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
};

export type BankAccountRecord = {
  account_name: string;
  account_number: string;
  bank_code: string | null;
  bank_name: string;
  created_at: string;
  id: string;
  is_verified: boolean;
  profile_id: string;
  updated_at: string;
};

export const nigerianBanks: NigerianBank[] = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank Diamond' },
  { code: '035A', name: 'ALAT by Wema' },
  { code: '401', name: 'Aso Savings and Loans' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '50515', name: 'Moniepoint Microfinance Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '057', name: 'Zenith Bank' },
].sort((a, b) => a.name.localeCompare(b.name));

export async function getMyBankAccount(): Promise<BankAccountRecord | null> {
  const result = await supabase
    .from('bank_accounts')
    .select(
      'account_name, account_number, bank_code, bank_name, created_at, id, is_verified, profile_id, updated_at',
    )
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as BankAccountRecord | null;
}

export async function saveBankAccount(
  input: BankAccountInput,
): Promise<BankAccountRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('upsert_bank_account', {
    p_account_name: input.accountName,
    p_account_number: input.accountNumber,
    p_bank_code: input.bankCode,
    p_bank_name: input.bankName,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as BankAccountRecord;
}
