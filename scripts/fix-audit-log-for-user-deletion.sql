-- =============================================
-- Fix audit_logs foreign key for user deletion
-- =============================================

-- 1. First, drop the existing foreign key constraint on audit_logs.changed_by
ALTER TABLE public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_changed_by_fkey;

-- 2. Recreate the constraint with ON DELETE SET NULL, so if a profile is deleted,
--    audit logs still exist but the changed_by is just NULL
ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_changed_by_fkey 
FOREIGN KEY (changed_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- 3. Also update the audit trigger function to skip logging when deleting a user's own profile
--    to prevent the trigger from inserting a log entry right as we delete the profile
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip audit logging when the table is profiles and the operation is DELETE
    -- This prevents a circular reference when a user deletes their own account
    IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', row_to_json(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', NULL, row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
