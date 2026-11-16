---
title: "PySpark Exercises"
description: PySpark Exercises
status: draft
slug: pyspark-exercises
# optional: difficulty, prerequisites, references, tags, related.
---

## Background

🧪 PySpark Exercises - Basic Join + Aggregation

## ✍️ Exercise 1 — Theory

Explain in one paragraph:

Why can joins be expensive or dangerous in Spark, even if the code looks simple?

Expected ingredients:
- shuffle
- data movement
- join cardinality / row explosion
- skew
- one possible mitigation

---

## 💻 Exercise 2 — Basic Join Pipeline

Given:

```
patients_df:
patient_id, name, city

visits_df:
visit_id, patient_id, diagnosis_code
```

Task:

Create a `DataFrame` with:

```
patient_id, name, city, visit_id, diagnosis_code
```

---

## 💻 Exercise 3 — Broadcast Dimension Join + Aggregation

Given:

```
visits_df:
visit_id, patient_id, diagnosis_code

diagnosis_df:
diagnosis_code, diagnosis_name
```

Assume `diagnosis_df` is small.

Task:
1. Join visits with diagnosis names using a broadcast join
2. Count number of visits per diagnosis_name
3. Sort by most frequent diagnosis first
Expected output columns:

```
diagnosis_name, n_visits
```
