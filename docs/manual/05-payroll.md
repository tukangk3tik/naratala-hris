# Payroll

**Sidebar — HR / Admin:** Payroll (dashboard + pay run detail)  
**Sidebar — all roles:** My payslips

---

## How payroll works

Each pay run generates one **payslip** per active employee who has a salary set. The gross amount is calculated as:

```
gross = annual salary ÷ 12
```

HR can then adjust individual **deductions** (tax, insurance, advances, etc.) before finalising. The net amount is:

```
net = gross − deduction
```

A pay run moves through three states:

| Status | Meaning |
|---|---|
| Draft | Payslips can still be adjusted. Not yet official. |
| Finalized | Locked. Totals are computed and recorded. |
| Cancelled | Abandoned draft. No payslips will be processed. |

---

## Payroll dashboard

**Who can see this:** HR, Admin  
**Sidebar:** Payroll

The dashboard gives a financial overview of recent payroll activity:

- **Hero panel** — net pay of the latest finalized run with the run name shown as a pill.
- **Monthly payroll chart** — a line/area chart of the last 6 finalized runs showing net pay (solid line, shaded) and headcount (dashed line).
- **Dept spend donut** — net pay split by department for the most recent finalized run, with a breakdown list below the donut.
- **Upcoming / draft runs** — a list of all draft runs with period and status badge.
- **Create pay run form** — see below.

---

## Creating a pay run

> Requires: HR or Admin

1. On the Payroll dashboard, find the **Create pay run** card.
2. Fill in:
   - **Run name** — e.g. `May 2026 Monthly`
   - **Period start** — first day of the pay period (YYYY-MM-DD)
   - **Period end** — last day of the pay period (YYYY-MM-DD)
3. Click **Create pay run**.

The system immediately generates one payslip for every **active** employee with a salary on record. Employees without a salary, or with a non-active status (on leave, terminated), are excluded.

---

## Viewing a pay run

1. Click a run in the **Upcoming / draft runs** list, or navigate directly to `/payroll/runs/:id`.
2. The detail page shows:
   - Run name, status badge, period, and currency in the header.
   - A table of all payslips: employee name, department, gross, deduction, net.
   - For finalised runs: a totals row at the bottom showing total gross and total net.

---

## Adjusting a deduction

> Only available while the run is in **Draft** status.

1. Open the pay run detail page.
2. In the **Deduction** column, click the deduction amount for the employee you want to adjust. It is underlined with a dotted line to indicate it is editable.
3. An inline input appears. Type the new deduction amount (decimal, e.g. `150000.00`).
4. Click **Save**. The **Net** column updates automatically.

The deduction defaults to `0.00` when a run is first created.

---

## Finalizing a pay run

> Requires: HR or Admin  
> Only possible while status is **Draft**

1. Open the pay run detail page.
2. Click **Finalize** in the header.

The run status changes to **Finalized**. The system computes and locks:
- Total gross across all payslips
- Total net across all payslips
- Headcount

No further adjustments can be made after finalisation. The run appears in the monthly chart on the dashboard.

---

## Cancelling a pay run

> Requires: HR or Admin  
> Only possible while status is **Draft**

1. Open the pay run detail page.
2. Click **Cancel run** in the header.
3. Confirm the action.

All payslips for the run are deleted and the run is marked **Cancelled**. Cancelled runs cannot be reopened.

---

## My payslips (employee view)

**Who can see this:** all roles  
**Sidebar:** My payslips

The **My payslips** page lists your personal payslips from all finalized pay runs. Each row shows:

- The payslip identifier
- Gross amount
- Deduction amount
- Net amount

Use the **Load more** button to page through older payslips.

> Payslips only appear here once the pay run they belong to has been **finalized** by HR.
