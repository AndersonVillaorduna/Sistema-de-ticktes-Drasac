export function weeklyTicketCounts(tickets, now = new Date()) {
  const end = now.getTime();
  const week = 7 * 24 * 60 * 60 * 1000;
  const current = end - week;
  const previous = current - week;
  let thisWeek = 0;
  let lastWeek = 0;
  for (const ticket of tickets) {
    const time = new Date(ticket.created_at).getTime();
    if (time > current && time <= end) thisWeek += 1;
    else if (time > previous && time <= current) lastWeek += 1;
  }
  return { thisWeek, lastWeek };
}
