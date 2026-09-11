import { ImageResponse } from "next/og";

import { prisma } from "@/lib/prisma";
import { groupDigits } from "@/lib/format";
import { getSiteSettings } from "@/lib/site-settings";
import { defaultSiteSettings } from "@/lib/site-settings-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open Graph image (section 10): logo mark, course name, fee and the
 * "Govt. Code 57125" line. `?health=1` renders the health-service card
 * (addendum 4.1): the commitment tagline, the logo and a FREE badge.
 *
 * Latin-only by design. Satori does not shape Bangla (vowel signs and
 * conjuncts come out in the wrong order even with a Bangla font embedded),
 * so the generated card uses the approved English copy; the office can
 * upload a hand-made Bangla card as `health.ogImage` instead.
 */

function healthCard(tagline: string) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        fontFamily: "sans-serif",
        background: "linear-gradient(135deg, #E8F5EC 0%, #F4F6FB 60%, #FFFFFF 100%)",
        borderTop: "16px solid #0B8043",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
            }}
          >
            <div
              style={{
                display: "flex",
                width: "22px",
                height: "22px",
                borderRadius: "999px",
                background: "#D62828",
              }}
            />
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
        <span
          style={{
            display: "flex",
            padding: "12px 28px",
            borderRadius: "999px",
            background: "#D62828",
            color: "#FFFFFF",
            fontSize: "30px",
            fontWeight: 700,
          }}
        >
          FREE
        </span>
      </div>

      <span
        style={{
          fontSize: tagline.length > 70 ? "48px" : "58px",
          fontWeight: 700,
          color: "#1B2A6B",
          lineHeight: 1.35,
        }}
      >
        “{tagline}”
      </span>

      <span style={{ fontSize: "26px", color: "#5B6472" }}>
        Free ultrasonogram and doctor consultation for expectant mothers and children
      </span>
    </div>,
    { width: 1200, height: 630 },
  );
}
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("course");

  if (searchParams.get("health")) {
    const settings = await getSiteSettings();
    return healthCard(
      settings.health.taglineEn || defaultSiteSettings.health.taglineEn,
    );
  }

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
          }}
        >
          <div
            style={{
              display: "flex",
              width: "22px",
              height: "22px",
              borderRadius: "999px",
              background: "#D62828",
            }}
          />
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
