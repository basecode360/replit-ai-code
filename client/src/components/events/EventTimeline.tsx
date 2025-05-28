import { Card, CardContent, CardHeader } from "./components/ui/card";
import { trainingStepInfo } from "./lib/types";
import { cn } from "./lib/utils";

interface EventTimelineProps {
  steps: {
    id: number;
    status: "complete" | "in-progress" | "pending";
    date?: Date;
  }[];
  className?: string;
}

export default function EventTimeline({
  steps,
  className,
}: EventTimelineProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <h3 className="text-lg font-bold">Training Timeline</h3>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-8">
            {steps.map((step) => (
              <div key={step.id} className="relative flex items-start">
                <div
                  className={cn(
                    "absolute left-9 top-5 w-3 h-3 rounded-full -translate-x-1.5 border-2 border-white",
                    {
                      "bg-green-500": step.status === "complete",
                      "bg-amber-500": step.status === "in-progress",
                      "bg-gray-300": step.status === "pending",
                    }
                  )}
                />
                <div
                  className={cn(
                    "flex h-10 w-10 flex-none items-center justify-center rounded-full",
                    {
                      "bg-green-100": step.status === "complete",
                      "bg-amber-100": step.status === "in-progress",
                      "bg-gray-100": step.status === "pending",
                    }
                  )}
                >
                  <span
                    className={cn("font-medium text-sm", {
                      "text-green-700": step.status === "complete",
                      "text-amber-700": step.status === "in-progress",
                      "text-gray-500": step.status === "pending",
                    })}
                  >
                    {step.id}
                  </span>
                </div>

                <div className="ml-4 flex-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {trainingStepInfo[step.id - 1]?.name}
                      </div>
                      <div className="mt-0.5 text-sm text-gray-500">
                        {trainingStepInfo[step.id - 1]?.description}
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <span
                        className={cn("text-badge", {
                          "bg-green-100 text-green-800":
                            step.status === "complete",
                          "bg-amber-100 text-amber-800":
                            step.status === "in-progress",
                          "bg-gray-100 text-gray-800":
                            step.status === "pending",
                        })}
                      >
                        {step.status === "complete"
                          ? "Complete"
                          : step.status === "in-progress"
                          ? "In Progress"
                          : "Pending"}
                      </span>
                    </div>
                  </div>
                  {step.date && (
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(step.date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
