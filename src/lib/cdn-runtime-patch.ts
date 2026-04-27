/**
 * Global runtime safety net for image / video src attributes.
 *
 * Patches HTMLImageElement / HTMLSourceElement / HTMLVideoElement so that any
 * `element.src = "https://f005.backblazeb2.com/..."` (or attribute write) is
 * transparently rewritten to the Cloudflare CDN host before the browser fires
 * the network request.
 *
 * This complements:
 *   - The DB-level migration that rewrote stored URLs.
 *   - The b2-presigned-upload edge function that returns CDN URLs for new uploads.
 *   - <SmartImage>/resolveB2Url for private-bucket signing.
 *
 * Idempotent — safe to call multiple times.
 */

import { toCdnUrl } from "./cdn-url";

let installed = false;

function patchSrcProperty(proto: any, attr: "src" | "poster" = "src") {
  const desc = Object.getOwnPropertyDescriptor(proto, attr);
  if (!desc?.set || !desc.get) return;
  Object.defineProperty(proto, attr, {
    configurable: true,
    enumerable: desc.enumerable,
    get(this: HTMLElement) {
      return desc.get!.call(this);
    },
    set(this: HTMLElement, value: string) {
      try {
        const rewritten = toCdnUrl(value);
        desc.set!.call(this, rewritten || value);
      } catch {
        desc.set!.call(this, value);
      }
    },
  });
}

function patchSetAttribute() {
  const proto = Element.prototype as any;
  const original = proto.setAttribute;
  if (original.__cdnPatched) return;
  proto.setAttribute = function patchedSetAttribute(name: string, value: string) {
    if (
      typeof value === "string" &&
      (name === "src" || name === "poster" || name === "srcset") &&
      (this instanceof HTMLImageElement ||
        this instanceof HTMLSourceElement ||
        this instanceof HTMLVideoElement ||
        this instanceof HTMLAudioElement)
    ) {
      try {
        if (name === "srcset") {
          // srcset is a comma-separated "url descriptor" list
          const rewritten = value
            .split(",")
            .map((part) => {
              const trimmed = part.trim();
              const spaceIdx = trimmed.search(/\s/);
              if (spaceIdx === -1) return toCdnUrl(trimmed);
              const url = trimmed.slice(0, spaceIdx);
              const descriptor = trimmed.slice(spaceIdx);
              return `${toCdnUrl(url)}${descriptor}`;
            })
            .join(", ");
          return original.call(this, name, rewritten);
        }
        return original.call(this, name, toCdnUrl(value) || value);
      } catch {
        return original.call(this, name, value);
      }
    }
    return original.call(this, name, value);
  };
  proto.setAttribute.__cdnPatched = true;
}

export function installCdnImagePatch() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  try { patchSrcProperty(HTMLImageElement.prototype, "src"); } catch { /* ignore */ }
  try { patchSrcProperty(HTMLSourceElement.prototype, "src"); } catch { /* ignore */ }
  try { patchSrcProperty(HTMLVideoElement.prototype, "src"); } catch { /* ignore */ }
  try { patchSrcProperty(HTMLVideoElement.prototype, "poster"); } catch { /* ignore */ }
  try { patchSrcProperty(HTMLAudioElement.prototype, "src"); } catch { /* ignore */ }
  try { patchSetAttribute(); } catch { /* ignore */ }
}
