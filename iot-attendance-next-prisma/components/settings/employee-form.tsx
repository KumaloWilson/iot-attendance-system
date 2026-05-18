import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Option = {
  id: string;
  name: string;
};

type EmployeeDefaults = {
  employeeNo?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  rfidUid?: string;
  departmentId?: string | null;
  shiftId?: string | null;
  status?: "ACTIVE" | "SUSPENDED" | "TERMINATED";
};

export function EmployeeForm({
  action,
  submitLabel,
  defaults,
  id,
  redirectTo,
  departments,
  shifts
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: EmployeeDefaults;
  id?: string;
  redirectTo: string;
  departments: Option[];
  shifts: Option[];
}) {
  return (
    <Card className="max-w-4xl">
      <form action={action} className="grid gap-4">
        {id ? <input type="hidden" name="id" value={id} /> : null}
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Employee number</label>
            <input name="employeeNo" required defaultValue={defaults?.employeeNo ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">RFID UID</label>
            <input name="rfidUid" required defaultValue={defaults?.rfidUid ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">First name</label>
            <input name="firstName" required defaultValue={defaults?.firstName ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Last name</label>
            <input name="lastName" required defaultValue={defaults?.lastName ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input name="email" type="email" defaultValue={defaults?.email ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Phone</label>
            <input name="phone" defaultValue={defaults?.phone ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Department</label>
            <select name="departmentId" defaultValue={defaults?.departmentId ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="">Unassigned</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Shift</label>
            <select name="shiftId" defaultValue={defaults?.shiftId ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="">Unassigned</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Employment status</label>
          <select name="status" defaultValue={defaults?.status ?? "ACTIVE"} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
