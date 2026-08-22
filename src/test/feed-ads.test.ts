import { describe, it, expect } from "vitest";
import { FEED_AD_INTERVAL, resolveFeedAdSlot } from "@/lib/feed-ads";

type Rendered = "post" | "platform-ad" | "google-ad";

/** Simulates the feed render output for a given post count / ad availability. */
function renderFeed(
  postCount: number,
  platformAdCount: number,
  googleAdsActive: boolean,
): Rendered[] {
  const out: Rendered[] = [];
  for (let i = 0; i < postCount; i++) {
    out.push("post");
    const r = resolveFeedAdSlot(i, { platformAdCount, googleAdsActive });
    if (r.platformAdIndex !== null) out.push("platform-ad");
    if (r.showGoogleAd) out.push("google-ad");
  }
  return out;
}

const isAd = (x: Rendered) => x !== "post";

const scenarios = [
  { name: "platform ads only", platformAdCount: 3, googleAdsActive: false },
  { name: "google ads only", platformAdCount: 0, googleAdsActive: true },
  { name: "both sources", platformAdCount: 2, googleAdsActive: true },
  { name: "single platform ad + google", platformAdCount: 1, googleAdsActive: true },
];

describe("Socio feed ad injection", () => {
  it("uses an interval of 5", () => {
    expect(FEED_AD_INTERVAL).toBe(5);
  });

  it.each(scenarios)("$name: one ad after every 5 posts", ({ platformAdCount, googleAdsActive }) => {
    const postCount = 37;
    const feed = renderFeed(postCount, platformAdCount, googleAdsActive);

    // Total ads == number of completed groups of 5 posts.
    expect(feed.filter(isAd).length).toBe(Math.floor(postCount / 5));

    // Every ad sits immediately after the 5th, 10th, 15th... post.
    let postsSeen = 0;
    for (const item of feed) {
      if (item === "post") postsSeen++;
      else expect(postsSeen % 5).toBe(0);
    }
  });

  it.each(scenarios)("$name: never renders two ads consecutively", ({ platformAdCount, googleAdsActive }) => {
    const feed = renderFeed(50, platformAdCount, googleAdsActive);
    for (let i = 1; i < feed.length; i++) {
      expect(isAd(feed[i]) && isAd(feed[i - 1])).toBe(false);
    }
  });

  it("never selects a platform ad and a google ad at the same position", () => {
    for (let i = 0; i < 60; i++) {
      const r = resolveFeedAdSlot(i, { platformAdCount: 2, googleAdsActive: true });
      expect(r.platformAdIndex !== null && r.showGoogleAd).toBe(false);
    }
  });

  it("renders no ads when no source is available", () => {
    const feed = renderFeed(30, 0, false);
    expect(feed.filter(isAd)).toHaveLength(0);
  });

  it("renders no ad before the 5th post", () => {
    for (let i = 0; i < 4; i++) {
      expect(resolveFeedAdSlot(i, { platformAdCount: 3, googleAdsActive: true }).isAdSlot).toBe(false);
    }
    expect(resolveFeedAdSlot(4, { platformAdCount: 3, googleAdsActive: true }).isAdSlot).toBe(true);
  });

  it("cycles through available platform ads", () => {
    const picks = [0, 5, 10, 15, 20, 25]
      .map((i) => resolveFeedAdSlot(i, { platformAdCount: 3, googleAdsActive: false }))
      .filter((r) => r.isAdSlot)
      .map((r) => r.platformAdIndex);
    expect(picks).toEqual([]); // indices 0,5,10.. are not ad slots (ad follows index 4,9,...)

    const realPicks = [4, 9, 14, 19]
      .map((i) => resolveFeedAdSlot(i, { platformAdCount: 3, googleAdsActive: false }).platformAdIndex);
    expect(realPicks).toEqual([0, 1, 2, 0]);
  });
});
