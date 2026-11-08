# Question bank provenance

Every question in `questions.json` comes from the **MSSN Remo MSS Week 2026 ICT Quiz — Student Study & Exam Preparation Guide** (89-page PDF in the parent project). No outside facts or questions are used.

## Composition

| Source | Count | Use |
|---|---:|---|
| Chapter MCQs 1–9 (5 each) | 45 | Round 1 CBT |
| Mock exam questions selected for Round 1 | 5 | Round 1 CBT |
| Mock exam questions selected for Round 2 | 4 | Round 2 |
| Derived from PDF chapters and tables | 40 | Round 2 (18) and Round 3 (22) |
| **Total** | **94** | **50 / 22 / 22** |

The nine mock questions used in Round 1 are Q2, Q3, Q4, Q9 and Q15. The four mock questions used in Round 2 are Q7, Q18, Q19 and Q21. The remaining mock questions duplicate concepts already tested in Round 1 and were therefore not reused.

## Derived-question rule

The 40 derived questions (`derived-01` … `derived-40`) test facts that are explicitly stated in the PDF: definitions, tables, diagram labels and chapter explanations. Their `pdfRef` field records the section used. Examples:

- `derived-01` — ALU role, Chapter 1.1 (CPU diagram and text)
- `derived-04` — TRIM on an SSD, Chapter 1.1 (Table 1.2)
- `derived-07` — `$B4` mixed reference, Chapter 2.1 (Figure 2.1)
- `derived-16` — 3-2-1 backup rule, Chapter 3.1 (exam tip box)
- `derived-22` — infinite WHILE loop, Chapter 4.1 (Code 4.2)
- `derived-37` — pixel definition, Chapter 8.1 (Figure 8.1)
- `derived-40` — transfer learning, Chapter 9.1 (Teachable Machine note)

## Verification

```bash
npm run questions:verify
```

The script checks:

- exactly 94 questions;
- exactly 50 Round 1, 22 Round 2 and 22 Round 3 questions;
- four options per question;
- a valid `correctIndex` from 0–3;
- a non-empty explanation;
- a `pdfRef` and `source` on every question;
- no duplicate prompts.
