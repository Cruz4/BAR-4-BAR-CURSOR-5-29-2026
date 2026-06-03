/** Master studio admin — set MASTER_ADMIN_EMAIL / NEXT_PUBLIC_MASTER_ADMIN_EMAIL to override. */
const DEFAULT_MASTER_ADMIN_EMAIL = 'plotformaiplan@gmail.com';

export function getMasterAdminEmail(): string {
  if (typeof window !== 'undefined') {
    return (
      process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL?.trim().toLowerCase() ||
      DEFAULT_MASTER_ADMIN_EMAIL
    );
  }
  return (
    process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase() ||
    process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL?.trim().toLowerCase() ||
    DEFAULT_MASTER_ADMIN_EMAIL
  );
}

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getMasterAdminEmail();
}
