"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ImageUp, Loader2 } from "lucide-react";
import { presignCheckoutPaymentProofUploadAction, confirmCheckoutPaymentProofAction } from "@/lib/payments/actions";
import type { Dictionary } from "@/lib/i18n";

/** Transfer-screenshot upload for wallet payments (InstaPay / Vodafone Cash), shown before the order is placed. */
export function PaymentProofUpload({
  onUploaded,
  labels,
}: {
  onUploaded: (mediaId: number | null) => void;
  labels: Dictionary["checkout"]["wallet"];
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    onUploaded(null);
    try {
      const presign = await presignCheckoutPaymentProofUploadAction({ filename: file.name, mime: file.type, sizeBytes: file.size });
      if ("error" in presign) throw new Error(presign.error);

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", presign.data.apiKey);
      form.append("timestamp", String(presign.data.timestamp));
      form.append("signature", presign.data.signature);
      form.append("folder", presign.data.folder);
      form.append("type", presign.data.type);
      if (presign.data.transformation) form.append("transformation", presign.data.transformation);
      const upload = await fetch(presign.data.uploadUrl, { method: "POST", body: form });
      const uploaded = await upload.json();
      if (!upload.ok) throw new Error(labels.failed);

      const confirmed = await confirmCheckoutPaymentProofAction({
        publicId: uploaded.public_id,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
      });
      if ("error" in confirmed) throw new Error(confirmed.error);

      setUploadedName(file.name);
      onUploaded(confirmed.data.mediaId);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : labels.failed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm transition-colors duration-300 disabled:opacity-60 ${
          uploadedName && !error
            ? "border-gold bg-secondary-container/40 text-charcoal"
            : "border-outline hover:border-charcoal hover:bg-surface-container-low"
        }`}
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : uploadedName ? <CheckCircle2 size={16} className="text-gold" /> : <ImageUp size={16} />}
        {uploading ? labels.uploading : uploadedName ? labels.replace : labels.upload}
      </button>
      {uploadedName && !error && (
        <p className="mt-2 text-xs text-on-surface-variant">{labels.uploaded.replace("{name}", uploadedName)}</p>
      )}
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
