const GENERIC_AUTH_MESSAGE = "Operatiunea de autentificare nu a putut fi finalizata acum.";

export function sanitizeSupabaseAuthErrorMessage(
  message: string | null | undefined,
  fallback = GENERIC_AUTH_MESSAGE,
) {
  const normalizedMessage = message?.replace(/\s+/g, " ").trim().toLowerCase();

  if (!normalizedMessage) {
    return fallback;
  }

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid email or password")
  ) {
    return "Emailul sau parola nu sunt corecte.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Adresa de email nu a fost confirmata inca. Verifica emailul si confirma contul inainte de autentificare.";
  }

  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already registered")
  ) {
    return "Exista deja un cont asociat acestui email.";
  }

  if (
    normalizedMessage.includes("password should be at least") ||
    normalizedMessage.includes("password is too short")
  ) {
    return "Parola este prea scurta.";
  }

  if (
    normalizedMessage.includes("same password") ||
    normalizedMessage.includes("new password should be different")
  ) {
    return "Alege o parola diferita fata de cea actuala.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return "Prea multe incercari intr-un timp scurt. Incearca din nou in cateva minute.";
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("fetch") ||
    normalizedMessage.includes("failed to fetch")
  ) {
    return "Conexiunea nu este disponibila momentan. Incearca din nou.";
  }

  if (
    normalizedMessage.includes("expired") ||
    normalizedMessage.includes("invalid token") ||
    normalizedMessage.includes("otp")
  ) {
    return "Linkul de autentificare sau de resetare nu mai este valid.";
  }

  return fallback;
}
