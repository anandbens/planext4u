export function logActivity(type: string, description: string) {
  try {
    const activities = JSON.parse(localStorage.getItem('app_db_activities') || '[]');
    activities.unshift({ id: `ACT-${Date.now()}`, type, description, timestamp: new Date().toISOString() });
    if (activities.length > 100) activities.length = 100;
    localStorage.setItem('app_db_activities', JSON.stringify(activities));
  } catch {
    // no-op
  }
}
