import { describe, it, expect, vi } from "vitest";
import { brabble, scholars4dev } from "./feeds";
import {
  ayushPrograms,
  deepanshuPrograms,
  eduPerks,
  githubStudentPack,
  latestCommitSha,
  mapMonthlyTableRow,
  mapProgramTableRow,
  mapYamlProgram,
  parsePackPage,
  yashisraniPrograms,
} from "./github";
import {
  apifySources,
  hackathonStart,
  mapChallengeRow,
  mapHackathonRow,
  mapInternshalaRow,
  mapUnstopRow,
  runApifyActor,
} from "./apify";
import { getSources } from "./index";
import type { RssItem } from "../rss";

const rss = (over: Partial<RssItem>): RssItem => ({
  title: "T",
  link: "https://x.test/t",
  guid: "g",
  description: "",
  categories: [],
  pubDate: null,
  ...over,
});

describe("feed sources", () => {
  it("maps Scholars4Dev posts to scholarships with an extracted deadline", () => {
    const c = scholars4dev.mapToCandidate(rss({ description: "<p>Fully funded masters. Deadline: 4 November 2026</p>" }));
    expect(c).toMatchObject({ kind: "scholarship", costType: "scholarship", categorySlug: "learning-and-education" });
    expect(c?.deadline?.toISOString().slice(0, 10)).toBe("2026-11-04");
  });

  it("keeps only Brabble hackathons and uses pubDate as the closing date", () => {
    const item = rss({
      title: "Srijan Setu",
      categories: ["HACKATHON"],
      description: "See listing · via Devfolio - Registration closes Tue, 20 Oct 2026 17:30:00 GMT - In person: New Chandigarh",
      pubDate: "Tue, 20 Oct 2026 17:30:00 GMT",
    });
    expect(brabble.mapToCandidate(item)).toMatchObject({ kind: "program", region: "IN", provider: "Devfolio" });
    expect(brabble.mapToCandidate(item)?.deadline?.toISOString()).toBe("2026-10-20T17:30:00.000Z");
    expect(brabble.mapToCandidate({ ...item, categories: ["CASE STUDY"] })).toBeNull();
  });
});

describe("GitHub list sources", () => {
  it("maps a program table row", () => {
    const c = mapProgramTableRow(
      {
        Name: "[Outreachy](https://www.outreachy.org/)",
        Stipend: "Yes",
        Timeline: "Dec-Mar & May-Aug",
        Eligibility: "Underrepresented groups in tech",
        "Tech Stack/Focus": "Various",
      },
      "deepanshu1422",
    );
    expect(c).toMatchObject({ name: "Outreachy", costType: "stipend", url: "https://www.outreachy.org/" });
    expect(c?.description).toBe("Open-source program with a stipend. Timeline: Dec-Mar & May-Aug. Eligibility: Underrepresented groups in tech.");
  });

  it("maps month-table rows and skips month badge rows", () => {
    expect(mapMonthlyTableRow({ Name: "![January](https://img.shields.io/badge/-January-red)", "Deadline (Approx.)": "---" })).toBeNull();
    const c = mapMonthlyTableRow({
      Name: "⭐ [Linux Kernel Mentorship Program](https://wiki.linuxfoundation.org/lkmp)",
      Stipend: "Yes",
      Timeline: "[Mar - May](https://wiki.linuxfoundation.org/lkmp/lkmp_schedule)",
      "Registration Date Begin (Approximately)": "mid-Jan",
      "Deadline (Approx.)": "late-Feb",
      Type: "Mentorship Program",
    });
    expect(c).toMatchObject({ name: "Linux Kernel Mentorship Program", kind: "mentorship" });
    expect(c?.description).toContain("Deadline is usually around late-Feb.");
  });

  it("maps a YAML program with a stipend range", () => {
    const c = mapYamlProgram({
      name: "Google Summer of Code",
      url: "https://summerofcode.withgoogle.com/",
      org: "Google",
      timeline: "Contributors: Mar 16 - Mar 31",
      stipend: { min: 1500, max: 6600, currency: "USD" },
      tags: ["paid", "beginner-friendly"],
    });
    expect(c).toMatchObject({ amount: "$1,500–6,600", provider: "Google", costType: "stipend", kind: "program" });
    expect(c?.tags).toContain("Beginner Friendly");
    expect(mapYamlProgram({ name: "No URL" })).toBeNull();
  });

  it("parses GitHub Student Pack partner cards", () => {
    const html = `<div class="pack-offer-card border rounded-2 p-3" >
      <h3 id="namecheap" class="sr-only">Namecheap</h3>
      <h4 class="f5">About Namecheap</h4>
      <p class="mb-3">Affordable registration, hosting, and domain management</p>
      <h5 class="f5 mb-1">Offer #1</h5>
      <p style="margin-bottom: 12px;">1 year domain name registration on the .me TLD.</p>
    </div>`;
    const cards = parsePackPage(html);
    expect(cards).toEqual([
      {
        id: "namecheap",
        name: "Namecheap",
        about: "Affordable registration, hosting, and domain management",
        offers: ["1 year domain name registration on the .me TLD."],
      },
    ]);
    expect(githubStudentPack.mapToCandidate(cards[0])).toMatchObject({
      url: "https://education.github.com/pack#namecheap",
      tagline: "1 year domain name registration on the .me TLD.",
    });
    expect(githubStudentPack.mapToCandidate({ id: "empty", name: "", about: "", offers: [] })).toBeNull();
  });

  it("fetches commit SHAs via latestCommitSha and maps eduPerks sections", async () => {
    const okFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ sha: "abc1234" }],
    });
    expect(await latestCommitSha({ repo: "o/r", branch: "main", path: "README.md" }, okFetch as unknown as typeof fetch)).toBe(
      "abc1234",
    );

    const badFetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    expect(await latestCommitSha({ repo: "o/r", branch: "main", path: "README.md" }, badFetch as unknown as typeof fetch)).toBeNull();

    const throwFetch = vi.fn().mockRejectedValue(new Error("timeout"));
    expect(await latestCommitSha({ repo: "o/r", branch: "main", path: "README.md" }, throwFetch as unknown as typeof fetch)).toBeNull();

    expect(
      eduPerks.mapToCandidate({
        text: "Spotify Student",
        url: "https://spotify.com/student",
        note: "50% off Premium",
        section: "Entertainment & Music",
      }),
    ).toMatchObject({
      categorySlug: "media-and-entertainment",
      kind: "perk",
    });

    expect(
      deepanshuPrograms.mapToCandidate({
        Name: "[GSoC](https://gsoc.test)",
        Stipend: "No",
        Type: "Fellowship",
        "Tech Stack/Focus": "Rust",
      }),
    ).toMatchObject({
      kind: "fellowship",
      costType: "free",
    });

    expect(
      ayushPrograms.mapToCandidate({
        Name: "[LFX](https://lfx.test)",
        Type: "Internship",
      }),
    ).toMatchObject({
      kind: "internship",
    });

    expect(
      yashisraniPrograms.mapToCandidate({
        name: "MLH Fellowship",
        url: "https://mlh.io",
        stipend: { min: 5000, max: 5000, currency: "INR" },
      }),
    ).toMatchObject({
      kind: "fellowship",
      amount: "₹5,000",
    });
  });
});

