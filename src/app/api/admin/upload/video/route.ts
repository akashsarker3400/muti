import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { currentAdmin, logActivity } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS } from "@/lib/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const run = promisify(execFile);

/**
 * Self-hosted video upload (homepage additions, 2b): MP4 only, at most 60 MB
 * and 90 seconds. ffprobe checks the container, codecs and duration; ffmpeg
 * grabs a poster frame one second in, which sharp turns into webp. Both the
 * video and the poster get a Media row so the admin can list them.
 *
 * ffmpeg is installed in the Docker image; when it is missing here the
 * upload is refused with a message that says what to install.
 */

async function probe(file: string): Promise<{
  duration: number;
  width: number;
  height: number;
  video: string;
  audio: string | null;
}> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    file,
  ]);
  const info = JSON.parse(stdout) as {
    format?: { duration?: string; format_name?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
    }>;
  };
  const video = info.streams?.find((s) => s.codec_type === "video");
  const audio = info.streams?.find((s) => s.codec_type === "audio");
  if (!video || !info.format?.format_name?.includes("mp4")) {
    throw new Error("not-mp4");
  }
  return {
    duration: Number(info.format.duration ?? 0),
    width: video.width ?? 0,
    height: video.height ?? 0,
    video: video.codec_name ?? "",
    audio: audio?.codec_name ?? null,
  };
}

export async function POST(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > VIDEO_MAX_BYTES) {
    return NextResponse.json(
      { error: "The video is larger than 60 MB" },
      { status: 413 },
    );
  }
  if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
    return NextResponse.json(
      { error: "Only MP4 (H.264/AAC) videos are accepted" },
      { status: 415 },
    );
  }

  try {
    await run("ffprobe", ["-version"]);
  } catch {
    return NextResponse.json(
      {
        error:
          "ffmpeg is not installed on the server. Install it (apk add ffmpeg / brew install ffmpeg) or use a YouTube link instead.",
      },
      { status: 500 },
    );
  }

  const work = await mkdtemp(path.join(tmpdir(), "muti-video-"));
  try {
    const input = path.join(work, "input.mp4");
    await writeFile(input, Buffer.from(await file.arrayBuffer()));

    let meta;
    try {
      meta = await probe(input);
    } catch {
      return NextResponse.json(
        { error: "The file is not a valid MP4 video" },
        { status: 415 },
      );
    }
    if (meta.video !== "h264") {
      return NextResponse.json(
        { error: `The video codec must be H.264 (found ${meta.video || "unknown"})` },
        { status: 415 },
      );
    }
    if (meta.audio && meta.audio !== "aac") {
      return NextResponse.json(
        { error: `The audio codec must be AAC (found ${meta.audio})` },
        { status: 415 },
      );
    }
    if (meta.duration > VIDEO_MAX_SECONDS + 0.5) {
      return NextResponse.json(
        {
          error: `The video is ${Math.round(meta.duration)} seconds long; the limit is 90 seconds`,
        },
        { status: 413 },
      );
    }

    // Poster: the frame at one second (or the first frame of a shorter clip).
    const posterPath = path.join(work, "poster.png");
    await run("ffmpeg", [
      "-v",
      "error",
      "-ss",
      meta.duration > 1.5 ? "1" : "0",
      "-i",
      input,
      "-frames:v",
      "1",
      "-y",
      posterPath,
    ]);
    const poster = await sharp(await readFile(posterPath))
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const now = new Date();
    const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const id = randomBytes(12).toString("hex");
    const videoKey = `${folder}/${id}.mp4`;
    const posterKey = `${folder}/${id}p.webp`;
    // The upload buffer is already on disk; stream it back without holding
    // two copies in memory.
    await storage().put(videoKey, await readFile(input), "video/mp4");
    await storage().put(posterKey, poster, "image/webp");

    const [videoRow, posterRow] = await prisma.$transaction([
      prisma.media.create({
        data: {
          key: videoKey,
          url: `/uploads/${videoKey}`,
          kind: "VIDEO",
          tag: "video",
          mimeType: "video/mp4",
          size: file.size,
          width: meta.width,
          height: meta.height,
          duration: Math.round(meta.duration),
        },
      }),
      prisma.media.create({
        data: {
          key: posterKey,
          url: `/uploads/${posterKey}`,
          kind: "IMAGE",
          tag: "poster",
          mimeType: "image/webp",
          size: poster.byteLength,
        },
      }),
    ]);
    await logActivity(admin.id, "upload", "Media", videoKey);

    return NextResponse.json({
      fileId: videoRow.id,
      url: videoRow.url,
      posterId: posterRow.id,
      posterUrl: posterRow.url,
      duration: videoRow.duration,
      width: meta.width,
      height: meta.height,
      size: file.size,
    });
  } catch (error) {
    console.error("Video upload failed", error);
    return NextResponse.json({ error: "Could not process the video" }, { status: 500 });
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
