import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

// Helper to determine content type from filename or file type
function getContentType(file: File): string {
  // If file.type is set and valid, use it
  if (file.type && file.type.startsWith("image/")) {
    return file.type;
  }
  
  // Fallback: determine from extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };
  
  return mimeTypes[ext || ""] || "image/jpeg";
}

// Helper to check if file is an image
function isImageFile(file: File): boolean {
  // Check MIME type if available
  if (file.type && file.type.startsWith("image/")) {
    return true;
  }
  
  // Fallback: check extension (iOS Safari sometimes has empty file.type)
  const ext = file.name.split(".").pop()?.toLowerCase();
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "tiff"];
  return imageExtensions.includes(ext || "");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    // Generate safe filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeFilename = `${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Get content type (handles iOS Safari's empty file.type)
    const contentType = getContentType(file);

    // Upload to R2
    const url = await uploadToR2(buffer, safeFilename, contentType);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
