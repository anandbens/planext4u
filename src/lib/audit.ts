import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  tableName: string,
  operation: 'insert' | 'update' | 'delete',
  recordId: string,
  oldData?: Record<string, any> | null,
  newData?: Record<string, any> | null
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs' as any).insert({
      table_name: tableName,
      operation,
      record_id: recordId,
      old_data: oldData || null,
      new_data: newData || null,
      performed_by: user?.id || null,
      performed_by_role: '',
    });
  } catch {
    // Silent fail - don't break app for audit failures
  }
}
