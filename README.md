# Result Ledger

Result Ledger is a small examination-office system. An administrator manages students, examinations, and results. Each examination has its own leaderboard, ranked only from the marks recorded for that paper. Students have a separate, read-only panel for their own results, ranks, and the leaderboards.

The project is an npm-workspaces monorepo:

- `apps/client` — React administrator and student interfaces (Vite)
- `apps/server` — Node.js and Express API, with Mongoose models for MongoDB

## What it does

- Sign in as an administrator.
- Add, edit, search, and delete students. A roll number is unique.
- Set or reset a student's login password from the student create/edit form (optional; existing records still work).
- Add, edit, and delete examinations. Each examination has its own date, subject, and total marks.
- Enter or clear results for every student on one examination.
- Open an examination-wise leaderboard with rank, marks, percentage, grade, and pass or fail.
- Sign in as a student to see only your own results, your rank in each paper, and the leaderboards.

Deleting a student also deletes that student's results. Deleting an examination also deletes its results. The confirmation step says so before either delete runs.

## Ranking rules

The server is the only place that assigns ranks. Both the admin and student interfaces display those ranks and do not calculate their own. Both leaderboards load their standings from the same shared service (`src/lib/leaderboard.js`).

- Scope is one examination. A score of 49 out of 50 is never placed on the same board as a score of 49 out of 100.
- Only students with a saved result are ranked. A blank row is omitted. It is not stored or ranked as zero. A saved zero is a real score and is ranked.
- Sort order is marks descending. Equal marks are ordered by student name, then roll number, so the order is stable.
- Ranking is competition ranking. Equal marks share a rank, and the next distinct score skips the tied places: 1, 1, 3.
- Percentage is `marks / examination total × 100`, rounded to two decimal places.
- The pass mark is 40% of that examination's total.
- Grades are A+ from 90%, A from 80%, B from 70%, C from 60%, D from 40%, and F below 40%.

An examination total cannot be lowered below marks that are already stored for that paper.

Ranks are computed from live data on every request, so creating, updating, or deleting a result through the admin panel is reflected immediately in the student panel.

`npm test` checks the ranking, grade boundaries, ties, pass count, refusal to divide by a zero total, student access control, and leaderboard correctness after result changes. Those tests do not need MongoDB.

## Seeded example

`npm run seed` creates the admin account and, when the database has no students or examinations, loads a Class 10 Section A cohort. Every seeded student gets the same development password (`student123` by default) so the student panel can be tried immediately. Running the seed again also backfills that password for the sample roll numbers `R-1001`–`R-1008` that still have none; it never overwrites a password that was already set. This is a placeholder, not a secret — change `SEED_STUDENT_PASSWORD` before seeding a non-demo database. Students outside the sample cohort need a password set through the admin panel.

Midterm Mathematics is out of 100. Expected ranks:

| Rank | Student | Marks | Grade |
| --- | --- | --- | --- |
| 1 | Ayesha Rahman | 92 | A+ |
| 1 | Bilal Hossain | 92 | A+ |
| 3 | Chitra Das | 88 | A |
| 4 | Dev Kapoor | 76 | B |
| 4 | Elina Chowdhury | 76 | B |
| 6 | Farhan Ahmed | 64 | C |
| 7 | Grace Mendez | 51 | D |
| 8 | Hasan Ali | 39 | F |

Final Physics is out of 50, so its percentages are not the raw marks. Hasan Ali leads that paper with 49/50 (98%, A+). Grace Mendez and Farhan Ahmed share rank 2 with 46. Ayesha Rahman is last on that paper with 18/50 (36%, F). The two boards are supposed to disagree.

## Local setup

Requirements: Node.js 20 or newer, and MongoDB listening on the URI in `apps/server/.env`. If you do not already have MongoDB, start the included database with Docker:

```bash
docker compose up -d
```

Then:

```bash
cp apps/server/.env.example apps/server/.env
npm install
npm test
npm run seed
npm run dev
```

- Interface: http://localhost:5173
- API: http://localhost:4000
- Seeded admin: `admin` / `admin123`
- Seeded student: `R-1001` / `student123`

In local development both login forms are pre-filled with these seeded values, so one click on the login button signs in. Production builds start with empty fields and no demo credentials in the bundle.

`npm run dev` starts the API and the Vite client together. The client calls relative `/api` paths; Vite proxies them to the API in development and Nginx proxies them in production. There is no hardcoded API host in the React code.

Change `JWT_SECRET` and `STUDENT_JWT_SECRET` in `apps/server/.env` before using this anywhere other than a local demo. Use two different long random strings. The seed does not reset an existing admin password.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API with reload, and the React dev server |
| `npm run seed` | Create the admin and the sample cohort |
| `npm test` | Ranking, access-control, and student API tests |
| `npm start` | API only |
| `npm run build -w client` | Production React bundle in `apps/client/dist` |

## API

Every response is `{ "data": ... }` or `{ "error": "..." }`. Except for health and the two login endpoints, routes require `Authorization: Bearer <token>`. Admin routes accept only an admin token; student routes accept only a student token.

### Admin API (unchanged)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Process check |
| POST | `/api/auth/login` | Exchange username and password for an admin token |
| GET | `/api/auth/me` | Current administrator |
| GET | `/api/dashboard` | Counts and the top of recent examinations |
| GET | `/api/students?q=` | Search students |
| POST | `/api/students` | Create a student; optional `password` sets their login password |
| PUT | `/api/students/:id` | Update a student; optional `password` sets or resets it |
| DELETE | `/api/students/:id` | Delete a student and that student's results |
| GET | `/api/examinations` | List examinations and result counts |
| POST | `/api/examinations` | Create an examination |
| PUT | `/api/examinations/:id` | Update an examination |
| DELETE | `/api/examinations/:id` | Delete an examination and its results |
| GET | `/api/examinations/:id/sheet` | Every student, with any mark already stored |
| PUT | `/api/examinations/:id/results` | Save the sheet. `marksObtained: null` clears a result |
| GET | `/api/leaderboard/:examinationId` | Ranked standings, summary, and the grading policy |

