import React from "react";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { useLocation } from "wouter";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  relatedEntityId: number | null;
  relatedEntityType: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["/api/notifications"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update unread count when notifications change
  useEffect(() => {
    if (notifications && Array.isArray(notifications)) {
      setUnreadCount(notifications.filter((n: Notification) => !n.read).length);
    }
  }, [notifications]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.read) {
        await fetch(`/api/notifications/${notification.id}/mark-read`, {
          method: "POST",
        });
        refetch();
      }

      // Navigate based on notification type
      if (notification.type === "aar_request" && notification.relatedEntityId) {
        navigate(`/submit-aar/${notification.relatedEntityId}`);
      }
    } catch (error) {
      console.error("Error handling notification click", error);
      toast({
        title: "Error",
        description: "Failed to process notification",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs min-w-[1.2rem] flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications &&
        Array.isArray(notifications) &&
        notifications.length > 0 ? (
          notifications.map((notification: Notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start p-3 cursor-pointer ${
                notification.read ? "opacity-70" : "font-medium"
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex w-full justify-between">
                <span className="font-semibold">{notification.title}</span>
                {!notification.read && (
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </p>
              <span className="text-xs text-muted-foreground mt-1">
                {new Date(notification.createdAt).toLocaleString()}
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="py-2 px-3 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
