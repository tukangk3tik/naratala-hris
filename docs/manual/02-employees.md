# Employees

**Who can view:** everyone  
**Who can create / edit:** HR, Admin  
**Who can delete:** Admin only  
**Who can view salary:** HR, Admin (full); Manager (team totals only)

---

## Viewing the employee directory

Click **Employees** in the sidebar. The table shows all employees with their name, email, department, position, employment type, and status.

### Filtering

Use the filter bar above the table to narrow results:

- **Search** — matches name or email (partial, case-insensitive)
- **Department** — show only one department
- **Status** — Active / On leave / Terminated
- **Employment type** — Full time / Part time / Contract / Intern

### Opening an employee record

Click any row to open the employee drawer on the right side. The drawer shows full details including salary (if you have permission) and a history of recent changes.

---

## Creating an employee

> Requires: HR or Admin role

1. Click **Employees** in the sidebar.
2. Click **Add employee** (top-right of the card).
3. Fill in all required fields:
   - Full name
   - Email (used as login if invited)
   - Department
   - Position
   - Employment type (Full time / Part time / Contract / Intern)
   - Employment status (Active by default)
   - Hire date
4. Optionally set a **Salary amount** and **Salary currency** (IDR by default). Only HR and Admin can set salaries.
5. Click **Save**.

---

## Editing an employee

> Requires: HR or Admin role

1. Open the employee record (click a row).
2. Click **Edit** in the drawer.
3. Update any fields. Changing the **Salary** field will reveal a **Reason** field — enter a short description of why the salary changed (minimum 10 characters). This is recorded in the audit log.
4. Click **Save**.

---

## Changing employment status

In the edit form, change **Status** to one of:

| Status | Meaning |
|---|---|
| Active | Currently employed |
| On leave | On extended leave (still employed) |
| Terminated | No longer employed; excluded from new pay runs |

> Only active employees with a salary are included when a new pay run is created.

---

## Deleting an employee

> Requires: Admin role

1. Open the employee record.
2. Click **Delete** in the drawer.
3. Confirm the deletion. This action cannot be undone.

> Deleting an employee removes them from future pay runs but does not erase historical payslips.

---

## Inviting an employee to log in

Employees need a user account to sign in. See [Users & access](./06-users-and-access.md) for how to send an invite.
