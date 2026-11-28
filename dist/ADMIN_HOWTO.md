# Admin How-To — MSSN Remo ICT Quiz Arena

This guide explains each admin task from setup to the final results. Open it in its own browser tab during the event and use the section you need.

**Quick links:** [Before the event](#1-before-the-event) · [Candidates](#2-add-candidates-and-print-codes) · [Round 1](#3-run-round-1-cbt) · [Round 2](#4-run-round-2-pick-a-number) · [Round 2 qualify](#5-qualify-candidates-for-round-3) · [Round 3](#6-run-round-3-first-to-answer) · [Scores](#7-correct-a-score-or-disqualify) · [Audit](#8-audit--probe) · [AI questions](#9-generate-questions-with-groq-and-the-study-guide) · [Database](#10-download-or-restore-a-database-snapshot) · [Projector](#11-projector-and-sound) · [Troubleshooting](#12-troubleshooting)

---

## 1. Before the event

1. Sign in at `/login` with the **admin** account.
2. Open **Admin how-to** from the sidebar footer and keep it in a second tab.
3. Open **Settings** and confirm:
   - Event name, theme and date.
   - Which rounds are enabled.
   - Round 1 question count, duration and points.
   - Round 2 stages, timer and qualifier count.
   - Round 3 read-in delay, answer timer and wrong-answer penalty.
4. Open **Rules & Regulations** from the public site and print or share it with schools.
5. Open `/display` on the projector laptop, then enter full-screen mode.

> Test the projector, tablets, sound and internet before candidates arrive.

---

## 2. Add candidates and print codes

1. Go to **Candidates**.
2. Use **Add candidate** for one candidate, or **Import CSV** for many.
3. CSV columns are `name,school`; a header row is optional.
4. Each candidate receives a unique six-character code.
5. Use **Print codes** to print name, school and access code cards.
6. Candidates open `/join` on their tablet and enter their code.

If a code is exposed, use **Regenerate code** in the candidate row and print the replacement.

---

## 3. Run Round 1 — CBT

1. Confirm candidates are checked in and tablets show the lobby.
2. Go to **Round 1** and press **Open Round 1**.
3. Candidates press **Start test** on their tablets; the server starts their individual timer.
4. Watch **CBT submissions** on the dashboard.
5. Close the round when time ends, or let the server close it automatically.
6. Press **Qualify top N** to advance candidates to Round 2. The count comes from Settings.

Candidates can change answers until they submit. Every change is saved immediately. A candidate who loses connection can rejoin with the same code.

---

## 4. Run Round 2 — Pick a number

1. Go to **Round 2** and press **Start Round 2**.
2. Choose whether to randomise the candidate turn order.
3. The active candidate picks an unused number on their tablet.
4. A countdown appears; then the question appears on the projector and active tablet.
5. The candidate answers before the timer expires.
6. Press **Next** after the reveal. The next candidate picks a number.
7. Continue until all numbers are used or press **End round**.

**Multiple question groups:** In **Settings → Round 2**, add one stage per group. Each stage gets its own number board and question count. After the last reveal of a stage, press **Next** to move to the next stage. Stage and group names appear on the admin, projector and candidate screens.

---

## 5. Qualify candidates for Round 3

1. Finish or end Round 2.
2. In **Round 2**, find **Round 3 qualifiers**.
3. Press **Qualify top N**.
4. The ranking basis is configured in **Settings → Round 2**:
   - overall total;
   - Round 2 score;
   - Round 1 score.
5. Review the qualifier list. Only these candidates can answer in Round 3.

Qualification is based on candidates who actually took a Round 2 turn. If you never run this step, the app falls back to the Round 1 qualifiers.

---

## 6. Run Round 3 — First to answer

1. Go to **Round 3** and press **Start Round 3**.
2. The question is displayed for the configured **read-in** period (default 5 seconds).
3. During the read-in, answers are rejected by the server.
4. When the countdown reaches zero, the race clock starts and the first submitted answer locks the question.
5. Press **Next question** after the reveal, or enable **Auto-run** in Settings.
6. A wrong first answer deducts the configured penalty (default −5).

The projector shows a large read-in countdown and then the race clock. Response time is measured from the unlock moment, not from when the question first appeared.

---

## 7. Correct a score or disqualify

1. Go to **Scores** for the overall standings and manual adjustments.
2. Press **Adjust a score**, choose candidate, round, points and a reason. The adjustment is added to the total and written to the audit log.
3. To disqualify after Round 2, open **Candidates** and press the **Disqualify** icon.
4. Enter a required reason. The candidate is removed from Round 3, keeps their record with a DQ mark, and sees a disqualified screen.
5. Use **Reinstate** if the decision is reversed.

---

## 8. Audit & probe

1. Open **Audit & probe**.
2. Select **Round 1**, **Round 2** or **Round 3**.
3. Round 1 shows CBT scripts and a question-by-question answer sheet.
4. Round 2 shows every pick, stage, selected answer, response time and points.
5. Round 3 shows every race answer and timing.
6. The bottom panel shows round-specific audit events.
7. The view refreshes automatically; the chosen CBT session stays selected.

Use this view to resolve protests and verify what the server stored.

---

## 9. Generate questions with Groq and the study guide

1. Open **Question bank** and press **AI**.
2. Choose **Generate questions**.
3. Set the topic, number of questions, pool and optional group.
4. Leave **Use the built-in study guide** enabled. Groq receives the most relevant excerpts from the bundled Module 1 study-guide chapters.
5. Add extra notes only if you need to narrow the topic.
6. Press **Run AI**. Every generated question includes four options, the correct answer and an explanation.
7. Review the new questions in the bank before using them.

The built-in guide is the source of knowledge. Keep the option enabled so generated answers are grounded in the guide, not general guesses.

To clean existing CSV or notes, switch to **Clean up my CSV/text** and paste the raw content.

> This requires `GROQ_API_KEY` on the server. AI output is saved immediately; edit or delete anything that is not accurate.

---

## 10. Download or restore a database snapshot

1. Open **Settings → Database snapshot**.
2. Press **Download snapshot** to save one SQLite file containing candidates, questions, settings, scores and audit history.
3. Store the snapshot off the server.
4. To load a snapshot, press **Choose snapshot**, select the `.db` file, then **Load snapshot**.
5. Confirm the warning. The app validates the file and schema, backs up the current database, replaces the data and reloads the arena.
6. Use snapshots from the same app release; older or incompatible schemas are rejected.

---

## 11. Projector and sound

1. Open `/display` on the projector browser.
2. Use the browser’s full-screen mode.
3. The display has its own sound toggle. Sound effects are generated in the browser and cached; no audio files are downloaded.
4. Candidate tablets are muted by default.
5. Use the light projector theme unless the hall requires dark mode.

---

## 12. Troubleshooting

**A tablet is offline:** ask the candidate to reload `/join` and enter the same code. Their saved answers remain.

**A candidate cannot pick a number:** confirm it is their turn and the number is still open.

**Round 3 answers are rejected:** check the read-in countdown. The server only accepts answers after it ends.

**Round 3 shows the wrong finalists:** run **Round 2 → Qualify top N**, then start Round 3 again from a reset state.

**A question is wrong:** open **Audit & probe** to inspect the stored record, then correct the question in **Question bank** when it is not active.

**The projector changes are stale:** reload `/display`. The server state is authoritative.

**AI says GROQ_API_KEY is missing:** set the key in `.env` and restart the server.

**Need a clean event:** back up first, then use the reset controls. Use **Database snapshot** for an off-server copy.
