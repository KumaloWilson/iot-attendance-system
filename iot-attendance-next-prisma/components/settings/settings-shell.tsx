import Link from "next/link";
import { clsx } from "clsx";
import { PageHero } from "@/components/ui/page-hero";

const links = [
  { href: "/settings", label: "Overview" },
  { href: "/settings/departments", label: "Departments" },
  { href: "/settings/shifts", label: "Shifts" },
  { href: "/settings/devices", label: "Devices" }
];

export function SettingsShell({
  title,
  description,
  activeHref,
  children,
  actions
}: {
  title: string;
  description: string;
  activeHref: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <PageHero eyebrow="Configuration" title={title} description={description} aside={actions} />
      <nav className="flex flex-wrap gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "rounded-xl px-4 py-2 text-sm font-semibold transition",
              activeHref === link.href
                ? "bg-brand-700 text-white shadow-[0_14px_30px_-18px_rgba(29,78,216,0.85)]"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </section>
  );
}
