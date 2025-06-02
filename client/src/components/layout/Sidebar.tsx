import React from "react";

import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-provider";
import {
  Home,
  Users,
  Calendar,
  FileText,
  BarChart2,
  Settings,
  Shield,
  User,
  LogOut,
  Building,
  ClipboardList,
  ListX,
  FileX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <Home className="mr-3 h-5 w-5" />,
    },
    {
      title: "Unit Management",
      href: "/units",
      icon: <Building className="mr-3 h-5 w-5" />,
    },
    {
      title: "Unit Roster",
      href: "/unit-roster",
      icon: <Users className="mr-3 h-5 w-5" />,
    },
    {
      title: "User Profiles",
      href: "/users/1", // Default to admin user profile
      icon: <User className="mr-3 h-5 w-5" />,
    },
    {
      title: "Events",
      href: "/events",
      icon: <Calendar className="mr-3 h-5 w-5" />,
    },
    {
      title: "Events Admin",
      href: "/events/admin",
      icon: <ListX className="mr-3 h-5 w-5" />,
    },
    {
      title: "AARs",
      href: "/aars",
      icon: <FileText className="mr-3 h-5 w-5" />,
    },
    {
      title: "AAR Dashboard",
      href: "/aars/dashboard",
      icon: <ClipboardList className="mr-3 h-5 w-5" />,
    },
    {
      title: "AARs Admin",
      href: "/aars/admin",
      icon: <FileX className="mr-3 h-5 w-5" />,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: <BarChart2 className="mr-3 h-5 w-5" />,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="mr-3 h-5 w-5" />,
    },
    {
      title: "Security Logs",
      href: "/security-logs",
      icon: <Shield className="mr-3 h-5 w-5" />,
    },
  ];

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-sidebar-background/90 border-b border-sidebar-border">
        <h1 className="text-white font-condensed font-bold text-xl tracking-wide">
          AAR MANAGEMENT
        </h1>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 bg-sidebar-background/60 border-b border-sidebar-border">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-sidebar-primary rounded-full p-2">
              <User className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-sidebar-foreground">
                {user.rank} {user.name}
              </p>
              <p className="text-xs text-sidebar-foreground/70">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="px-2 space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <a
                  className={cn(
                    "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    location === item.href
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                  )}
                >
                  {item.icon}
                  {item.title}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="outline"
          className="w-full justify-start text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export default Sidebar;
