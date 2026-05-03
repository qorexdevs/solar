import { Navigate } from 'react-router-dom';
import { useEstimateStore } from '@/store/estimates';

/** Legacy `/ppa` bookmark → estimate Export with PPA tab. */
export function PPARedirect() {
  const recentId = useEstimateStore((s) => s.recentEstimateId);
  const to = recentId ? `/estimates/${recentId}/export?tab=ppa` : '/';
  return <Navigate to={to} replace />;
}
