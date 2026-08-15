# 07 — Socio (Social Network)

Owner: `socio-svc`. Collaborators: `realtime-gateway` (Node), `media-workers` (Go), `notification-workers`, `trust-safety-svc`, `catalog-svc` (shopping tags), `identity-svc`.

Socio is an in-platform social layer: feed posts, short-form reels, 24-hour stories, follows, direct messages, and 1-to-1 audio/video calling — with commerce woven in through shoppable tags.

## 1. Identity in Socio

Socio uses the **same account identity** as the rest of the platform; there is no separate social user table of record. A `socio_profile` extends the account with handle, display name, bio, avatar, cover, links, category, verification badge, counters (followers, following, posts) and privacy flags. All social references key on the platform account id — mixing in module-local ids is a defect class to avoid.

## 2. Graph

- **Follow** — asymmetric. Following a public profile is immediate; following a private profile creates a **follow request** the owner accepts or rejects.
- **Friends / mutuals** — a derived relation where both accounts follow each other. Direct messaging is restricted to mutual followers (see §7).
- **Block** — bidirectional invisibility: blocked accounts cannot view, follow, message, call, mention or interact, and existing relations are severed.
- **Mute** — one-way suppression from feed and stories without unfollowing.
- **Close friends** — a per-account list used for restricted story audiences.
- **Contact discovery** — the client uploads salted hashes of phone numbers in E.164 form; the server matches against hashed stored numbers and returns only accounts that permit discovery. Raw contact numbers are never persisted.

## 3. Content types

| Type | Media | Lifetime | Surfaces |
|---|---|---|---|
| Post | 1–10 images or one video | Permanent | Feed, profile grid, hashtag, location |
| Reel | Vertical video | Permanent | Reels tab, feed, profile, audio page |
| Story | Image or ≤15 s video | 24 h, then archived | Story tray, profile ring, highlights |

Common attributes: caption with rich text, mentions, hashtags, location tag, audience (`public`, `followers`, `close_friends`), comment permission, `is_edited` flag, and a moderation state.

### 3.1 Authoring and tagging

- **Shopping stickers / product tags** attach catalogue products, services, vendors, properties or classified ads to any content type; tapping opens the linked entity. Tag search spans those tables in one cross-table query.
- **Mentions** resolve to accounts and notify the mentioned party subject to their settings.
- **Hashtags** are normalised (lowercased, stripped) and indexed for hashtag pages and trending.
- **Music/audio** attribution for reels links to an audio page listing all reels using it.

### 3.2 Editing

Owners may edit their own posts, reels and stories. Edits update the content and set `is_edited` via a database trigger — the flag is never client-supplied — and the UI displays an "Edited" label. Edit history is retained for moderation. Editing does not reset engagement or re-notify.

### 3.3 Media pipeline

All uploads go through `media-workers`: images to WebP (quality 70, max 2048 px), video transcoded to H.264 with an adaptive ladder, audio normalised to 16 kHz for voice notes, thumbnails generated server-side, and duration/dimension metadata extracted. Story thumbnails are produced with a short seek offset so the frame is not black. Every asset is virus-scanned and passed through automated content classification before it becomes visible.

## 4. Feed

- Composition: content from followed accounts, plus a configurable proportion of recommended content, ranked by recency, affinity and engagement velocity.
- **Pagination is 20 items per page**, cursor-based on `(ranked_score, id)` — never offset pagination.
- **Advertisement injection**: a banner ad slot is inserted after every 4 organic items, sourced from the ads placement service; ads support image and video creatives with separate desktop and mobile assets, and must degrade gracefully when creative fields are absent.
- Feed reads are served from a cache with a short TTL; writes fan out through events.

## 5. Engagement

Likes (posts, reels, comments, stories), saves/collections, shares (internal repost and external link), views (unique per account per 24 h for reels and stories), and comments.

**Comments** support nested replies to a configurable depth, mentions, likes, pinning by the content owner, sorting by top or newest, and deletion by the comment author, the content owner, or a moderator. Moderator deletion is global and recorded in the audit log.

## 6. Stories

- 24-hour expiry enforced by an expiry timestamp at read time and a reaper job for cleanup and archival.
- Viewer list visible to the owner; reactions and replies flow into DMs.
- **Highlights** persist selected stories on the profile beyond expiry.
- **Reposting** another account's post into a story, with attribution and a link back, is supported where the original author permits it.
- Audience control per story: public, followers, or close friends.

## 7. Direct messaging

- **Eligibility: DMs are restricted to mutual followers.** A non-mutual may send a single message request, which lands in a request inbox and cannot be followed by further messages until accepted.
- Conversations may be 1:1 or group. Participation is authorised server-side by a participant-check helper; a client may never assert its own membership.
- Message types: text, image, video, voice note (16 kHz), content share (post/reel/story), product share, and system events.
- Features: typing indicators, read receipts (respecting the privacy setting), reactions, reply-to, delete-for-me and delete-for-everyone within a window, and search within a conversation.
- Delivery is through the realtime gateway over WebSocket, with persistence in `socio-svc` and push fallback via notification workers when the recipient is offline.

## 8. Calling

1-to-1 audio and video calling over **WebRTC**, with signalling (offer, answer, ICE candidates, hangup) relayed through the realtime gateway. STUN plus a managed TURN service is required for NAT traversal. Call records capture participants, direction, start/answer/end timestamps, duration and end reason. Missed calls notify. Eligibility mirrors DM eligibility. Media never traverses application servers.

## 9. Privacy and moderation

- **Private account** toggle: content, followers and following are visible only to accepted followers; discovery still surfaces the profile shell.
- Granular controls: who can comment, who can mention, who can message, who can see stories, whether the account appears in contact discovery, read-receipt visibility, and online-status visibility.
- **Reporting** on posts, reels, stories, comments, messages and accounts with reason taxonomy; reports enter the `trust-safety-svc` queue.
- **Automated screening** on upload: NSFW and violence classification, plus text toxicity on captions and comments; content above a threshold is held for review rather than published.
- Moderator actions: hide, delete globally, restrict account, suspend, ban — each written to the audit log with actor, reason and target.
- Appeals workflow for enforced accounts.

## 10. Notifications

Follows, follow requests and acceptances, likes, comments, replies, mentions, tags, DMs, message requests, calls, story reactions, and content-moderation outcomes. Aggregated where noisy ("X and 12 others liked your reel"), respecting per-type user preferences and quiet hours.

## 11. Deep links and navigation

Path-based deep links to posts, reels, stories, profiles, hashtags and audio pages using platform account UUIDs and content ids, resolvable from web and from the mobile apps via universal links / app links.

## 12. Acceptance criteria

1. A private account's content is unreachable by any non-approved follower through feed, profile, hashtag, search or direct URL.
2. A blocked account cannot observe or reach the blocker by any surface.
3. DM creation between non-mutuals is rejected server-side and limited to one pending request.
4. Feed pages return exactly 20 items with a stable cursor and no duplicates or gaps across pages.
5. An ad appears after every 4th organic item and never breaks the feed when creative fields are missing.
6. A story becomes unreadable at exactly 24 h from publication, including via a direct link.
7. Editing a post sets `is_edited` through the trigger even if the client omits it.
