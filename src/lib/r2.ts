import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Optional: custom domain or public bucket URL

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `uploads/${Date.now()}-${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  // Return the public URL
  // If you have a custom domain or public bucket, use R2_PUBLIC_URL
  // Otherwise, you'll need to set up a public bucket or use presigned URLs
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }

  // Default: assume public bucket access via R2.dev subdomain
  return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`;
}

