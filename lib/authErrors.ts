// Firebase reports auth failures as codes like "auth/email-already-in-use".
// Turn them into something a person can act on.
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  switch (code) {
    case "auth/invalid-email":
      return "That email address isn't valid.";
    // New projects have email enumeration protection on, so a wrong password
    // and an unknown email both come back as invalid-credential. That's on
    // purpose: it stops anyone probing which emails have accounts.
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
