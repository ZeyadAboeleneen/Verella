/**
 * Local background removal (no external service): BiRefNet-lite (MIT) run by
 * Transformers.js on onnxruntime-node. The model (~200 MB) is downloaded from
 * Hugging Face on first use and cached on disk; after that it works offline.
 * Kept free of "server-only" so offline scripts can use it too.
 */
import path from "node:path";
import sharp from "sharp";

const MODEL = "onnx-community/BiRefNet_lite-ONNX";

type Segmenter = (input: unknown) => Promise<unknown>;
let segmenterPromise: Promise<Segmenter> | null = null;

async function getSegmenter(): Promise<Segmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Outside node_modules, so reinstalling packages never wipes the downloaded model.
      env.cacheDir = process.env.TRANSFORMERS_CACHE_DIR || path.join(process.cwd(), ".cache", "transformers");
      return (await pipeline("background-removal", MODEL, { dtype: "fp32" })) as unknown as Segmenter;
    })().catch((err) => {
      segmenterPromise = null; // let the next call retry (e.g. after a network blip)
      throw err;
    });
  }
  return segmenterPromise;
}

/** PNG of the product with a transparent background. */
export async function removeBackground(image: Buffer): Promise<Buffer> {
  const segment = await getSegmenter();
  const { RawImage } = await import("@huggingface/transformers");
  // Normalise to RGB PNG so every input format (webp, jpg, png with alpha) behaves the same.
  const png = await sharp(image).rotate().flatten({ background: "#ffffff" }).png().toBuffer();
  const raw = await RawImage.fromBlob(new Blob([new Uint8Array(png)], { type: "image/png" }));
  const out = (await segment(raw)) as unknown;
  const result = (Array.isArray(out) ? out[0] : out) as { data: Uint8ClampedArray | Uint8Array; width: number; height: number; channels: number };
  return sharp(Buffer.from(result.data), { raw: { width: result.width, height: result.height, channels: result.channels as 1 | 2 | 3 | 4 } })
    .png()
    .toBuffer();
}
