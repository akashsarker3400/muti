import { ImageResponse } from "next/og";

import { prisma } from "@/lib/prisma";
import { groupDigits } from "@/lib/format";
import { defaultSiteSettings } from "@/lib/site-settings-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open Graph image (section 10): logo mark, course name, fee and the
 * "Govt. Code 57125" line.
 *
 * Deliberately Latin-only. Satori needs an embedded font for Bangla glyphs and
 * we have no licensed font file in the repo yet, so the card uses the English
 * course name — which is what course names are in both languages anyway.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("course");

  let heading = defaultSiteSettings.general.nameEn;
  let subheading = defaultSiteSettings.general.taglineEn;
  let fee: string | null = null;

  if (slug) {
    const course = await prisma.course
      .findFirst({ where: { slug, published: true } })
      .catch(() => null);

    if (course) {
      heading = course.nameEn;
      subheading = course.fullNameEn;
      fee = course.courseFee > 0 ? `Tk ${groupDigits(course.courseFee)}` : null;
    }
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#FFFFFF",
        padding: "64px",
        fontFamily: "sans-serif",
        borderTop: "16px solid #1B2A6B",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div
          style={{
            display: "flex",
            width: "72px",
            height: "72px",
            borderRadius: "999px",
            border: "6px solid #1B2A6B",
            alignItems: "center",
            justifyContent: "center",
            color: "#D62828",
            fontSize: "34px",
            fontWeight: 700,
          }}
        >
          ★
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "34px", fontWeight: 700, color: "#1B2A6B" }}>
            MUTI
          </span>
          <span style={{ fontSize: "18px", color: "#5B6472" }}>
            Mymensingh Ultrasound Training Institute
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span
          style={{
            fontSize: heading.length > 24 ? "56px" : "72px",
            fontWeight: 700,
            color: "#1B2A6B",
            lineHeight: 1.1,
          }}
        >
          {heading}
        </span>
        <span style={{ fontSize: "30px", color: "#5B6472", lineHeight: 1.3 }}>
          {subheading}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            display: "flex",
            padding: "12px 24px",
            borderRadius: "999px",
            background: "#1B2A6B",
            color: "#FFFFFF",
            fontSize: "24px",
            fontWeight: 600,
          }}
        >
          Govt. Code 57125
        </span>

        {fee && (
          <span
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: "999px",
              background: "#D62828",
              color: "#FFFFFF",
              fontSize: "26px",
              fontWeight: 700,
            }}
          >
            {fee}
          </span>
        )}
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
