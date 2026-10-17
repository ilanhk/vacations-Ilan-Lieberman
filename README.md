# Daybreak — Vacation Management

A vacation request and approval app with separate employee and manager experiences. The Vue client talks to an Express API backed by PostgreSQL and TypeORM.

## Requirements

- Node.js 20+
- npm
- PostgreSQL 14+

## Get started

1. Create a local PostgreSQL database, for example:

   ```sql
   CREATE DATABASE vacation_management;
   ```

2. Configure the API:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` to your PostgreSQL connection string and replace `JWT_SECRET` with a long, random value. The default connection string in `.env.example` is for a local PostgreSQL server.

3. Install dependencies and create the demo accounts:

   ```powershell
   npm install
   npm run seed
   ```

   The seed command builds the API, creates the TypeORM schema in development, and inserts demo users if they do not already exist.

4. In the `backend` directory, start the API:

   ```powershell
   npm run dev
   ```

5. In a second terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173). The API health check is at [http://localhost:3000/health](http://localhost:3000/health).

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Requester | `requester@vacation.local` | `Vacation123!` |
| Validator | `validator@vacation.local` | `Vacation123!` |

New accounts created through the UI are always assigned the Requester role. Validators are provisioned using the seed script; role assignment is not exposed through public registration.

## Features and API

- Requesters can submit future date ranges, see their own request history and rejection comments, and view the team's approved vacation calendar.
- Validators can filter all requests by status and employee, page through results, approve pending requests, or reject them with a required comment.
- The API enforces date order, no past start dates, no overlapping pending/approved requests for the same employee, single-step decisions for pending requests, and role-based access.
- Passwords are bcrypt-hashed. Login returns a 12-hour JWT, sent by the client as a bearer token.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register a requester |
| `POST` | `/auth/login` | Public | Login |
| `POST` | `/auth/logout` | Public | Stateless logout response |
| `GET` | `/users` | Validator | List employees for the user filter |
| `POST` | `/vacation-requests` | Requester | Submit a request |
| `GET` | `/vacation-requests` | Authenticated | Own requests, or all requests for validators |
| `GET` | `/vacation-requests/team` | Authenticated | Approved team vacation dates |
| `POST` | `/vacation-requests/:id/approve` | Validator | Approve a pending request |
| `POST` | `/vacation-requests/:id/reject` | Validator | Reject a pending request with `{ "comment": "..." }` |

The listing endpoint accepts `page` (default `1`), `limit` (default `10`, maximum `100`), `status`, and—when called by a validator—`userId`. It returns `{ items, pagination: { page, limit, total, pages } }`.

## Technical decisions

- **Separation:** Express routes handle HTTP concerns, command functions own business rules and persistence, TypeORM entities model PostgreSQL data, and the shared event bus publishes domain events after successful commands.
- **Persistence:** TypeORM schema synchronization is enabled outside production to keep local setup simple. Production deployments should use reviewed migrations and set `NODE_ENV=production`.
- **Overlap handling:** Pending and approved requests block overlapping requests; rejected requests do not, so an employee can reapply for the same dates after rejection. New requests use a serializable PostgreSQL transaction to protect the overlap check from concurrent submissions.
- **Common Event Framework:** The required `commoneventframework` package supplies the shared JSON response shape used by the REST API. Its Lambda event normalizer is transport-specific, so the local Express app keeps domain event publication in the in-process event bus rather than routing ordinary HTTP requests through a Lambda adapter.
- **Frontend:** Vue 3, Vue Router, Axios, and Tailwind CSS. The frontend uses browser local storage for the demo JWT session.

## Checks

```powershell
cd backend
npm run build
```

```powershell
cd frontend
npm run build
```

## Known limitations

- The demo JWT is stored in `localStorage`; a production deployment should use a hardened session strategy (for example, secure, HTTP-only cookies with CSRF protections).
- Database schema synchronization is a development convenience, not a production migration strategy.
- There is no email notification, leave balance, holiday calendar, or edit/cancel workflow.
- Logout is stateless: the client discards the JWT, which remains valid until its expiry.
- `commoneventframework` is designed for AWS Lambda and is included to meet the assignment's package requirement; the Express service and domain events do not use its Lambda-only event routing.
- `npm audit` reports three low-severity advisories in the `aws-sdk` v2 dependency pulled transitively by `commoneventframework`; the upstream package has no compatible fix available.
