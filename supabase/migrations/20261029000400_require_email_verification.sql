-- Every account must prove ownership of its email by clicking a verification
-- link, including accounts created before email confirmation was turned on.
--
-- The old signup route (and admin "confirm user" tool) created users with
-- email_confirm: true, which stamps email_confirmed_at without ever sending
-- an email, so those rows have confirmation_sent_at = null. Accounts verified
-- through a real link always have confirmation_sent_at set, which makes this
-- safe to re-run: it only ever touches never-emailed accounts.
--
-- Apply this only once SMTP is configured on the project (see
-- supabase/README.md). Affected users can't sign in until they click the
-- link that /auth/login, /auth/verify-email or the admin panel's
-- "Send verification links" button sends them.

-- End their current sessions so they're held to the new rule immediately
-- rather than when their refresh token expires.
delete from auth.sessions
where user_id in (
  select id from auth.users
  where email_confirmed_at is not null
    and confirmation_sent_at is null
    and email is not null
);

update auth.users
set email_confirmed_at = null
where email_confirmed_at is not null
  and confirmation_sent_at is null
  and email is not null;
