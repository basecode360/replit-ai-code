import { useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Search, X, DollarSign } from "lucide-react";
import Sidebar from "./Sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationDropdown from "./NotificationDropdown";

export default function Header() {
  const { user, logout } = useAuth();
  const [showSearch, setShowSearch] = useState(false);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((name) => name[0])
        .join("")
    : "U";

  return (
    <header className="sticky top-0 z-40 h-16 bg-white shadow">
      <div className="flex h-full items-center justify-between px-4">
        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>

        {/* Search */}
        <div className="flex items-center flex-1 lg:max-w-lg ml-4 md:ml-0">
          {showSearch ? (
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Search AARs..."
                className="pr-10"
                autoFocus
              />
              <button
                className="absolute right-2 top-2.5"
                onClick={() => setShowSearch(false)}
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className="md:hidden"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
          )}
          <div className="hidden md:flex md:flex-1">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                type="search"
                placeholder="Search AARs..."
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-4">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="hidden md:flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              Pricing
            </Button>
          </Link>
          <NotificationDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 overflow-hidden"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user?.rank} {user?.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
