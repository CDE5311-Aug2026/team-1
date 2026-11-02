// The team password for /admin and the /test results. It lives in sessionStorage for this tab only:
// a deliberate exception to the stores convention, since it is not app data and must not outlive the tab.
export const PASSWORD_KEY = 'intentai:admin-password';

export function readPassword(): string {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writePassword(value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(PASSWORD_KEY);
    else sessionStorage.setItem(PASSWORD_KEY, value);
  } catch {
    // Private mode: the password just isn't remembered.
  }
}
