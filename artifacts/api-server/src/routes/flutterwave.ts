import { Router } from "express";

const flutterwaveRouter = Router();

flutterwaveRouter.get("/verify-bank", async (req, res) => {
  const { account_number, bank_code } = req.query;

  if (!account_number || !bank_code) {
    res
      .status(400)
      .json({ error: "account_number and bank_code are required" });
    return;
  }

  const secretKey = process.env["FLW_SECRET_KEY"];

  if (!secretKey) {
    res.status(503).json({ error: "Bank verification is not configured" });
    return;
  }

  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/accounts/resolve?account_number=${encodeURIComponent(
        String(account_number),
      )}&account_bank=${encodeURIComponent(String(bank_code))}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      const message =
        typeof (data as any)?.message === "string"
          ? (data as any).message
          : "Account not found";
      res.status(422).json({ error: message });
      return;
    }

    const accountData = (data as any)?.data ?? {};

    res.json({
      account_name: accountData.account_name ?? null,
      account_number: accountData.account_number ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to verify bank account" });
  }
});

export default flutterwaveRouter;
