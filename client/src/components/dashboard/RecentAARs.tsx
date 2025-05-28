import { Card, CardHeader, CardContent } from "./components/ui/card";
import { Link } from "wouter";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "./components/ui/badge";
import { format } from "date-fns";

export interface RecentAAR {
  id: number;
  title: string;
  status: "Completed" | "In Progress" | "Pending";
  date: Date;
  location: string;
  participants: number;
}

interface RecentAARsProps {
  aars: RecentAAR[];
}

export default function RecentAARs({ aars }: RecentAARsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <Badge variant="outline" className="step-complete">
            Completed
          </Badge>
        );
      case "In Progress":
        return (
          <Badge variant="outline" className="step-in-progress">
            In Progress
          </Badge>
        );
      case "Pending":
        return (
          <Badge variant="outline" className="step-pending">
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
        <h2 className="text-lg font-bold font-condensed text-gray-900">
          Recent AARs
        </h2>
        <Link href="/aars/dashboard">
          <a className="text-sm font-medium text-primary hover:text-primary/80">
            View all
          </a>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {aars.map((aar) => (
            <li key={aar.id}>
              <Link href={`/aars/${aar.id}`}>
                <a className="block hover:bg-muted/50">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-primary truncate">
                        {aar.title}
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        {getStatusBadge(aar.status)}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div className="sm:flex space-x-6">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {format(aar.date, "MMMM d, yyyy")}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {aar.location}
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {aar.participants} Participants
                      </div>
                    </div>
                  </div>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
