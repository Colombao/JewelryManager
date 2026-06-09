"use client";

import MainLayout from "../components/MainLayout";
import MarketplaceTrends from "../components/MarketplaceTrends";
import RequireAuth from "../components/RequireAuth";

export default function TendencionasPage() {
  return (
    <RequireAuth>
      <MainLayout>
        <MarketplaceTrends />
      </MainLayout>
    </RequireAuth>
  );
}
