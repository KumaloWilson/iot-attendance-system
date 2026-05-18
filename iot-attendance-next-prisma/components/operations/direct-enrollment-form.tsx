import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
};

export function DirectEnrollmentForm({
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
          <label className="text-sm font-semibold text-slate-700">RFID UID</label>
          <input name="rfidUid" required placeholder="46 14 33 07" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        </div>
        <Button type="submit" className="w-fit">Assign UID directly</Button>
      </form>
    </Card>
  );
}
