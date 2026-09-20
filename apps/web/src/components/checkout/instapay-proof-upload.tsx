"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { presignCheckoutPaymentProofUploadAction, confirmCheckoutPaymentProofAction } from "@/lib/payments/actions";

/** Required InstaPay screenshot upload shown at checkout, before the order is placed. */
export function InstapayProofUpload({ onUploaded }: { onUploaded: (mediaId: number | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    onUploaded(null);

    const presign = await presignCheckoutPaymentProofUploadAction({
      filename: file.name,
      mime: file.type,
      sizeBytes: file.size,
    });
    if ("error" in presign) {
      setError(presign.error);
      setUploading(false);
      return;
    }

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
    if (!upload.ok) {
      setError("Upload failed. Please try again.");
      setUploading(false);
      return;
    }

    const confirmed = await confirmCheckoutPaymentProofAction({
      publicId: uploaded.public_id,
      format: uploaded.format,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
    });
    if ("error" in confirmed) {
      setError(confirmed.error);
      setUploading(false);
      return;
    }

    setUploadedName(file.name);
    onUploaded(confirmed.data.mediaId);
    setUploading(false);
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
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload size={16} />
        {uploading ? "Uploading…" : uploadedName ? "Replace screenshot" : "Upload payment screenshot"}
      </Button>
      {uploadedName && !error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-secondary">
          <CheckCircle2 size={14} /> {uploadedName} uploaded.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
