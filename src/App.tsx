import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { EstimateList } from '@/routes/EstimateList';
import { EstimateBuilder } from '@/routes/EstimateBuilder';
import { Results } from '@/routes/Results';
import { Compare } from '@/routes/Compare';
import { TemplateList } from '@/routes/Templates';
import { PPARedirect } from '@/routes/Export/PPARedirect';

const TemplateEditor = lazy(() =>
  import('@/routes/Templates/TemplateEditor').then((m) => ({ default: m.TemplateEditor }))
);
const Export = lazy(() => import('@/routes/Export').then((m) => ({ default: m.Export })));
const CatalogAdmin = lazy(() =>
  import('@/routes/Catalog/index').then((m) => ({ default: m.CatalogAdmin }))
);

function Loading() {
  return <div className="text-on-surface-variant text-center py-lg">Loading…</div>;
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<EstimateList />} />
          <Route path="/estimates/new" element={<EstimateBuilder mode="new" />} />
          <Route path="/estimates/:id/edit" element={<EstimateBuilder mode="edit" />} />
          <Route path="/estimates/:id" element={<Results />} />
          <Route path="/estimates/:id/export" element={<Export />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/ppa" element={<PPARedirect />} />
          <Route path="/templates" element={<TemplateList />} />
          <Route path="/templates/:id" element={<TemplateEditor />} />
          <Route path="/catalog" element={<CatalogAdmin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
