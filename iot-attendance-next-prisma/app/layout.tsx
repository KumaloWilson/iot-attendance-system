import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IoT Attendance Platform",
  description: "RFID IoT attendance, employee management, timesheets and reports"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
