# Result Ledger

Result Ledger is a small examination-office system. An administrator manages students, examinations, and results. Each examination has its own leaderboard, ranked only from the marks recorded for that paper.

The project is an npm-workspaces monorepo:

- `apps/client` — React administrator interface (Vite)
- `apps/server` — Node.js and Express API, with Mongoose models for MongoDB

## What it does

- Sign in as an administrator.
- Add, edit, search, and delete students. A roll number is unique.
- Add, edit, and delete examinations. Each examination has its own date, subject, and total marks.
- Enter or clear results for every student on one examination.
- Open an examination-wise leaderboard with rank, marks, percentage, grade, and pass or fail.

Deleting a student also deletes that student's results. Deleting an examination also deletes its results. The confirmation step says so before either delete runs.

## Ranking rules

The server is the only place that assigns ranks. The interface displays those ranks and does not calculate its own.

- Scope is one examination. A score of 49 out of 50 is never placed on the same board as a score of 49 out of 100.
- Only students with a saved result are ranked. A blank row is omitted. It is not stored or ranked as zero. A saved zero is a real score and is ranked.
- Sort order is marks descending. Equal marks are ordered by student name, then roll number, so the order is stable.
- Ranking is competition ranking. Equal marks share a rank, and the next distinct score skips the tied places: 1, 1, 3.
- Percentage is `marks / examination total × 100`, rounded to two decimal places.
- The pass mark is 40% of that examination's total.
- Grades are A+ from 90%, A from 80%, B from 70%, C from 60%, D from 40%, and F below 40%.

An examination total cannot be lowered below marks that are already stored for that paper.

`npm test` checks the ranking, grade boundaries, ties, pass count, and the refusal to divide by a zero total. Those tests do not need MongoDB.

## Seeded example

`npm run seed` creates the admin account and, when the database has no students or examinations, loads a Class 10 Section A cohort.

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

Requirements: Node.js 20 or newer, and MongoDB listening on `mongodb://127.0.0.1:27017`. If you do not already have MongoDB, start the included database with Docker:

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
- Seeded sign-in: `admin` / `admin123`

`npm run dev` starts the API and the Vite client together. The client proxies `/api` to the API. Change `JWT_SECRET` in `apps/server/.env` before using this anywhere other than a local demo. The seed does not reset an existing admin password.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API with reload, and the React dev server |
| `npm run seed` | Create the admin and the sample cohort |
| `npm test` | Ranking and grade tests |
| `npm start` | API only |

## API

Every response is `{ "data": ... }` or `{ "error": "..." }`. Except for health and login, routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Process check |
| POST | `/api/auth/login` | Exchange username and password for a token |
| GET | `/api/auth/me` | Current administrator |
| GET | `/api/dashboard` | Counts and the top of recent examinations |
| GET | `/api/students?q=` | Search students |
| POST | `/api/students` | Create a student |
| PUT | `/api/students/:id` | Update a student |
| DELETE | `/api/students/:id` | Delete a student and that student's results |
| GET | `/api/examinations` | List examinations and result counts |
| POST | `/api/examinations` | Create an examination |
| PUT | `/api/examinations/:id` | Update an examination |
| DELETE | `/api/examinations/:id` | Delete an examination and its results |
| GET | `/api/examinations/:id/sheet` | Every student, with any mark already stored |
| PUT | `/api/examinations/:id/results` | Save the sheet. `marksObtained: null` clears a result |
| GET | `/api/leaderboard/:examinationId` | Ranked standings, summary, and the grading policy |

Login:

```bash
curl -s http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
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

## Data model

- **Admin** — username and password hash.
- **Student** — name, unique roll number, optional email, class, and section.
- **Examination** — title, subject, date, total marks, and description.
- **Result** — one student, one examination, marks obtained, and optional remarks. The student and examination pair is unique.

Marks are rounded to two decimal places and must fall between zero and that examination's total.


### Developed by Md Shah Jalal (shah.jalal.ju.bd@gmail.com)