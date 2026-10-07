-- ============================================================================
-- جُملتي — إصلاح علّة كامنة في audit_trigger_func (06-fix-audit-insert.sql)
-- ----------------------------------------------------------------------------
-- العلة (مؤكدة من الفحص الحي): فرع INSERT يحدد 5 أعمدة ويمرر 6 قيم —
--   INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
--   VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', NULL, row_to_json(NEW), auth.uid());
-- الـ NULL الزائد كان مقصوداً لعمود old_data غير المذكور في القائمة.
-- لم تظهر العلة أبداً لأن مشغلات التدقيق القديمة كلها AFTER UPDATE OR DELETE فقط؛
-- مشغلات المخازن الجديدة هي الأولى تُسجل INSERT.
-- الإصلاح: نفس الدالة حرفياً مع إسقاط الـ NULL الزائد (5 قيم لـ5 أعمدة).
-- ============================================================================

create or replace function public.audit_trigger_func()
returns trigger
language plpgsql
security definer
as $function$
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
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$function$;
