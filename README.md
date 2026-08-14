# trace-compliance-dashboard
# TRACE — Telecom Risk & Compliance Engine

A browser-based compliance operations dashboard built to centralize security testing visibility across portfolio areas. Designed for both operational teams and executive leadership.

## Live Demo
[View Dashboard](https://adorenaya.github.io/trace-compliance-dashboard)

## Overview

TRACE consolidates penetration test results, SLA tracking, and remediation workflows into a single interface. It was built as a prototype to replace manual reporting across disconnected tools.

## Features

- **Executive summary** — high-level view of all testing engagements, SLA status, contract info, and report completion across portfolios
- **Control room** — operational overview with severity-weighted posture score, open findings, and SLA health
- **Compliance tests** — four portfolio areas with start/end dates, scores, and drill-down into individual findings
- **Remediation queue** — findings sorted by SLA urgency, with overdue/due soon/on track status and owner routing
- **Email activity** — tracks outbound owner notifications and follow-up scheduling
- **Data imports** — accepts JSON exports and CSV owner directories to populate live data

## Tech Stack

- Vanilla HTML, CSS, JavaScript — no frameworks, no build step
- JSON data bridge generated from AttackForge exports
- `mailto:` integration for owner notification workflows
- Fully browser-side — no backend required

## Structure

```
trace-compliance-dashboard/
├── index.html              # App shell and view templates
├── app.js                  # Rendering, routing, and data logic
├── styles.css              # All styles
└── attackforge-data.js     # Demo data (generic, anonymized)
```

## Running Locally

Just open `index.html` in a browser — no server or install needed.

## Notes

This is a portfolio demo using anonymized dummy data. No real client information, credentials, or proprietary data is included. Built during a security compliance internship to demonstrate dashboard design, data visualization, and SLA tracking concepts.
