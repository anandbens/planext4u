import { describe, expect, it } from "vitest";
import { toCdnUrl } from "./cdn-url";

describe("toCdnUrl", () => {
  it("keeps the current .com CDN URL unchanged", () => {
    expect(toCdnUrl("https://cdn.planext4u.com/media-library/image.webp"))
      .toBe("https://cdn.planext4u.com/media-library/image.webp");
  });

  it("rewrites the retired .net CDN URL", () => {
    expect(toCdnUrl("https://cdn.planext4u.net/media-library/image.webp"))
      .toBe("https://cdn.planext4u.com/media-library/image.webp");
  });

  it("rewrites direct Backblaze URLs", () => {
    expect(toCdnUrl("https://f005.backblazeb2.com/file/planext4u/Categories/image.jpg"))
      .toBe("https://cdn.planext4u.com/Categories/image.jpg");
  });
});
