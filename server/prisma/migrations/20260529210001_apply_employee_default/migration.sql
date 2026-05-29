-- Migration: apply_employee_default
-- Changes the default role for new users from MEMBER to EMPLOYEE.
-- This MUST be a separate migration from the one that added the EMPLOYEE enum value.
-- PostgreSQL does not allow using a newly-added enum value in the same transaction
-- that added it (ERROR: unsafe use of new value of enum type).
-- By the time this migration runs, EMPLOYEE is a fully-committed enum value.

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE'::"UserRole";
