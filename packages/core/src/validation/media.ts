import { z } from "zod";

const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export const presignUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.enum(ACCEPTED_IMAGE_MIME),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(15 * 1024 * 1024, "File too large (max 15MB)"),
  folder: z.string().max(100).optional(),
  isPrivate: z.boolean().default(false),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
