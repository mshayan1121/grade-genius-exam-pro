
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Building2,
  Users,
  Calendar,
  BookOpen,
  Award,
  GraduationCap,
  FileText,
  Database
} from "lucide-react";

const menuItems = [
  {
    title: "Schools",
    url: "/admin/schools",
    icon: Building2,
    group: "Core Management"
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    group: "Core Management"
  },
  {
    title: "Year Groups",
    url: "/admin/year-groups",
    icon: Calendar,
    group: "Academic Structure"
  },
  {
    title: "Subjects",
    url: "/admin/subjects",
    icon: BookOpen,
    group: "Academic Structure"
  },
  {
    title: "Qualifications",
    url: "/admin/qualifications",
    icon: Award,
    group: "Academic Structure"
  },
  {
    title: "Boards",
    url: "/admin/boards",
    icon: Database,
    group: "Academic Structure"
  },
  {
    title: "Courses",
    url: "/admin/courses",
    icon: GraduationCap,
    group: "Course Management"
  },
  {
    title: "Exams",
    url: "/admin/exams",
    icon: FileText,
    group: "Course Management"
  }
];

const groupedItems = menuItems.reduce((acc, item) => {
  if (!acc[item.group]) {
    acc[item.group] = [];
  }
  acc[item.group].push(item);
  return acc;
}, {} as Record<string, typeof menuItems>);

export function SuperAdminSidebar() {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-purple-100 text-purple-700 font-medium" : "hover:bg-gray-100";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible>
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        {Object.entries(groupedItems).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            <SidebarGroupLabel className="text-purple-600 font-semibold">
              {!collapsed && groupName}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="ml-2">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
