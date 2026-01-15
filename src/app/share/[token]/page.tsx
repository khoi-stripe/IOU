import { Metadata } from "next";
import { getIOUByShareToken, enrichIOU, getUserById } from "@/lib/db";
import SharePageClient from "./SharePageClient";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const iou = await getIOUByShareToken(token);

  if (!iou) {
    return {
      title: "IOU Not Found",
      description: "This IOU could not be found.",
    };
  }

  const enrichedIOU = enrichIOU(iou);
  const fromUser = enrichedIOU.from_user || (iou.from_user_id ? await getUserById(iou.from_user_id) : null);
  const fromName = fromUser?.display_name || "Someone";
  const description = iou.description || "a favor";

  const title = `👁️🅾️🐑 IOU from ${fromName}`;
  const fullDescription = description;

  return {
    title,
    description: fullDescription,
    openGraph: {
      title,
      description: fullDescription,
      siteName: "👁️🅾️🐑",
      type: "website",
      ...(iou.photo_url && {
        images: [
          {
            url: iou.photo_url,
            width: 1200,
            height: 630,
            alt: "IOU photo",
          },
        ],
      }),
    },
    twitter: {
      card: iou.photo_url ? "summary_large_image" : "summary",
      title,
      description: fullDescription,
      ...(iou.photo_url && { images: [iou.photo_url] }),
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  return <SharePageClient token={token} />;
}