describe("Apify sources", () => {
  it("runs Apify actors via runApifyActor and throws on non-2xx responses", async () => {
    const okFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ title: "Item 1" }],
    });
    const items = await runApifyActor<{ title: string }>("owner/actor", { maxItems: 5 }, "tok", okFetch as unknown as typeof fetch);
    expect(items).toEqual([{ title: "Item 1" }]);
    expect(okFetch.mock.calls[0][0]).toContain("owner~actor/run-sync-get-dataset-items");

    const errFetch = vi.fn().mockResolvedValue({ ok: false, status: 502 });
    await expect(runApifyActor("owner/actor", {}, "tok", errFetch as unknown as typeof fetch)).rejects.toThrow(
      "Apify owner/actor returned HTTP 502",
    );
  });
  it("is disabled without APIFY_TOKEN", () => {
    expect(apifySources(undefined)).toEqual([]);
    expect(apifySources("t")).toHaveLength(4);
    const names = (env: Record<string, string>) => getSources(env as unknown as NodeJS.ProcessEnv).map((s) => s.name);
    expect(names({}).some((n) => n.startsWith("apify:"))).toBe(false);
    expect(names({ APIFY_TOKEN: "t" }).filter((n) => n.startsWith("apify:"))).toHaveLength(4);
  });

  it("maps scholarship rows and ignores other challenge categories", () => {
    const row = {
      title: "Global Leaders Scholarship",
      description: "Covers tuition.",
      deadline: "2026-12-01",
      awards: "USD 1000",
      challengeLink: "https://g.test/s",
      category: "Scholarships",
    };
    expect(mapChallengeRow(row)).toMatchObject({ kind: "scholarship", amount: "USD 1000" });
    expect(mapChallengeRow({ ...row, category: "Poetry Competition" })).toBeNull();
  });

  it("maps hackathons using the start date as the deadline", () => {
    expect(hackathonStart("May 10 - 12, 2026")?.toISOString().slice(0, 10)).toBe("2026-05-10");
    expect(hackathonStart("Apr 28 - May 3, 2026")?.toISOString().slice(0, 10)).toBe("2026-04-28");
    expect(mapHackathonRow({ name: "H", url: "https://h.test", source: "devpost", endDate: "May 10 - 12, 2026", status: "open" })).toMatchObject({
      kind: "program",
      provider: "Devpost",
    });
    expect(mapHackathonRow({ name: "H", url: "https://h.test", status: "ended" })).toBeNull();
  });

  it("keeps only Unstop scholarships and hackathons", () => {
    const row = { id: 1, title: "SIH", opportunityType: "hackathons", url: "https://unstop.com/x", status: "live", deadline: "2026-09-15T18:30:00+05:30" };
    expect(mapUnstopRow(row)).toMatchObject({ kind: "program", region: "IN" });
    expect(mapUnstopRow({ ...row, opportunityType: "jobs" })).toBeNull();
  });

  it("keeps only flagship Internshala internships", () => {
    const row = { jobKey: "1", listingType: "internship", title: "SDE Intern", company: "Microsoft India", canonicalUrl: "https://internshala.com/i/1", stipendText: "₹ 80,000 /month" };
    expect(mapInternshalaRow(row)).toMatchObject({ kind: "internship", amount: "₹ 80,000 /month" });
    expect(mapInternshalaRow({ ...row, company: "Zytexa Technology Llp" })).toBeNull();
  });
});
