# ERP correction conventions

- Perform business posting, cancellation and document conversion in database transactions with source-linked idempotency; independent browser writes can leave partial business state.
- Store staff grants in protected `public.user_roles`, scoped to companies; public customer registration must never grant ERP privileges.
- Keep shared deterministic domain calculations under `supabase/functions/_shared` when used by both browser and edge functions; deployed functions cannot import browser source.
- Record unresolved deployment or external-service requirements in `roadmap.md`; never describe source-only checks as verified production flows.