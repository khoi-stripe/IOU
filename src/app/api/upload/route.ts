import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { getAuthenticatedUserId } from "@/lib/session";
import sharp from "sharp";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 1200; // Max width or height
const WEBP_QUALITY = 80;

// Helper to check if file is an image
function isImageFile(file: File): boolean {
  // Check MIME type if available
  if (file.type && file.type.startsWith("image/")) {
    return true;
  }

  // Fallback: check extension (iOS Safari sometimes has empty file.type)
  const ext = file.name.split(".").pop()?.toLowerCase();
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "heic",
    "heif",
    "bmp",
    "tiff",
  ];
  return imageExtensions.includes(ext || "");
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Validate file type (more permissive for iOS Safari)
    if (!isImageFile(file)) {
      return NextResponse.json(
        { error: "Only images are allowed" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Optimize image: resize and convert to WebP
    const optimizedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true, // Don't upscale small images
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    // Generate safe filename with .webp extension
    const safeFilename = `${Math.random().toString(36).substring(2, 8)}.webp`;

    // Upload optimized WebP to R2
    const url = await uploadToR2(optimizedBuffer, safeFilename, "image/webp");

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);

    // Return generic error message (don't expose internal details)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
