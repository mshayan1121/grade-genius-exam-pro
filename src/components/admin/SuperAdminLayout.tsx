
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { GraduationCap, LogOut } from "lucide-react";

interface SuperAdminLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export function SuperAdminLayout({ children, onLogout }: SuperAdminLayoutProps) {
  return (
    <SidebarProvider collapsedWidth={56}>
      <div className="min-h-screen flex w-full bg-gray-50">
        <SuperAdminSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-8 w-8 text-purple-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    Super Admin Dashboard
                  </h1>
                </div>
              </div>
              <Button onClick={onLogout} variant="outline" className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
