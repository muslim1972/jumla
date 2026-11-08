-- Read-only schema inspection for merchant shipping settings.
-- Run this in the Supabase SQL Editor and return every result set.
-- This script reads catalog metadata only; it does not read profile rows or change data/schema.

-- 1) Confirm the expected table exists.
SELECT to_regclass('public.profiles') AS profiles_table;

-- 2) Return exact column names, types, nullability, defaults, and numeric precision.
SELECT
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3) Return constraints defined on the table.
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = to_regclass('public.profiles')
ORDER BY contype, conname;

-- 4) Return RLS status and policies for the table.
SELECT
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'profiles';

SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- 5) Return table/column privileges relevant to the signed-in application roles.
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;

SELECT
  grantee,
  column_name,
  privilege_type,
  is_grantable
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, column_name, privilege_type;
