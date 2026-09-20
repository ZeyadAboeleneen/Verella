"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema, formatMoney, type CheckoutInput } from "@verella/core";
import { placeOrderAction, previewOrderTotalsAction, type CheckoutTotalsPreview } from "@/lib/checkout/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, FormError } from "@/components/ui/card";
import { InstapayProofUpload } from "@/components/checkout/instapay-proof-upload";
import type { CartLineView } from "@/lib/cart/queries";
import type { SavedAddressView } from "@/lib/addresses/queries";
import type { Dictionary, Locale } from "@/lib/i18n";

function formatAddressLine(a: SavedAddressView): string {
  return [a.street, a.building, a.area, a.city, a.governorate].filter(Boolean).join(", ");
}

export function CheckoutForm({
  isLoggedIn,
  accountContact,
  savedAddresses = [],
  instapayDetails,
  paymentMethods,
  dict,
  locale,
  cartLines,
  initialSubtotalCents,
  governorates = [],
}: {
  isLoggedIn: boolean;
  /** Logged-in account's contact details, to prefill the Pickup contact card without forcing a re-type. */
  accountContact?: { name: string; phone: string; email: string } | null;
  /** Logged-in customer's previously-saved delivery addresses. */
  savedAddresses?: SavedAddressView[];
  /** InstaPay account to send payment to (Admin → Settings) — may be unconfigured. */
  instapayDetails: { number: string; name: string };
  paymentMethods: { code: string; name: string }[];
  dict: Dictionary;
  locale: Locale;
  cartLines: CartLineView[];
  initialSubtotalCents: number;
  /** Governorates with a configured delivery fee (Admin → Settings). Empty = free-text input. */
  governorates?: string[];
}) {
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
  // Only a click on "Apply" (or Enter in the field) commits a code to pricing —
  // typing alone shouldn't re-run validation on every keystroke or apply
  // half-typed codes.
  const [appliedCode, setAppliedCode] = useState<string | undefined>(undefined);
  // Defaults to the customer's default saved address (if any), otherwise a
  // fresh address form.
  const defaultSavedAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [addressMode, setAddressMode] = useState<"saved" | "new">(defaultSavedAddress ? "saved" : "new");

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema) as unknown as Resolver<CheckoutInput>,
    // Delivery-address fields are conditionally rendered (hidden entirely for
    // Pickup). Without this, RHF keeps them registered after they unmount, so
    // switching to Pickup still validates/blocks on "Recipient name is
    // required" etc. for fields that aren't even on screen anymore.
    shouldUnregister: true,
    defaultValues: {
      fulfillmentType: "delivery",
      paymentMethodCode: (paymentMethods[0]?.code as CheckoutInput["paymentMethodCode"]) ?? "cash_on_delivery",
      guestContact: accountContact
        ? { name: accountContact.name, phone: accountContact.phone, email: accountContact.email }
        : undefined,
      addressId: defaultSavedAddress?.id,
      newAddress: defaultSavedAddress ? undefined : { isDefault: true },
    },
  });

  const fulfillmentType = watch("fulfillmentType");
  const discountCode = watch("discountCode");
  const addressId = watch("addressId");
  const governorate = watch("newAddress.governorate") ?? savedAddresses.find((a) => a.id === addressId)?.governorate;
  const paymentMethodCode = watch("paymentMethodCode");
  const paymentProofMediaId = watch("paymentProofMediaId");

  // Recomputes totals whenever fulfillment/governorate change, or a discount
  // code is explicitly applied — reuses the exact same pricing logic
  // placeOrderAction commits with, so what's shown here can never drift from
  // what's actually charged.
  useEffect(() => {
    setPreviewPending(true);
    previewOrderTotalsAction(fulfillmentType, appliedCode, governorate)
      .then((result) => {
        if ("error" in result) return;
        setPreview(result.data);
      })
      .finally(() => setPreviewPending(false));
  }, [fulfillmentType, appliedCode, governorate]);

  function applyDiscountCode() {
    const code = getValues("discountCode")?.trim();
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
    // Charge whatever code was actually applied/validated in the summary
    // above, not a possibly-edited-but-never-reapplied field value.
    const result = await placeOrderAction({ ...values, discountCode: appliedCode });
    if ("error" in result) {
      setServerError(result.error);
      return;
    }
    router.push(`/order/${result.data.orderNumber}`);
  }

  // Surfaces validation failures anywhere in the (possibly nested) errors
  // object — otherwise a bad/missing value on a field without its own inline
  // message (e.g. a required address field) blocks submission with zero
  // visible feedback, which just looks like the button doing nothing.
  function collectErrorMessages(node: unknown, out: string[] = []): string[] {
    if (!node || typeof node !== "object") return out;
    if ("message" in node && typeof (node as { message?: unknown }).message === "string") {
      out.push((node as { message: string }).message);
      return out;
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectErrorMessages(value, out);
    }
    return out;
  }
  const formErrorMessages = collectErrorMessages(errors);

  const summaryBody = (
    <>
      <div className="space-y-2 text-sm">
        {cartLines.map((l) => (
          <div key={l.id} className="flex justify-between gap-3 text-on-surface-variant">
            <span className="min-w-0 truncate">
              {l.name} × {l.quantity}
            </span>
            <span className="shrink-0">{formatMoney(l.lineTotalCents, "EGP", locale)}</span>
          </div>
        ))}
      </div>
      <div className={`mt-4 space-y-1.5 border-t border-outline-variant/60 pt-4 text-sm transition-opacity ${previewPending ? "opacity-60" : ""}`}>
        <div className="flex justify-between text-on-surface-variant">
          <span>Price before discount</span>
          <span className={preview.discountTotalCents > 0 ? "line-through" : ""}>
            {formatMoney(preview.subtotalCents, "EGP", locale)}
          </span>
        </div>
        {preview.discountTotalCents > 0 && (
          <>
            <div className="flex justify-between text-secondary">
              <span>{dict.checkout.discount}</span>
              <span>-{formatMoney(preview.discountTotalCents, "EGP", locale)}</span>
            </div>
            <div className="flex justify-between font-semibold text-on-surface">
              <span>Price after discount</span>
              <span className="text-red-600 font-bold">{formatMoney(preview.subtotalCents - preview.discountTotalCents, "EGP", locale)}</span>
            </div>
          </>
        )}
        {fulfillmentType === "delivery" && (
          <div className="flex justify-between text-on-surface-variant">
            <span>{dict.checkout.deliveryFee}</span>
            <span>{formatMoney(preview.deliveryFeeCents, "EGP", locale)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-outline-variant/60 pt-2 font-semibold text-on-surface">
          <span>{dict.checkout.total}</span>
          <span>{formatMoney(preview.grandTotalCents, "EGP", locale)}</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
      {/* Mobile: fixed bar pinned to the bottom of the screen so the total
          stays visible no matter how far down the form the user scrolls.
          Expands upward to show the full breakdown. Desktop keeps the sticky
          sidebar card below, and the pb-24 on the form leaves room so this
          bar never covers the last field/button. */}
      <details className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/60 bg-surface-container-lowest shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)] lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-display text-sm font-bold text-on-surface [&::-webkit-details-marker]:hidden">
          <span>{dict.checkout.orderSummary}</span>
          <span className={previewPending ? "opacity-60" : ""}>{formatMoney(preview.grandTotalCents, "EGP", locale)}</span>
        </summary>
        <div className="max-h-[60vh] overflow-y-auto border-t border-outline-variant/60 p-4">{summaryBody}</div>
      </details>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24 lg:col-span-2 lg:pb-0">
        <FormError>{serverError}</FormError>
        {formErrorMessages.length > 0 && (
          <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error">
            <p className="font-semibold">Please fix the following:</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-4">
              {formErrorMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <Card>
          <CardContent className="space-y-4">
            <fieldset>
              <legend className="font-display text-lg font-bold text-on-surface">{dict.checkout.fulfillment}</legend>
              <div className="mt-4 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" value="delivery" {...register("fulfillmentType")} /> {dict.checkout.delivery}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" value="pickup" {...register("fulfillmentType")} /> {dict.checkout.pickup}
                </label>
              </div>
            </fieldset>
          </CardContent>
        </Card>

        {(!isLoggedIn || fulfillmentType === "pickup") && (
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-display text-lg font-bold text-on-surface">{dict.checkout.contactInfo}</h2>
              {isLoggedIn && (
                <p className="text-xs text-on-surface-variant">Who should we hand the order to at pickup?</p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="guestContact.name">Full name</Label>
                  <Input id="guestContact.name" {...register("guestContact.name")} />
                  {errors.guestContact?.name && <p className="mt-1 text-xs text-error">{errors.guestContact.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="guestContact.phone">Phone</Label>
                  <Input id="guestContact.phone" {...register("guestContact.phone")} />
                  {errors.guestContact?.phone && <p className="mt-1 text-xs text-error">{errors.guestContact.phone.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="guestContact.email">Email (optional)</Label>
                <Input id="guestContact.email" type="email" {...register("guestContact.email")} />
              </div>
            </CardContent>
          </Card>
        )}

        {fulfillmentType === "delivery" && (
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-display text-lg font-bold text-on-surface">{dict.checkout.deliveryAddress}</h2>

              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  {savedAddresses.map((a) => (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                        addressMode === "saved" && addressId === a.id
                          ? "border-primary bg-primary/5"
                          : "border-outline-variant/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="addressPicker"
                        className="mt-1"
                        checked={addressMode === "saved" && addressId === a.id}
                        onChange={() => {
                          setAddressMode("saved");
                          setValue("addressId", a.id, { shouldValidate: true });
                          setValue("newAddress", undefined);
                        }}
                      />
                      <span>
                        <span className="block font-semibold text-on-surface">
                          {a.label || a.recipientName}
                          {a.isDefault && <span className="ms-2 text-xs font-normal text-on-surface-variant">(Default)</span>}
                        </span>
                        <span className="block text-on-surface-variant">{formatAddressLine(a)}</span>
                        <span className="block text-on-surface-variant">{a.phone}</span>
                      </span>
                    </label>
                  ))}
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
                      addressMode === "new" ? "border-primary bg-primary/5" : "border-outline-variant/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressPicker"
                      checked={addressMode === "new"}
                      onChange={() => {
                        setAddressMode("new");
                        setValue("addressId", undefined);
                        setValue("newAddress", { isDefault: true } as CheckoutInput["newAddress"], { shouldValidate: true });
                      }}
                    />
                    <span className="font-semibold text-on-surface">Use a different address</span>
                  </label>
                  {errors.addressId && addressMode === "saved" && (
                    <p className="mt-1 text-xs text-error">{errors.addressId.message}</p>
                  )}
                </div>
              )}

              {addressMode === "new" && (
              <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="newAddress.recipientName">Recipient name</Label>
                  <Input id="newAddress.recipientName" {...register("newAddress.recipientName")} />
                  {errors.newAddress?.recipientName && (
                    <p className="mt-1 text-xs text-error">{errors.newAddress.recipientName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="newAddress.phone">Phone</Label>
                  <Input id="newAddress.phone" {...register("newAddress.phone")} />
                  {errors.newAddress?.phone && <p className="mt-1 text-xs text-error">{errors.newAddress.phone.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="newAddress.governorate">Governorate</Label>
                  {governorates.length > 0 ? (
                    <select
                      id="newAddress.governorate"
                      {...register("newAddress.governorate")}
                      defaultValue=""
                      className="flex h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface"
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      {governorates.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input id="newAddress.governorate" {...register("newAddress.governorate")} />
                  )}
                  {errors.newAddress?.governorate && (
                    <p className="mt-1 text-xs text-error">{errors.newAddress.governorate.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="newAddress.city">City</Label>
                  <Input id="newAddress.city" {...register("newAddress.city")} />
                </div>
                <div>
                  <Label htmlFor="newAddress.area">Area</Label>
                  <Input id="newAddress.area" {...register("newAddress.area")} />
                </div>
              </div>
              <div>
                <Label htmlFor="newAddress.street">Street</Label>
                <Input id="newAddress.street" {...register("newAddress.street")} />
                {errors.newAddress?.street && <p className="mt-1 text-xs text-error">{errors.newAddress.street.message}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="newAddress.building">Building</Label>
                  <Input id="newAddress.building" {...register("newAddress.building")} />
                </div>
                <div>
                  <Label htmlFor="newAddress.floor">Floor</Label>
                  <Input id="newAddress.floor" {...register("newAddress.floor")} />
                </div>
                <div>
                  <Label htmlFor="newAddress.apartment">Apartment</Label>
                  <Input id="newAddress.apartment" {...register("newAddress.apartment")} />
                </div>
              </div>
              <div>
                <Label htmlFor="newAddress.landmark">Landmark (optional)</Label>
                <Input id="newAddress.landmark" {...register("newAddress.landmark")} />
              </div>
              <label className="flex items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  defaultChecked
                  {...register("newAddress.isDefault")}
                  className="h-4 w-4 rounded border-outline-variant"
                />
                Save this address for next time
              </label>
              </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4">
            <h2 className="font-display text-lg font-bold text-on-surface">{dict.checkout.discountCode}</h2>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. RAMADAN25"
                {...register("discountCode", {
                  onChange: (e) => {
                    const upper = e.target.value.toUpperCase();
                    if (upper !== e.target.value) e.target.value = upper;
                  },
                })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyDiscountCode();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={applyDiscountCode} disabled={applyingDiscount || !discountCode?.trim()}>
                {applyingDiscount ? "…" : "Apply"}
              </Button>
            </div>
            {appliedCode && !preview.discountError && preview.discountTotalCents > 0 && (
              <p className="text-xs text-secondary">Code &ldquo;{appliedCode}&rdquo; applied.</p>
            )}
            {preview.discountError && <p className="text-xs text-error">{preview.discountError}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <fieldset>
              <legend className="font-display text-lg font-bold text-on-surface">{dict.checkout.paymentMethod}</legend>
              <div className="mt-3 space-y-3">
                {paymentMethods.map((m) => (
                  <label key={m.code} className="flex items-center gap-2 text-sm">
                    <input type="radio" value={m.code} {...register("paymentMethodCode")} /> {m.name}
                  </label>
                ))}
              </div>
            </fieldset>

            {paymentMethodCode === "instapay" && (
              <div className="mt-4 space-y-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4">
                {instapayDetails.number ? (
                  <div className="text-sm">
                    <p className="font-semibold text-on-surface">Send your payment to:</p>
                    <p className="mt-1 text-on-surface-variant">
                      {instapayDetails.number}
                      {instapayDetails.name ? ` — ${instapayDetails.name}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant">
                    InstaPay account details haven&apos;t been set up yet — contact us to get the payment number.
                  </p>
                )}

                <div>
                  <p className="mb-2 text-sm font-semibold text-on-surface">
                    Upload payment screenshot <span className="text-error">*</span>
                  </p>
                  <InstapayProofUpload onUploaded={(id) => setValue("paymentProofMediaId", id ?? undefined, { shouldValidate: true })} />
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Required — your order will be reviewed and approved once we verify the screenshot.
                  </p>
                  {errors.paymentProofMediaId && (
                    <p className="mt-1 text-xs text-error">{errors.paymentProofMediaId.message}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || (paymentMethodCode === "instapay" && !paymentProofMediaId)}
        >
          {isSubmitting ? "…" : dict.checkout.placeOrder}
        </Button>
      </form>

      <div
        className="hidden h-fit rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 lg:sticky lg:top-[calc(var(--nav-offset,60px)+16px)] lg:block lg:max-h-[calc(100vh-var(--nav-offset,60px)-32px)] lg:overflow-y-auto"
      >
        <h2 className="mb-4 font-display text-lg font-bold text-on-surface">{dict.checkout.orderSummary}</h2>
        {summaryBody}
      </div>
    </div>
  );
}
