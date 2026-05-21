UPDATE auth.users
SET encrypted_password = crypt('Planext@2026', gen_salt('bf')),
    updated_at = now()
WHERE email = 'admin@planext4u.com';

-- Invalidate all existing sessions/refresh tokens for this admin so old password sessions cannot continue
DELETE FROM auth.refresh_tokens
WHERE user_id IN (SELECT id::text FROM auth.users WHERE email = 'admin@planext4u.com');

DELETE FROM auth.sessions
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@planext4u.com');