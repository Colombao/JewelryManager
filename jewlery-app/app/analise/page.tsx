"use client";

import MainLayout from "../components/MainLayout";
import RequireAuth from "../components/RequireAuth";
import TrendsAnalysis from "../components/TrendsAnalysis";

export default function AnalysisPage() {
  return (
    <RequireAuth>
      <MainLayout>
        <TrendsAnalysis />
      </MainLayout>
    </RequireAuth>
  );
}
