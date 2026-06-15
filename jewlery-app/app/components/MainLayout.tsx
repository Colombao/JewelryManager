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
      <main className="flex-1 ml-64 min-w-0 overflow-x-hidden transition-all duration-300 text-black">
        {children}
      </main>
    </div>
  );
}
