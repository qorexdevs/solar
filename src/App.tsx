import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ScenarioList } from '@/routes/ScenarioList';
import { ScenarioBuilder } from '@/routes/ScenarioBuilder';
import { Results } from '@/routes/Results';
import { Compare } from '@/routes/Compare';
import { Settings } from '@/routes/Settings';

const Export = lazy(() => import('@/routes/Export').then((m) => ({ default: m.Export })));

function Loading() {
  return <div className="text-on-surface-variant text-center py-lg">Loading…</div>;
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<ScenarioList />} />
          <Route path="/scenarios/new" element={<ScenarioBuilder mode="new" />} />
          <Route path="/scenarios/:id/edit" element={<ScenarioBuilder mode="edit" />} />
          <Route path="/scenarios/:id" element={<Results />} />
          <Route path="/scenarios/:id/export" element={<Export />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
