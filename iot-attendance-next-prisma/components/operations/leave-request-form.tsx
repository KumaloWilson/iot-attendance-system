import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
};

export function LeaveRequestForm({
  action,
  employees,
  redirectTo
}: {
  action: (formData: FormData) => void | Promise<void>;
  employees: EmployeeOption[];
  redirectTo: string;
}) {
  return (
    <Card className="max-w-3xl">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label className="text-sm font-semibold text-slate-700">Employee</label>
          <select name="employeeId" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Leave type</label>
          <select name="type" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="ANNUAL">Annual leave</option>
            <option value="SICK">Sick leave</option>
            <option value="OFFICIAL">Official duty</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Start date/time</label>
            <input name="startDate" type="datetime-local" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">End date/time</label>
            <input name="endDate" type="datetime-local" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Reason</label>
          <textarea name="reason" required className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        </div>
        <Button type="submit" className="w-fit">Submit leave request</Button>
      </form>
    </Card>
  );
}
