ALTER TABLE "Shift"
ADD COLUMN "halfDayMinutes" INTEGER NOT NULL DEFAULT 240,
ADD COLUMN "overtimeAfterMinutes" INTEGER NOT NULL DEFAULT 540,
ADD COLUMN "missedCheckoutGraceMinutes" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN "weekendAttendanceEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LeaveRequest"
ADD COLUMN "managerReviewedByUserId" TEXT,
ADD COLUMN "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN "managerReviewNotes" TEXT;

ALTER TABLE "AttendanceCorrection"
ADD COLUMN "managerReviewedByUserId" TEXT,
ADD COLUMN "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN "managerReviewNotes" TEXT;

ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "LeaveRequest_managerReviewedByUserId_fkey"
FOREIGN KEY ("managerReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceCorrection"
ADD CONSTRAINT "AttendanceCorrection_managerReviewedByUserId_fkey"
FOREIGN KEY ("managerReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LeaveRequest_managerReviewedAt_idx" ON "LeaveRequest"("managerReviewedAt");
CREATE INDEX "AttendanceCorrection_managerReviewedAt_idx" ON "AttendanceCorrection"("managerReviewedAt");
