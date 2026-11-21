type ActivationAccount = {
  account_status?: string | null;
  activation_paid?: boolean | null;
  activation_fee_enabled?: boolean;
};

export function hasAccountAccess(account: ActivationAccount | null | undefined) {
  if (!account) return false;
  if (account.account_status === "banned" || account.account_status === "deactivated") return false;
  return (
    account.account_status === "active" ||
    (account.activation_fee_enabled === false &&
      ["pending", "inactive"].includes(account.account_status || ""))
  );
}

export function hasActivationAccess(account: ActivationAccount | null | undefined) {
  return (
    hasAccountAccess(account) &&
    (account?.activation_fee_enabled === false || account?.activation_paid === true)
  );
}