### Student API (new, read-only except the password change)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/student/auth/login` | Registration number + password → student token (rate limited) |
| GET | `/api/student/me` | Own profile, including batch/session and department/course aliases |
| PATCH | `/api/student/me/password` | Change own password after checking the current one |
| GET | `/api/student/dashboard` | Attempted exams, average %, best %, latest rank/result, recent results |
| GET | `/api/student/results?examination=&page=&limit=` | Own results with rank; paginated and filterable |
| GET | `/api/student/results/:examId` | Own result and rank for one examination |
| GET | `/api/student/exams` | Read-only examination list with `status` (`published` / `pending`) |
| GET | `/api/student/leaderboard/:examId` | Public standings with `isMe`; same ranking as the admin board |

Every student route is scoped to the id in the verified token. Request parameters such as `studentId` are ignored, and the leaderboard never exposes another student's email, class, section, or remarks.

Login:

```bash
curl -s http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

curl -s http://localhost:4000/api/student/auth/login \
  -H 'content-type: application/json' \
  -d '{"registrationNumber":"R-1001","password":"student123"}'
```

A result save replaces each included row and leaves students out of the payload unchanged:

```json
{
  "entries": [
    { "studentId": "…", "marksObtained": 92, "remarks": "" },
    { "studentId": "…", "marksObtained": null, "remarks": "" }
  ]
}
```

## Student Panel

### Features and routes

| Route | Page |
| --- | --- |
| `/student/login` | Student sign-in, with a switch to Admin Login |
| `/student` | Dashboard: exams attempted, average %, best %, latest rank, recent results |
| `/student/results` | Own results table with examination filter and pagination; click a row for detail |
| `/student/results/:examId` | Obtained vs total marks, percentage, rank, remarks, leaderboard link |
| `/student/leaderboard` | Examination selector, ranked table, current student highlighted, own rank card |
| `/student/profile` | Read-only details and change-password form |

All pages have loading, empty ("No results published yet"), validation, session-expired, and server-error/retry states. The layout uses the same design system as the admin panel and collapses to a scrollable top nav on mobile. An expired or invalid student session clears the student token and redirects to `/student/login` with a clear message.

### Authentication flow

1. The admin creates or edits a student and optionally enters a password (at least 8 characters). Blank on edit means "keep the current password". The plain value is hashed with bcrypt and never returned by any API.
2. The student signs in at `/student/login` with their registration number (the existing roll number) and password. Failed attempts return one generic message and the endpoint allows 10 attempts per 15 minutes per client IP.
3. The API issues a JWT with `role: "student"` and the student id, signed with `STUDENT_JWT_SECRET` (or a domain-separated key derived from `JWT_SECRET` when it is not set). Admin tokens use `JWT_SECRET` and `role: "admin"`, so tokens cannot cross roles.
4. The browser stores the admin and student tokens under separate keys. React Router guards `/student/*`; direct URL opening and refresh work with the SPA fallback described below.

Students cannot create, update, or delete students, examinations, or results. The only write a student can perform is changing their own password.

### Testing the student panel locally

```bash
npm run seed   # also backfills dev passwords for existing sample students
npm run dev
```

Open http://localhost:5173/student/login and sign in with `R-1001` / `student123`. To give an existing student access, open **Students → Edit** in the admin panel, type a password, and save. `npm test` runs the full suite (existing ranking tests plus student API tests) without needing MongoDB.

## Data model

- **Admin** — username and password hash.
- **Student** — name, unique roll number, optional email, class, and section, plus an optional bcrypt `passwordHash` that is excluded from every query and JSON response by default.
- **Examination** — title, subject, date, total marks, and description.
- **Result** — one student, one examination, marks obtained, and optional remarks. The student and examination pair is unique.

Marks are rounded to two decimal places and must fall between zero and that examination's total.

## Environment variables

`apps/server/.env.example` lists all variables. The student panel adds:

| Variable | Purpose |
| --- | --- |
| `STUDENT_JWT_SECRET` | A different long random string from `JWT_SECRET`; signs student tokens |
| `STUDENT_JWT_EXPIRES_IN` | Student token lifetime (default `12h`) |
| `SEED_STUDENT_PASSWORD` | Development placeholder password applied by `npm run seed` |
| `TRUST_PROXY` | Trusted reverse-proxy hops for login rate limiting (Nginx = 1) |

If `STUDENT_JWT_SECRET` is omitted, a key is derived from `JWT_SECRET` with domain separation, so no migration is strictly required; setting it explicitly is recommended.

## Deployment notes

- Build with `npm run build -w client` and serve `apps/client/dist` through Nginx. Keep the existing SPA fallback: `try_files $uri $uri/ /index.html;` so direct links and refreshes on `/student/*` resolve to the React app. Proxy `/api` to the Node process and pass `X-Forwarded-For` for rate limiting.
- The process manager command does not change (`npm start` in `apps/server`). Add the new environment variables to the server environment and restart once.
- No Nginx or PM2 config change is required if the existing setup already proxies `/api` and falls back to `index.html` for client routes; the new routes are ordinary client-side paths.

### Developed by Md Shah Jalal (shah.jalal.ju.bd@gmail.com)
