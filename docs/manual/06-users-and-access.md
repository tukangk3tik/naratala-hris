# Users & access

**Who can manage users:** Admin  
**Who can invite employees:** HR, Admin

---

## User accounts vs employee records

An **employee record** holds HR data (name, department, salary, etc.).  
A **user account** holds login credentials (email, password, role).

An employee needs a user account to sign in to Naratala. The two are linked by the invite flow.

---

## Viewing users

**Sidebar:** Users (Admin only)

The Users page shows all accounts with:

| Column | Meaning |
|---|---|
| Email | Login email |
| Role | `admin`, `hr`, `manager`, or `employee` |
| Status | `active` or `suspended` |
| MFA | Whether MFA is enabled |
| Last login | Timestamp of most recent sign-in |

---

## Inviting an employee

> Requires: HR or Admin

An invite creates a user account and emails the employee a link to set their password.

1. Go to **Employees** and open the employee's record.
2. Click **Invite** (available when the employee has no user account yet).
3. Select the **Role** to assign: `employee`, `manager`, `hr`, or `admin`.
4. Click **Send invite**.

The employee receives an email with a link valid for 48 hours. Once accepted, their account is active and they can sign in.

---

## Editing a user account

> Requires: Admin

1. Go to **Users** in the sidebar.
2. Click **Edit** on the user's row.
3. You can change:
   - **Role** — changes what the user can see and do (see the role table in the [README](./README.md))
   - **Status** — set to `suspended` to prevent sign-in without deleting the account
4. Click **Save**.

---

## Forcing a logout

> Requires: Admin

Force logout immediately revokes all active sessions for a user (access tokens + refresh tokens). The user will be signed out of all devices on their next request.

1. Go to **Users** in the sidebar.
2. Click **Force logout** on the user's row.

Use this when an account may be compromised or when an employee leaves and you want to ensure immediate access termination.

---

## Role permissions summary

| Role | What they can do |
|---|---|
| **employee** | View directory, request own leave, view own payslips |
| **manager** | All employee permissions + approve direct-report leave requests |
| **hr** | All manager permissions + create/edit employees, manage invites, configure absence settings, manage payroll |
| **admin** | All HR permissions + delete employees, manage user accounts, view audit log |
