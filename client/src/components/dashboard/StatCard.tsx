import { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor?: string;
  linkText?: string;
  linkHref?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  iconBgColor = "bg-primary",
  linkText,
  linkHref,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-3 ${iconBgColor}`}>
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {title}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {value}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </CardContent>
      {linkText && linkHref && (
        <CardFooter className="bg-gray-50 px-4 py-3 sm:px-6">
          <div className="text-sm">
            <a
              href={linkHref}
              className="font-medium text-primary hover:text-primary/80"
            >
              {linkText}
            </a>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
