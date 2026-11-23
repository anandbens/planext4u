# Authentication
- Keep @supabase/auth-js on its official default session-coordination path (2.119.2 or newer), independently of the database client version; do not add custom browser locks, since lock stealing during recovery can interrupt sign-in.

# Database security
- Pin email queue functions to an empty search path and qualify references, so caller-controlled objects cannot replace trusted code.
- Scope private Homes data to verified authentication or mapped customer identifiers, so both existing identity formats remain supported without trusting submitted ownership.
- Bind selected storage writes to the authenticated file owner, checking both existing and replacement rows on updates, so users cannot modify other users' files.