import { useParams, useNavigate } from 'react-router-dom';
import AdminTicketDetail from '../../components/admin/TicketDetailPanel';

export default function AdminTicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <AdminTicketDetail ticketId={id} onBack={() => navigate('/admin/tickets')} />;
}
