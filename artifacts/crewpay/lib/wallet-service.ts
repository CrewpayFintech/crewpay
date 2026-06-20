import { supabase } from './supabase';
import { Platform } from 'react-native';

export type WalletSummary = {
  availableBalanceNaira: number;
  healthPercent: number;
  latestFundingBaselineNaira: number;
};

export type WalletTransactionStatus =
  | 'cancelled'
  | 'failed'
  | 'pending'
  | 'processing'
  | 'succeeded';

export type WalletTransaction = {
  amountNaira: number;
  createdAt: string;
  direction: 'credit' | 'debit' | 'reserve' | 'release';
  id: string;
  status: WalletTransactionStatus | string;
  subtitle: string;
  title: string;
  txRef?: string;
};

export type CreateWalletDepositResult = {
  amountNaira: number;
  checkoutUrl: string;
  depositId: string;
  txRef: string;
};

export type VerifyWalletDepositResult = {
  amountNaira: number;
  status: WalletTransactionStatus | string;
  txRef: string;
  verified: boolean;
};

type WalletSummaryRpcRow = {
  available_balance_naira: number | string | null;
  health_percent: number | string | null;
  latest_funding_baseline_naira: number | string | null;
};

type WalletDepositRow = {
  amount_naira: number | string;
  created_at: string;
  id: string;
  payment_method: string | null;
  provider_reference: string | null;
  status: WalletTransactionStatus;
  tx_ref: string;
  updated_at: string;
};

type WalletLedgerRow = {
  amount_naira: number | string;
  created_at: string;
  direction: 'credit' | 'debit' | 'reserve' | 'release';
  entry_type: string;
  id: string;
  reference_type: string | null;
  status: string;
};

function numericValue(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getReturnUrlParam(inputUrl: string, names: string[]) {
  try {
    const parsed = new URL(inputUrl);
    const hashParams = parsed.hash
      ? new URLSearchParams(parsed.hash.replace(/^#\??/, ''))
      : null;

    for (const name of names) {
      const value = parsed.searchParams.get(name) ?? hashParams?.get(name);

      if (value) {
        return value;
      }
    }
  } catch {
    const query = inputUrl.split('?')[1]?.split('#')[0] ?? '';
    const params = new URLSearchParams(query);

    for (const name of names) {
      const value = params.get(name);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function depositSubtitle(status: WalletTransactionStatus) {
  if (status === 'succeeded') return 'Added to CrewPay wallet';
  if (status === 'failed') return 'Top up failed';
  if (status === 'cancelled') return 'Top up cancelled';
  return 'Waiting for Flutterwave confirmation';
}

function ledgerTitle(entryType: string) {
  if (entryType.includes('payout')) return 'Task payout';
  if (entryType.includes('reserve')) return 'Funds reserved';
  return 'Wallet activity';
}

function ledgerSubtitle(direction: WalletLedgerRow['direction'], status: string) {
  if (direction === 'reserve') return 'Reserved for approved workers';
  if (direction === 'debit') return 'Money sent from wallet';
  if (status === 'posted') return 'Posted to wallet';
  return status;
}

export async function getWalletSummary(): Promise<WalletSummary> {
  const result = await supabase.rpc('get_my_wallet_summary');

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as
    | WalletSummaryRpcRow
    | undefined;

  return {
    availableBalanceNaira: numericValue(row?.available_balance_naira),
    healthPercent: Math.round(numericValue(row?.health_percent)),
    latestFundingBaselineNaira: numericValue(row?.latest_funding_baseline_naira),
  };
}

export async function createWalletDeposit(input: {
  amountNaira: number;
}): Promise<CreateWalletDepositResult> {
  const webOrigin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? (window as unknown as { location: { origin: string } }).location.origin
      : '';
  const redirectUrl = webOrigin
    ? `${webOrigin}/wallet/deposit-return`
    : 'crewpay://wallet/deposit-return';

  const result = await supabase.functions.invoke('create-wallet-deposit', {
    body: {
      amount_naira: input.amountNaira,
      redirect_url: redirectUrl,
    },
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const data = result.data as Partial<{
    amount_naira: number;
    checkout_url: string;
    deposit_id: string;
    tx_ref: string;
  }>;

  if (!data.checkout_url || !data.deposit_id || !data.tx_ref) {
    throw new Error('Flutterwave did not return a checkout link.');
  }

  return {
    amountNaira: numericValue(data.amount_naira),
    checkoutUrl: data.checkout_url,
    depositId: data.deposit_id,
    txRef: data.tx_ref,
  };
}

export async function verifyWalletDepositReturnUrl(
  inputUrl: string,
  fallbackTxRef?: string | null,
): Promise<VerifyWalletDepositResult | null> {
  const transactionId = getReturnUrlParam(inputUrl, ['transaction_id', 'id']);
  const txRef =
    getReturnUrlParam(inputUrl, ['tx_ref', 'txRef', 'reference']) ??
    fallbackTxRef ??
    null;
  const status = getReturnUrlParam(inputUrl, ['status', 'event', 'event_type']);

  if (!transactionId && !txRef) {
    return null;
  }

  const result = await supabase.functions.invoke('verify-wallet-deposit', {
    body: {
      status,
      transaction_id: transactionId,
      tx_ref: txRef,
    },
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const data = result.data as Partial<{
    amount_naira: number;
    status: WalletTransactionStatus | string;
    tx_ref: string;
    verified: boolean;
  }>;

  return {
    amountNaira: numericValue(data.amount_naira),
    status: data.status ?? 'processing',
    txRef: data.tx_ref ?? txRef ?? '',
    verified: Boolean(data.verified),
  };
}

export async function listWalletTransactions(): Promise<WalletTransaction[]> {
  const [depositsResult, ledgerResult] = await Promise.all([
    supabase
      .from('wallet_deposits')
      .select(
        'amount_naira, created_at, id, payment_method, provider_reference, status, tx_ref, updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('wallet_ledger_entries')
      .select('amount_naira, created_at, direction, entry_type, id, reference_type, status')
      .neq('entry_type', 'wallet_deposit')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (depositsResult.error) {
    throw new Error(depositsResult.error.message);
  }

  if (ledgerResult.error) {
    throw new Error(ledgerResult.error.message);
  }

  const deposits = ((depositsResult.data ?? []) as WalletDepositRow[]).map(
    (deposit) => ({
      amountNaira: numericValue(deposit.amount_naira),
      createdAt: deposit.created_at,
      direction: 'credit' as const,
      id: `deposit-${deposit.id}`,
      status: deposit.status,
      subtitle: depositSubtitle(deposit.status),
      title: 'Wallet top up',
      txRef: deposit.tx_ref,
    }),
  );

  const ledgerEntries = ((ledgerResult.data ?? []) as WalletLedgerRow[]).map(
    (entry) => ({
      amountNaira: numericValue(entry.amount_naira),
      createdAt: entry.created_at,
      direction: entry.direction,
      id: `ledger-${entry.id}`,
      status: entry.status,
      subtitle: ledgerSubtitle(entry.direction, entry.status),
      title: ledgerTitle(entry.entry_type),
    }),
  );

  return [...deposits, ...ledgerEntries].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}
