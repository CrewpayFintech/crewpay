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
  { code: '50931', name: 'Bowen Microfinance Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '562', name: 'Ekondo Microfinance Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '00103', name: 'Globus Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '303', name: 'Lotus Bank' },
  { code: '50515', name: 'Moniepoint Microfinance Bank' },
  { code: '100002', name: 'Paga' },
  { code: '526', name: 'Parallex Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '502', name: 'Rand Merchant Bank' },
  { code: '125', name: 'Rubies Microfinance Bank' },
  { code: '51310', name: 'Sparkle Microfinance Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'SunTrust Bank' },
  { code: '302', name: 'TAJBank' },
  { code: '090115', name: 'TCF Microfinance Bank' },
  { code: '102', name: 'Titan Trust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
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
