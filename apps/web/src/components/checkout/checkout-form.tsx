"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronUp, Loader2, Lock } from "lucide-react";
import {
  checkoutSchema,
  formatMoney,
  governorateLabel,
  WALLET_PAYMENT_METHODS,
  type CheckoutInput,
  type PaymentMethodCode,
} from "@verella/core";
import { placeOrderAction, previewOrderTotalsAction, type CheckoutTotalsPreview } from "@/lib/checkout/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GovernorateSelect } from "@/components/ui/governorate-select";
import { FormError } from "@/components/ui/card";
import { PaymentProofUpload } from "@/components/checkout/payment-proof-upload";
import { VMark } from "@/components/brand/Logo";
import type { CartLineView } from "@/lib/cart/queries";
import type { SavedAddressView } from "@/lib/addresses/queries";
import type { WalletDetails } from "@/lib/settings/queries";
import type { Dictionary, Locale } from "@/lib/i18n";

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface-container-lowest p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-charcoal">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-charcoal text-xs tracking-normal text-ivory">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-error">{message}</p> : null;
}

export function CheckoutForm({
  isLoggedIn,
  accountContact,
  savedAddresses = [],
  wallets,
  paymentMethods,
  fulfillmentTypes,
  dict,
  locale,
  cartLines,
  initialSubtotalCents,
}: {
  isLoggedIn: boolean;
  /** Logged-in account's contact details, to prefill the pickup contact without a re-type. */
  accountContact?: { name: string; phone: string; email: string } | null;
  savedAddresses?: SavedAddressView[];
  wallets: WalletDetails;
  /** Active payment methods, in display order. */
  paymentMethods: PaymentMethodCode[];
  fulfillmentTypes: ("delivery" | "pickup")[];
  dict: Dictionary;
  locale: Locale;
  cartLines: CartLineView[];
  initialSubtotalCents: number;
}) {
  const t = dict.checkout;
  const money = (cents: number) => formatMoney(cents, "EGP", locale);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CheckoutTotalsPreview>({
    subtotalCents: initialSubtotalCents,
    discountTotalCents: 0,
    deliveryFeeCents: 0,
    taxTotalCents: 0,
    grandTotalCents: initialSubtotalCents,
  });
  const [previewPending, setPreviewPending] = useState(false);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  // Only an explicit Apply commits a code to pricing — not every keystroke.
  const [appliedCode, setAppliedCode] = useState<string | undefined>(undefined);
  const [codeInput, setCodeInput] = useState("");
  // Guests on delivery give name/phone once, on the address; email is extra.
  const [guestEmail, setGuestEmail] = useState("");
  const defaultSavedAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [addressMode, setAddressMode] = useState<"saved" | "new">(defaultSavedAddress ? "saved" : "new");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema) as unknown as Resolver<CheckoutInput>,
    // Fields that aren't on screen (e.g. the address during pickup) must not
    // keep validating after they unmount.
    shouldUnregister: true,
    defaultValues: {
      fulfillmentType: fulfillmentTypes[0] ?? "delivery",
      paymentMethodCode: paymentMethods[0] ?? "cash_on_delivery",
      guestContact: accountContact
        ? { name: accountContact.name, phone: accountContact.phone, email: accountContact.email }
        : undefined,
      addressId: defaultSavedAddress?.id,
      newAddress: defaultSavedAddress ? undefined : { isDefault: true },
    },
  });

  const fulfillmentType = watch("fulfillmentType");
  const addressId = watch("addressId");
  const governorate = watch("newAddress.governorate") ?? savedAddresses.find((a) => a.id === addressId)?.governorate;
  const paymentMethodCode = watch("paymentMethodCode");
  const paymentProofMediaId = watch("paymentProofMediaId");
  const isWallet = WALLET_PAYMENT_METHODS.includes(paymentMethodCode);
  const showContact = fulfillmentType === "pickup";
  const needsGovernorate = fulfillmentType === "delivery" && !governorate;

  // Totals come from the same pricing code placeOrderAction commits with, so
  // what's shown can't drift from what's charged.
  useEffect(() => {
    setPreviewPending(true);
    previewOrderTotalsAction(fulfillmentType, appliedCode, governorate)
      .then((result) => {
        if (!("error" in result)) setPreview(result.data);
      })
      .finally(() => setPreviewPending(false));
  }, [fulfillmentType, appliedCode, governorate]);

  function applyDiscountCode() {
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setAppliedCode(undefined);
      return;
    }
    setApplyingDiscount(true);
    previewOrderTotalsAction(fulfillmentType, code, governorate)
      .then((result) => {
        if ("error" in result) return;
        setPreview(result.data);
        setAppliedCode(code);
      })
      .finally(() => setApplyingDiscount(false));
  }

  async function onSubmit(values: CheckoutInput) {
    setServerError(null);
    let guestContact = values.guestContact;
    if (!isLoggedIn && values.fulfillmentType === "delivery" && values.newAddress) {
      guestContact = { name: values.newAddress.recipientName, phone: values.newAddress.phone, email: guestEmail.trim() };
    }
    const result = await placeOrderAction({ ...values, guestContact, discountCode: appliedCode });
    if ("error" in result) {
      setServerError(result.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push(`/order/${result.data.orderNumber}`);
  }

  // Any validation failure, including on fields without an inline message.
  function collectErrorMessages(node: unknown, out: string[] = []): string[] {
    if (!node || typeof node !== "object") return out;
    if ("message" in node && typeof (node as { message?: unknown }).message === "string") {
      out.push((node as { message: string }).message);
      return out;
    }
    for (const value of Object.values(node as Record<string, unknown>)) collectErrorMessages(value, out);
    return out;
  }
  const formErrorMessages = collectErrorMessages(errors);

  const wallet =
    paymentMethodCode === "instapay" ? wallets.instapay : paymentMethodCode === "vodafone_cash" ? wallets.vodafoneCash : null;

  const summaryLines = (
    <ul className="space-y-4">
      {cartLines.map((l) => (
        <li key={l.id} className="flex gap-3">
          <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container">
            {l.image ? (
              <Image src={l.image} alt={l.name} fill sizes="56px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <VMark size={20} className="text-beige" />
              </span>
            )}
            <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-charcoal px-1 text-[10px] text-ivory">
              {l.quantity}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="line-clamp-2 text-charcoal">{l.name}</p>
            {l.variantLabel && <p className="mt-0.5 text-xs text-on-surface-variant">{l.variantLabel}</p>}
          </div>
          <span className="shrink-0 text-sm text-charcoal">{money(l.lineTotalCents)}</span>
        </li>
      ))}
    </ul>
  );

  const totals = (
    <dl className={`space-y-2 text-sm transition-opacity duration-300 ${previewPending ? "opacity-50" : ""}`}>
      <div className="flex justify-between">
        <dt className="text-on-surface-variant">{t.subtotal}</dt>
        <dd className="text-charcoal">{money(preview.subtotalCents)}</dd>
      </div>
      {preview.discountTotalCents > 0 && (
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">{t.discount}</dt>
          <dd className="text-gold-ink">−{money(preview.discountTotalCents)}</dd>
        </div>
      )}
      {fulfillmentType === "delivery" && (
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">{t.deliveryFee}</dt>
          <dd className="text-charcoal">{needsGovernorate ? <span className="text-xs text-on-surface-variant">{t.deliveryPending}</span> : money(preview.deliveryFeeCents)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-beige pt-3">
        <dt className="font-medium text-charcoal">{t.total}</dt>
        <dd className="text-xl font-medium text-charcoal">{money(preview.grandTotalCents)}</dd>
      </div>
    </dl>
  );

  const discountBox = (
    <div>
      <div className="flex gap-2">
        <Input
          value={codeInput}
          placeholder={t.codePlaceholder}
          aria-label={t.discountCode}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyDiscountCode();
            }
          }}
          className="flex-1 uppercase"
        />
        <button
          type="button"
          onClick={applyDiscountCode}
          disabled={applyingDiscount || !codeInput.trim()}
          className="rounded-xl border border-charcoal px-4 text-xs font-medium uppercase tracking-[0.15em] text-charcoal transition-colors hover:bg-charcoal hover:text-ivory disabled:opacity-40"
        >
          {applyingDiscount ? <Loader2 size={14} className="animate-spin" /> : t.apply}
        </button>
      </div>
      {appliedCode && !preview.discountError && preview.discountTotalCents > 0 && (
        <p className="mt-2 text-xs text-gold-ink">{t.codeApplied.replace("{code}", appliedCode)}</p>
      )}
      {preview.discountError && <p className="mt-2 text-xs text-error">{preview.discountError}</p>}
    </div>
  );

  const canSubmit = !isSubmitting && !(isWallet && !paymentProofMediaId);

  return (
    <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
      {/* Mobile: the total stays pinned to the bottom; tap to expand the breakdown. */}
      <details className="group fixed inset-x-0 bottom-0 z-40 border-t border-beige bg-ivory shadow-[0_-12px_32px_-12px_rgba(20,20,20,0.18)] lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-charcoal">
            {t.orderSummary}
            <ChevronUp size={14} className="transition-transform duration-300 group-open:rotate-180" />
          </span>
          <span className={`text-base font-medium text-charcoal ${previewPending ? "opacity-50" : ""}`}>
            {money(preview.grandTotalCents)}
          </span>
        </summary>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto border-t border-beige px-5 py-5">
          {summaryLines}
          {discountBox}
          {totals}
        </div>
      </details>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-28 lg:col-span-3 lg:pb-0">
        <FormError>{serverError}</FormError>
        {formErrorMessages.length > 0 && (
          <div role="alert" className="rounded-xl border border-error/30 bg-error-container/40 p-4 text-xs text-on-error-container">
            <p className="font-medium">{t.fixErrors}</p>
            <ul className="mt-1.5 list-disc space-y-0.5 ps-4">
              {formErrorMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <Section step={1} title={fulfillmentType === "pickup" ? t.contactInfo : t.deliveryAddress}>
          {/* The field must stay registered even with a single option — shouldUnregister would otherwise drop it. */}
          {fulfillmentTypes.length === 1 && <input type="hidden" value={fulfillmentTypes[0]} {...register("fulfillmentType")} />}
          {fulfillmentTypes.length > 1 && (
            <fieldset className="mb-6">
              <legend className="mb-3 text-sm text-on-surface-variant">{t.fulfillment}</legend>
              <div className="grid grid-cols-2 gap-2">
                {fulfillmentTypes.map((type) => (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm transition-all duration-300 ${
                      fulfillmentType === type ? "border-charcoal bg-charcoal text-ivory" : "border-outline-variant hover:border-charcoal"
                    }`}
                  >
                    <input type="radio" value={type} className="sr-only" {...register("fulfillmentType")} />
                    {type === "delivery" ? t.delivery : t.pickup}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {showContact && (
            <div className="space-y-4">
              {isLoggedIn && <p className="text-xs text-on-surface-variant">{t.pickupWho}</p>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="guestContact.name">{t.fields.fullName}</Label>
                  <Input id="guestContact.name" autoComplete="name" {...register("guestContact.name")} />
                  <FieldError message={errors.guestContact?.name?.message} />
                </div>
                <div>
                  <Label htmlFor="guestContact.phone">{t.fields.phone}</Label>
                  <Input id="guestContact.phone" type="tel" inputMode="tel" autoComplete="tel" {...register("guestContact.phone")} />
                  <FieldError message={errors.guestContact?.phone?.message} />
                </div>
              </div>
              <div>
                <Label htmlFor="guestContact.email">{t.fields.email}</Label>
                <Input id="guestContact.email" type="email" autoComplete="email" {...register("guestContact.email")} />
                <p className="mt-1 text-xs text-on-surface-variant">{t.fields.emailHint}</p>
              </div>
            </div>
          )}

          {fulfillmentType === "delivery" && (
            <div className="space-y-4">
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  {savedAddresses.map((a) => {
                    const active = addressMode === "saved" && addressId === a.id;
                    return (
                      <label
                        key={a.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-all duration-300 ${
                          active ? "border-charcoal bg-surface-container-low" : "border-outline-variant hover:border-charcoal/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="addressPicker"
                          className="mt-1 accent-charcoal"
                          checked={active}
                          onChange={() => {
                            setAddressMode("saved");
                            setValue("addressId", a.id, { shouldValidate: true });
                            setValue("newAddress", undefined);
                          }}
                        />
                        <span>
                          <span className="block text-charcoal">
                            {a.label || a.recipientName}
                            {a.isDefault && (
                              <span className="ms-2 rounded-full bg-surface-container px-2 py-0.5 text-[10px] uppercase tracking-wider text-on-surface-variant">
                                {t.defaultAddress}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-on-surface-variant">
                            {[a.street, a.building, a.area, a.city, governorateLabel(a.governorate, locale)].filter(Boolean).join(locale === "ar" ? "، " : ", ")}
                          </span>
                          <span className="block text-on-surface-variant">{a.phone}</span>
                        </span>
                      </label>
                    );
                  })}
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition-all duration-300 ${
                      addressMode === "new" ? "border-charcoal bg-surface-container-low" : "border-outline-variant hover:border-charcoal/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressPicker"
                      className="accent-charcoal"
                      checked={addressMode === "new"}
                      onChange={() => {
                        setAddressMode("new");
                        setValue("addressId", undefined);
                        setValue("newAddress", { isDefault: true } as CheckoutInput["newAddress"], { shouldValidate: true });
                      }}
                    />
                    <span className="text-charcoal">{t.useDifferentAddress}</span>
                  </label>
                </div>
              )}

              {addressMode === "new" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="newAddress.recipientName">{isLoggedIn ? t.fields.recipientName : t.fields.fullName}</Label>
                      <Input id="newAddress.recipientName" autoComplete="name" {...register("newAddress.recipientName")} />
                      <FieldError message={errors.newAddress?.recipientName?.message} />
                    </div>
                    <div>
                      <Label htmlFor="newAddress.phone">{t.fields.phone}</Label>
                      <Input id="newAddress.phone" type="tel" inputMode="tel" autoComplete="tel" {...register("newAddress.phone")} />
                      <FieldError message={errors.newAddress?.phone?.message} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="newAddress.governorate">{t.fields.governorate}</Label>
                      <GovernorateSelect id="newAddress.governorate" locale={locale} defaultValue="" {...register("newAddress.governorate")} />
                      <FieldError message={errors.newAddress?.governorate?.message} />
                    </div>
                    <div>
                      <Label htmlFor="newAddress.area">{t.fields.area}</Label>
                      <Input id="newAddress.area" {...register("newAddress.area")} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="newAddress.street">{t.fields.street}</Label>
                    <Input id="newAddress.street" autoComplete="address-line1" {...register("newAddress.street")} />
                    <FieldError message={errors.newAddress?.street?.message} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="newAddress.building">{t.fields.building}</Label>
                      <Input id="newAddress.building" {...register("newAddress.building")} />
                    </div>
                    <div>
                      <Label htmlFor="newAddress.floor">{t.fields.floor}</Label>
                      <Input id="newAddress.floor" inputMode="numeric" {...register("newAddress.floor")} />
                    </div>
                    <div>
                      <Label htmlFor="newAddress.apartment">{t.fields.apartment}</Label>
                      <Input id="newAddress.apartment" {...register("newAddress.apartment")} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="newAddress.landmark">{t.fields.landmark}</Label>
                    <Input id="newAddress.landmark" {...register("newAddress.landmark")} />
                  </div>
                  {!isLoggedIn && (
                    <div>
                      <Label htmlFor="guestEmail">{t.fields.email}</Label>
                      <Input id="guestEmail" type="email" autoComplete="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                      <p className="mt-1 text-xs text-on-surface-variant">{t.fields.emailHint}</p>
                    </div>
                  )}
                  {isLoggedIn && (
                    <label className="flex items-center gap-2 text-sm text-charcoal">
                      <input type="checkbox" defaultChecked {...register("newAddress.isDefault")} className="h-4 w-4 accent-charcoal" />
                      {t.saveAddress}
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
        </Section>

        <Section step={2} title={t.paymentMethod}>
          <fieldset className="space-y-2">
            <legend className="sr-only">{t.paymentMethod}</legend>
            {paymentMethods.map((code) => {
              const active = paymentMethodCode === code;
              const m = t.methods[code];
              return (
                <label
                  key={code}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-300 ${
                    active ? "border-charcoal bg-surface-container-low" : "border-outline-variant hover:border-charcoal/50"
                  }`}
                >
                  <input type="radio" value={code} className="mt-1 accent-charcoal" {...register("paymentMethodCode")} />
                  <span>
                    <span className="block text-sm text-charcoal">{m.label}</span>
                    <span className="mt-0.5 block text-xs text-on-surface-variant">{m.hint}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {isWallet && (
            <div className="mt-4 space-y-4 rounded-xl bg-surface-container-low p-4">
              {wallet?.number ? (
                <div>
                  <p className="text-xs text-on-surface-variant">{t.wallet.sendTo.replace("{amount}", money(preview.grandTotalCents))}</p>
                  <p className="mt-1 text-lg font-medium tracking-wide text-charcoal" dir="ltr">
                    {wallet.number}
                  </p>
                  {wallet.name && <p className="text-xs text-on-surface-variant">{wallet.name}</p>}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">{t.wallet.missing}</p>
              )}
              <div>
                <p className="mb-2 text-sm text-charcoal">
                  {t.wallet.proofTitle} <span className="text-error">*</span>
                </p>
                <PaymentProofUpload
                  labels={t.wallet}
                  onUploaded={(id) => setValue("paymentProofMediaId", id ?? undefined, { shouldValidate: true })}
                />
                <p className="mt-2 text-xs text-on-surface-variant">{t.wallet.proofHint}</p>
                <FieldError message={errors.paymentProofMediaId?.message} />
              </div>
            </div>
          )}
        </Section>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-charcoal text-xs font-medium uppercase tracking-[0.25em] text-ivory transition-all duration-300 hover:bg-primary-container active:scale-[0.99] disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={14} />}
          {isSubmitting ? t.placing : `${t.placeOrder} · ${money(preview.grandTotalCents)}`}
        </button>
        <p className="text-center text-xs text-on-surface-variant">{t.secureNote}</p>
      </form>

      <aside className="hidden h-fit space-y-6 rounded-2xl bg-surface-container-low p-7 lg:sticky lg:top-[calc(var(--nav-offset,72px)+24px)] lg:col-span-2 lg:block">
        <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-charcoal">{t.orderSummary}</h2>
        {summaryLines}
        <div className="border-t border-beige pt-5">{discountBox}</div>
        {totals}
      </aside>
    </div>
  );
}
