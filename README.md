# Group B — KRI Monitoring System

This repository contains the initial process requirements and department KRI templates for a prototype that will collect KRIs, compare reported values with approved risk appetite/tolerance thresholds, classify results as Green/Amber/Red, and prepare analytical PDF reports for Operational Risk Management Department (ORMD).

## Source material

- [Process flow](Process-Flow.md)
- [IT monthly KRI template](IT.csv)
- [Digital Banking monthly KRI template](Digi.csv)
- [HR quarterly KRI template](HR.csv)

## Collection schedule in the supplied process note

- IT and Digital Banking: request on the first day of each Nepali month at 10:00 AM.
- Follow-up: after every 3 working days when required information has not been received.
- Monthly submission deadline: within 13 working days of the month.
- HR: quarterly collection; request on the first day of the quarter-end month at 10:00 AM, reminders every 3 days, and submission within 13 working days of the succeeding month after quarter-end.

## Initial workflow

1. Issue KRI requests to the departments using the email routing in the templates.
2. Track submissions, reminders, and deadlines.
3. Validate submitted KRI values.
4. Compare values against approved thresholds and show Green/Amber/Red status.
5. Produce an analytical PDF report and escalate exceptions to ORMD.

## Items requiring confirmation before automated classification

- Approved Green/Amber/Red thresholds for the IT and Digital Banking downtime KRIs are not present in the supplied templates.
- The HR sheet contains formulas and a turnover classification, but the intended calculation and threshold approval should be confirmed before implementation.
- Escalation triggers and the final PDF report layout have not yet been specified.

## ORMD escalation contacts recorded in the process note

- nitu.pathak@nabilbak.com
- nabin.lohani@nabilbank.com

**Data note:** CSV files are worksheet-level conversions of the supplied Excel workbook. Formula text is retained where present. No missing thresholds or formula logic have been inferred or silently changed.
