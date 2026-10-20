import { useLocalSearchParams } from 'expo-router';

import TicketDetailScreen from '@/components/tickets/ticket-detail-screen';

export default function TicketDetailRoute() {
  const { id, created } = useLocalSearchParams<{ id?: string | string[]; created?: string | string[] }>();
  const ticketId = Array.isArray(id) ? id[0] : id;
  const showCreated = Array.isArray(created) ? created[0] === '1' : created === '1';
  return <TicketDetailScreen ticketId={ticketId} showCreated={showCreated} />;
}
