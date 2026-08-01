// A curated list of commonly used disposable/temporary email services.
// These let anyone generate throwaway inboxes in seconds, specifically to
// bypass "one free account per email" limits — blocking them stops the
// most common form of casual free-tier abuse, without affecting genuine
// users on real providers (Gmail, Outlook, Yahoo, company email, etc.)
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "10minutemail.co.za", "temp-mail.org",
  "tempmail.com", "tempmail.net", "tempmail.io", "tempmailo.com", "throwawaymail.com",
  "throwaway.email", "trashmail.com", "trashmail.net", "trashmail.io", "getnada.com",
  "mailnesia.com", "maildrop.cc", "yopmail.com", "yopmail.net", "yopmail.fr",
  "fakeinbox.com", "fakemailgenerator.com", "mytemp.email", "mohmal.com", "moakt.cc",
  "dispostable.com", "mintemail.com", "spamgourmet.com", "mailcatch.com", "emailondeck.com",
  "tempinbox.com", "tempr.email", "burnermail.io", "temp-mail.io", "tempail.com",
  "discard.email", "discardmail.com", "spam4.me", "airmail.cc", "mailbox52.ml",
  "inboxbear.com", "correotemporal.org", "correo-temporal.com", "einrot.com",
  "emailtemporario.com.br", "onewaymail.com", "sogetthis.com", "spamherelots.com",
  "1secmail.com", "1secmail.net", "1secmail.org", "crazymailing.com", "emailfake.com",
  "fakemail.net", "getairmail.com", "harakirimail.com", "instant-mail.de",
  "kasmail.com", "mailtemp.info", "no-spam.ws", "noclickemail.com", "objectmail.com",
  "rcpt.at", "spamavert.com", "spambox.us", "spamfree24.org", "spamobox.com",
  "tempemail.co", "tempemail.net", "tempmailaddress.com", "tempymail.com",
  "wegwerfemail.de", "wegwerfmail.de", "wh4f.org", "zetmail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}
