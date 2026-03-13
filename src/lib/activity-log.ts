import { supabase } from "@/integrations/supabase/client";

export async function logActivity(type: string, description: string, metadata: Record<string, any> = {}) {
  try {
    // Save to database
    await supabase.from('activity_logs' as any).insert({
      type,
      description,
      metadata,
      user_id: 'system',
    });

    // Also keep local cache for quick access
    const activities = JSON.parse(localStorage.getItem('app_db_activities') || '[]');
    activities.unshift({ id: `ACT-${Date.now()}`, type, description, metadata, timestamp: new Date().toISOString() });
    if (activities.length > 100) activities.length = 100;
    localStorage.setItem('app_db_activities', JSON.stringify(activities));
  } catch {
    // Fallback to localStorage only
    try {
      const activities = JSON.parse(localStorage.getItem('app_db_activities') || '[]');
      activities.unshift({ id: `ACT-${Date.now()}`, type, description, timestamp: new Date().toISOString() });
      if (activities.length > 100) activities.length = 100;
      localStorage.setItem('app_db_activities', JSON.stringify(activities));
    } catch { /* no-op */ }
  }
}
