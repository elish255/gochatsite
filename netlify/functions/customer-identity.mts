import type { UserValidateEvent, UserSignupEvent, UserModifiedEvent } from "@netlify/functions";
import { getDatabase } from "../lib/database.js";
import { normalizePhone } from "../lib/customer-care.js";
async function validate(event: UserValidateEvent | UserSignupEvent | UserModifiedEvent) {
  const phone = normalizePhone(String(event.user.userMetadata?.["phone"] || ""));
  if (!/^[1-9]\d{8,14}$/.test(phone)) return event.deny();
  const db = getDatabase();
  const bans = await db.sql`SELECT phone FROM gochati_phone_bans WHERE phone=${phone}`;
  if (bans.length) return event.deny();
}
export default {
  userValidate: validate,
  userSignup: validate,
  userModified: (event: UserModifiedEvent) =>
    event.user.userMetadata?.["phone"] ? validate(event) : undefined,
};
