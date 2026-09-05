export function calculateWorkoutStreak(completedDates: string[], referenceDate = new Date()): number {
  const completed = new Set(completedDates);
  const cursor = new Date(referenceDate);
  let streak = 0;

  if (!completed.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (completed.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
