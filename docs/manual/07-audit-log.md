# Audit log

**Who can access:** Admin only  
**Sidebar:** Audit

The audit log is an immutable record of every significant change made in the system: who did what, when, and to which entity.

---

## Viewing the audit log

Click **Audit** in the sidebar. The table shows the most recent 50 events, with columns:

| Column | Meaning |
|---|---|
| When | Timestamp of the action |
| Actor | The user who performed the action |
| Action | What happened (e.g. `employee.update`, `payroll_run.finalize`) |
| Entity | The type of record that was changed |
| ID | The ID of the changed record |

Click any row to expand it and see the before/after field values (the **changes** payload).

---

## Filtering

Use the dropdowns above the table to filter by:

- **Action** — narrow to a specific event type (e.g. only `employee.update`)
- **Entity type** — show only changes to a specific kind of record (e.g. only `employee`)

---

## Recorded actions

| Action | Triggered by |
|---|---|
| `employee.create` | Adding a new employee |
| `employee.update` | Editing an employee (including salary changes) |
| `employee.delete` | Deleting an employee |
| `user.update` | Changing a user's role or status |
| `invite.create` | Sending an invite |
| `payroll_run.create` | Creating a new pay run |
| `payroll_run.finalize` | Finalizing a pay run |
| `payroll_run.cancel` | Cancelling a pay run |
| `payroll_run.adjust` | Editing a payslip deduction |

> Salary changes are logged with a required reason field visible in the changes payload.
