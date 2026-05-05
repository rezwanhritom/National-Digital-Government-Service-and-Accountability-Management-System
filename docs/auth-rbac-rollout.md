# Auth and RBAC Rollout Notes

## Phase 1
- Deploy backend with new `/api/auth/*` endpoints and JWT secrets.
- Seed at least one `system_admin` user directly in MongoDB for first login.
- Validate role-protected routes:
  - `/api/ml/*`
  - `/api/admin/routes/*`
  - `/api/observability/*`
  - `/api/fleet/*`
  - `/api/export/*`

## Phase 2
- Enable frontend login/signup and protected route flow.
- Use admin console to approve privileged role requests and assign roles.
- Train support team on pending/suspended account handling.

## Phase 3
- Enable model rollout controls (`rolloutPercentage`) in ML Ops.
- Configure system policy for backup and retention under observability policy endpoint.
- Monitor audit logs for auth failures, role changes, and privileged updates.

## Required Environment Variables
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL` (optional, default `15m`)
- `JWT_REFRESH_TTL_DAYS` (optional, default `14`)
- `MONGO_URI`
