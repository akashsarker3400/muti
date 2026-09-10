import { getTranslations } from "next-intl/server";

import { cn } from "cn";

import type { Locale } from "@/i18n/routing";
import { formatNumber, yearsOfExperience } from "@/lib/format";
import type { SiteSettings } from "@/lib/site-settings";

const COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

/**
 * Four counters (section 5.1). Years is computed from the established year so
 * it never goes stale; a tile is hidden when its number is not available —
 * "doctors trained" stays hidden until the owner supplies the real figure.
 */
export async function StatsStrip({
  settings,
  locale,
  courseCount,
}: {
  settings: SiteSettings;
  locale: Locale;
  courseCount: number;
}) {
  const home = await getTranslations("home");

  const tiles: Array<{ value: number; label: string }> = [
    {
      value: yearsOfExperience(settings.general.establishedYear),
      label: home("statYears"),
    },
    { value: courseCount, label: home("statCourses") },
  ];

  if (settings.homepage.showDoctorsTrained && settings.homepage.doctorsTrained > 0) {
    tiles.push({
      value: settings.homepage.doctorsTrained,
      label: home("statDoctors"),
    });
  }

  if (
    settings.homepage.showPracticalsPerBatch &&
    settings.homepage.practicalsPerBatch > 0
  ) {
    tiles.push({
      value: settings.homepage.practicalsPerBatch,
      label: home("statPracticals"),
    });
  }

  if (tiles.length === 0) return null;

  return (
    <section className="border-b border-[color:var(--border)] bg-[color:var(--brand)]">
      <h2 className="sr-only">{home("statsTitle")}</h2>
      <div
        className={cn(
          "container-content grid gap-px py-0",
          // Column count follows the number of visible tiles, so hiding the
          // "doctors trained" tile never leaves an empty cell.
          COLUMNS[Math.min(tiles.length, 4)],
        )}
      >
        {tiles.map((tile) => (
          <div key={tile.label} className="px-3 py-6 text-center text-white sm:py-8">
            <p className="nums text-3xl font-bold sm:text-4xl">
              {formatNumber(tile.value, locale)}
              <span className="text-[color:var(--highlight)]">+</span>
            </p>
            <p className="mt-1 text-xs text-white/75 sm:text-sm">{tile.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
