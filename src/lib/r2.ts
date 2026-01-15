import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Optional: custom domain or public bucket URL

function validateR2Config() {
  const missing: string[] = [];
  if (!R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
  if (!R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
  if (!R2_BUCKET_NAME) missing.push("R2_BUCKET_NAME");
  
  if (missing.length > 0) {
    throw new Error(`Missing R2 environment variables: ${missing.join(", ")}`);
  }
}

function getS3Client() {
  validateR2Config();
  
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadToR2(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const s3Client = getS3Client();
  const key = `uploads/${Date.now()}-${filename}`;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME!,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );
  } catch (error) {
    // Add more context to credential errors
    if (error instanceof Error && error.message.includes("credential")) {
      throw new Error(
        `R2 credential error: ${error.message}. ` +
        `Check that R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are correct and the API token is active in Cloudflare.`
      );
    }
    throw error;
  }

  // Return the public URL
  // If you have a custom domain or public bucket, use R2_PUBLIC_URL
  // Otherwise, you'll need to set up a public bucket or use presigned URLs
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }

  // Default: assume public bucket access via R2.dev subdomain
  return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`;
}


