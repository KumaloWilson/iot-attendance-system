import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
};

export function ScanAssignmentForm({
  action,
  scanId,
  employees,
  redirectTo
}: {
  action: (formData: FormData) => void | Promise<void>;
  scanId: string;
  employees: EmployeeOption[];
  redirectTo: string;
}) {
  return (
    <Card className="max-w-3xl">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="id" value={scanId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label className="text-sm font-semibold text-slate-700">Assign to employee</label>
          <select name="employeeId" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Assignment notes</label>
          <input name="notes" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        </div>
        <Button type="submit" className="w-fit">Assign scanned card</Button>
      </form>
    </Card>
  );
}
