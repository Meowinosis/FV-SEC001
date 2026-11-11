# PROMPTS.md

This file records every prompt I sent to an AI coding assistant while building this project, as the challenge asks.

**About this log**
- **Only the layout is added.** Headings, numbering, dates and the short *Purpose* / *Outcome* notes are mine. They sit outside the prompt blocks so the raw text stays separate.
- **Pasted material is collapsed.** When I pasted a long document, such as the challenge brief, it appears unchanged inside a collapsible `<details>` section under the prompt.

**Tooling**

| Item | Value |
|------|-------|
| Assistant | Claude Code (VS Code extension) |
| Model | Claude Opus 5.5 (`claude-opus-5-5`) |
| OS | Windows 10 |

---

## Index

| # | Date | Phase | Summary |
|---|------|-------|---------|
| 1 | 2026-11-11 | Analysis & planning | Analyze the brief, draft a plan, create this file |
| 2 | 2026-11-11 | Implementation | Switch the language from Python to Node.js and build the solution |
| 3 | 2026-11-11 | Verification | Run the tool on the real `ad_data.csv` and record the results |
| 4 | 2026-11-11 | Understanding | Walk through the execution flow, file by file, and the reasons behind it |
| 5 | 2026-11-11 | Design review | Is BigInt over-engineering if every file has only 50 campaigns? |

---

## 1. Analyze the brief and plan the work

**Date:** 2026-11-11
**Purpose:** Get an analysis of the challenge and an implementation plan, and set up `PROMPTS.md`.

**Prompt**

```text
analyze this requirement, make a plan, at the end of the file there's a node prompt.md, create prompt.md to meet the requirement, and also make it readable
```

<details>
<summary>Pasted with the prompt: the full challenge brief (unchanged)</summary>

````markdown
# FV-SEC001 - Software Engineer Challenge — Ad Performance Aggregator

## Introduction
This is a data processing challenge for Developer candidates applying to our company.  
You will work with a large CSV dataset (~1GB) containing advertising performance records.

The goal is to evaluate your ability to write clean code, handle large datasets efficiently, optimize performance/memory usage, and design a robust data-processing workflow.

---

## Input Data

### Download the Dataset

1. Download the `ad_data.csv.zip` file from this repository folder
2. Unzip it to get the `ad_data.csv` file (~1GB)
3. Use this CSV file for your solution

```bash
# Example: Unzip the file
unzip ad_data.csv.zip
```

### CSV Schema

| Column         | Type      | Description |
|----------------|-----------|-------------|
| campaign_id    | string    | Campaign ID |
| date           | string    | Date in `YYYY-MM-DD` format |
| impressions    | integer   | Number of impressions |
| clicks         | integer   | Number of clicks |
| spend          | float     | Advertising cost (USD) |
| conversions    | integer   | Number of conversions |

### Example:

| campaign_id | date       | impressions | clicks | spend | conversions |
|-------------|------------|-------------|--------|-------|-------------|
| CMP001      | 2025-01-01 | 12000       | 300    | 45.50 | 12          |
| CMP002      | 2025-01-01 | 8000        | 120    | 28.00 | 4           |
| CMP001      | 2025-01-02 | 14000       | 340    | 48.20 | 15          |
| CMP003      | 2025-01-01 | 5000        | 60     | 15.00 | 3           |
| CMP002      | 2025-01-02 | 8500        | 150    | 31.00 | 5           |

---

# 🎯 Task Requirements

You must build a **console application (CLI)** in any programming language (Python, NodeJS, Go, Java, Rust, etc.) that processes the CSV file and produces aggregated analytics.

---

## 1. Aggregate data by `campaign_id`

For each `campaign_id`, compute:

- `total_impressions`
- `total_clicks`
- `total_spend`
- `total_conversions`
- `CTR` = total_clicks / total_impressions  
- `CPA` = total_spend / total_conversions  
  - If conversions = 0, ignore or return `null` for CPA

---

## 2. Generate two result lists

### **A. Top 10 campaigns with the highest CTR**

Output as CSV format.

**Expected output format (`top10_ctr.csv`):**

| campaign_id | total_impressions | total_clicks | total_spend | total_conversions | CTR    | CPA   |
|-------------|-------------------|--------------|-------------|-------------------|--------|-------|
| CMP042      | 125000            | 6250         | 12500.50    | 625               | 0.0500 | 20.00 |
| CMP015      | 340000            | 15300        | 30600.25    | 1530              | 0.0450 | 20.00 |
| CMP008      | 890000            | 35600        | 71200.75    | 3560              | 0.0400 | 20.00 |
| CMP023      | 445000            | 15575        | 31150.00    | 1557              | 0.0350 | 20.00 |
| CMP031      | 670000            | 20100        | 40200.50    | 2010              | 0.0300 | 20.00 |

### **B. Top 10 campaigns with the lowest CPA**

Output as CSV format. Exclude campaigns with zero conversions.

**Expected output format (`top10_cpa.csv`):**

