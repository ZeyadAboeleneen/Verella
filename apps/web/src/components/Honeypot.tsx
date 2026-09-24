import { HONEYPOT_FIELD } from "@/lib/spam";

/** Off-screen trap field for bots — hidden from people and screen readers, skipped by autofill. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
      <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
