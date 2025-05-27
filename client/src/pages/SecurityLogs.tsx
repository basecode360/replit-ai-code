import { useAuth } from "@/lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Shield, Search, Calendar, Download, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function SecurityLogs() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  
  // Get audit logs
  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/audit-logs"],
    enabled: !!user,
  });

  // Get users for attribution
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  // Action types (derived from data for filtering)
  const actionTypes = Array.from(new Set(auditLogs.map((log: any) => log.action)));

  // Filter logs based on search and action filter
  const filteredLogs = auditLogs.filter((log: any) => {
    const matchesSearch = !searchQuery || 
      JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = !actionFilter || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  // Pagination
  const logsPerPage = 10;
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  // Get badge color based on action type
  const getActionBadge = (action: string) => {
    if (action.includes('login') || action.includes('logout')) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">{action}</Badge>;
    } else if (action.includes('create')) {
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">{action}</Badge>;
    } else if (action.includes('update')) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">{action}</Badge>;
    } else if (action.includes('delete')) {
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">{action}</Badge>;
    } else if (action.includes('restore')) {
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">{action}</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  // Get username from userId
  const getUsernameById = (userId: number) => {
    const user = users.find((u: any) => u.id === userId);
    return user ? `${user.rank} ${user.name}` : `User ${userId}`;
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-condensed font-bold text-gray-900 sm:text-3xl">
            Security Audit Logs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review system activity and security events
          </p>
        </div>
        <div className="mt-4 flex gap-2 md:mt-0 md:ml-4">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <Select value={actionFilter || ""} onValueChange={(value) => setActionFilter(value || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                {actionTypes.map((action: any) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            Showing {paginatedLogs.length} of {filteredLogs.length} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium">No logs found</h3>
              <p className="text-muted-foreground text-center mt-1">
                {searchQuery || actionFilter
                  ? "Try adjusting your search terms or filters."
                  : "There are no audit logs in the system yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                        <TableCell>{getUsernameById(log.userId)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                        <TableCell>
                          {log.details ? (
                            <pre className="text-xs whitespace-pre-wrap max-w-xs overflow-hidden text-ellipsis">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-muted-foreground text-sm">No details</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                      let pageNum: number;
                      
                      if (totalPages <= 5) {
                        pageNum = idx + 1;
                      } else if (currentPage <= 3) {
                        pageNum = idx + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + idx;
                      } else {
                        pageNum = currentPage - 2 + idx;
                      }

                      return (
                        <PaginationItem key={idx}>
                          <PaginationLink 
                            isActive={currentPage === pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