| campaign_id | total_impressions | total_clicks | total_spend | total_conversions | CTR    | CPA   |
|-------------|-------------------|--------------|-------------|-------------------|--------|-------|
| CMP007      | 450000            | 13500        | 13500.00    | 1350              | 0.0300 | 10.00 |
| CMP019      | 780000            | 23400        | 23400.00    | 2340              | 0.0300 | 10.00 |
| CMP033      | 290000            | 8700         | 10440.00    | 870               | 0.0300 | 12.00 |
| CMP012      | 560000            | 16800        | 21840.00    | 1680              | 0.0300 | 13.00 |
| CMP025      | 320000            | 9600         | 13440.00    | 960               | 0.0300 | 14.00 |

---

## 3. Technical Requirements

- The file is large (~1GB).  
   **Your solution must handle large datasets efficiently with good performance and memory optimization.**
- The program should be runnable via CLI, for example: `python aggregator.py --input ad_data.csv --output results/`

---

# 📬 Submission Instructions

Please submit your **GitHub repository link** via email to: **backoffice@flinters.vn**

Your repository should include:

1. **Source code** in a GitHub repository  
2. Output result files:
   - `top10_ctr.csv`
   - `top10_cpa.csv`
3. A **README.md** including:
   - Setup instructions  
   - How to run the program  
   - Libraries used  
   - Processing time for the 1GB file  
   - Peak memory usage (if measured)
4. *(Optional but recommended)*  
   - Dockerfile  
   - Benchmark logs  
5. **(If used) `PROMPTS.md`** — see [AI Coding Assistants](#-ai-coding-assistants) section below

---

## ✅ Code Quality Expectations

Please write your code carefully. We expect:

- **Correct results** — output must match expected values precisely
- **Clean, readable code** — meaningful names, consistent style, no dead code or commented-out blocks
- **Error handling** — handle missing files, malformed rows, and edge cases gracefully
- **Performance awareness** — the input is ~1GB; your solution must be memory-efficient
- **Tests** — include tests to verify your solution's correctness
- **Documented decisions** — briefly explain non-obvious choices in your README


---

## 🤖 AI Coding Assistants

**We encourage you to use AI coding assistants** such as GitHub Copilot, Claude (Cursor AI, Cline), ChatGPT, or any other AI tools you prefer!

### **If you use AI coding assistants:**
Please include a **`PROMPTS.md`** file in the root of your repository. This helps us understand:
- How you break down problems
- Your communication with AI tools
- Your problem-solving approach

**Requirements for `PROMPTS.md`:**
- Must be a file named exactly `PROMPTS.md` (no other format accepted)
- Paste your prompts **as-is** — raw, unedited, exactly as you typed them
- Do **not** clean up, polish, or rewrite your prompts before submitting

This is **not mandatory** but **highly valued** as it demonstrates your ability to effectively leverage modern development tools.

---

Good luck, and happy coding!
````

</details>

**Outcome:** The assistant analyzed the requirements, proposed a streaming, single-pass Python design with an implementation plan, and created this file.

---

## 2. Switch to Node.js

**Date:** 2026-11-11
**Purpose:** Use Node.js instead of the proposed Python and start building.

**Prompt**

```text
let's use nodejs
```

**Outcome:** The same streaming design, ported to Node.js with no dependencies: byte-level CSV parsing, exact integer arithmetic for spend, `node:test` tests, a synthetic data generator and a Dockerfile.

---

## 3. Test with the real dataset

**Date:** 2026-11-11
**Purpose:** Replace the synthetic benchmark with a run on the real challenge file.

**Prompt**

```text
test again with real file I've pushed in workspace recently
```

**Outcome:** All 26,843,544 rows parsed with none skipped, in about 5.5 s with a peak memory of 106 MB. The results matched an independent Python implementation byte for byte. The README and a new benchmark log were updated with the real numbers.

---

## 4. Walk through the execution flow

**Date:** 2026-11-11
**Purpose:** Understand how the code runs end to end, so I can explain and defend each design choice.

**Prompt**

```text
explain the execution flow of this project step by step, from when I run the CLI command until top10_ctr.csv and top10_cpa.csv are written. for each step tell me which file and function handles it and why it's done that way
```

**Outcome:** A step-by-step walkthrough from `aggregator.js` to the two report files, naming the file and function for each step and the reason for its design. No code changed.

---

## 5. Is BigInt over-engineering?

**Date:** 2026-11-11
**Purpose:** Prepare for a reviewer challenging the use of BigInt.

**Prompt**

```text
if reviewer say " every file will only contain 50 campaign" then BigInt is over-engineered? Or it for safety later
```

**Outcome:** Measured the real totals against 2^53. BigInt is required for the exact CTR/CPA comparisons on the real data (cross products reach 575x to 900,000x 2^53). Only the spend-sum flush is a safety margin, and it is driven by spend per campaign, not by the number of campaigns. No code changed.

---

<!--
Template for the next prompt. Copy the block below, fill it in, and add a row to the Index.
Paste the prompt exactly as typed. Do not fix typos. If it is in Vietnamese, translate it literally and mark it "(translated from Vietnamese)".

## N. <short title>

**Date:** YYYY-MM-DD
**Purpose:** <one line: what you wanted from this prompt>

**Prompt**

```text
<paste the raw prompt here>
```

**Outcome:** <one line: what came out of it>

---
-->
