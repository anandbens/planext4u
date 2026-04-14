/**
 * Social content moderator check.
 * Authorized moderator auth UIDs who can delete any post/story/reel.
 */
const SOCIAL_MODERATOR_UIDS = [
  'e14cbddc-7673-4905-9666-03fea2aa2fa0', // ANAND BENS JOY NEW (mobile: 9071274826)
];

export function isSocialModerator(authUid: string | undefined | null): boolean {
  if (!authUid) return false;
  return SOCIAL_MODERATOR_UIDS.includes(authUid);
}
