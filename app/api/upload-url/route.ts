import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getUser } from "@/lib/supabase/server";

const BUCKET_NAME = process.env.AMPLIFY_BUCKET_NAME || "amplify-artfolio-evelynwu-artfoliomediabucket4db57-qefzuvnht3lt";
const REGION = process.env.AWS_REGION || "us-east-1";

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated via Supabase
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 }
      );
    }

    // Validate content type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type. Must be JPEG, PNG, GIF, or WebP" },
        { status: 400 }
      );
    }

    // Generate unique file path using user ID
    const fileExt = fileName.split(".").pop();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const key = `media/${user.id}/${uniqueName}`;

    // Generate pre-signed URL (valid for 5 minutes)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Generate the public URL for the uploaded file
    const publicUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
