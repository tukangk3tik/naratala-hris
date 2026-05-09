# Time off

---

## For employees — requesting time off

**Sidebar:** My time off

### Viewing your balances

The **My time off** page shows a balance bar for each leave type (vacation, sick, personal, etc.) indicating how many days you have used vs. your entitlement for the year.

### Submitting a request

1. Click **Request time off**.
2. Select the **Leave type** from the dropdown:
   - Vacation
   - Sick
   - Personal
   - Bereavement
   - Parental
   - Unpaid
3. Set the **From** and **To** dates.
4. Optionally add a **Reason**.
5. Click **Submit**.

The request appears in your list with status **Pending** until a manager or HR acts on it.

### Cancelling a request

You can cancel a request that is still **Pending**, or an **Approved** request whose start date has not yet passed:

1. Find the request in the table.
2. Click **Cancel** on that row.

---

## For managers — approving your team's requests

**Sidebar:** Absence queue

> Managers can approve or decline requests from their direct reports.  
> HR and Admin can act on any request.

### Working the queue

1. Click **Absence queue** in the sidebar.
2. Use the **Pending / Approved / All** filter buttons to focus on what needs action.
3. Click a request in the list to open its detail panel on the right.
4. Review the employee name, leave type, dates, day count, and any reason provided.
5. Optionally add a **Note** (sent to the employee).
6. Click **Approve X days** or **Decline**.

---

## For HR / Admin — configuring leave settings

The following pages are under the **Absence** section in the sidebar and require the `absence:configure` permission (HR or Admin).

---

### Leave policies

**Sidebar:** Leave policies

This page sets the default annual entitlements for each leave type.

| Column | Meaning |
|---|---|
| Type | The leave category (vacation, sick, …) |
| Default days/year | Annual entitlement applied to all employees |
| Paid | Whether the leave is paid |
| Affects balance | Whether days are deducted from the employee's balance |

**To change a default:**

1. Click the number in the **Default days/year** column for the leave type you want to change.
2. An inline input appears. Type the new value (supports half-days, e.g. `0.5`).
3. Click outside the field or press Tab to save.

> Changes apply to new allocations. Existing approved leave is not retroactively affected.

---

### Holidays

**Sidebar:** Holidays

Public holidays are excluded from working-day counts when calculating how many days a leave request spans.

#### Adding a holiday

1. Enter the **Date** (YYYY-MM-DD) and a **Label** (e.g. "Eid al-Fitr").
2. Tick **Recurring annually** if the holiday falls on the same calendar date every year.
3. Click **Add**.

#### Removing a holiday

Click **Delete** on any holiday row. The deletion takes effect immediately.

---

### Working schedule

**Sidebar:** Working schedule

Defines which days of the week count as working days for the whole company. This affects how many calendar days a leave request actually costs (weekends and non-working days are free).

1. Check or uncheck each day (Sun through Sat).
2. Click **Save default**.

> The company default applies to all employees. Per-employee overrides are not yet available in the UI.

---

### Absence calendar

**Sidebar:** Calendar

A visual month-by-month view of all approved leave across the organisation. Use the navigation arrows to move between months.
