"use client";

import Sidebar from "./Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 transition-all duration-300 text-black">
        {children}
      </main>
    </div>
  );
}
