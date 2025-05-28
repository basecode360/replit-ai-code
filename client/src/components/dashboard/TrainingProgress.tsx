import { Card, CardContent, CardHeader } from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import { Badge } from "./components/ui/badge";
import { StepStatus, trainingStepInfo } from "./lib/types";

interface TrainingProgressProps {
  title: string;
  currentStep: number;
  stepStatuses: StepStatus[];
}

export default function TrainingProgress({
  title,
  currentStep,
  stepStatuses,
}: TrainingProgressProps) {
  // Calculate progress percentage
  const completedSteps = stepStatuses.filter(
    (status) => status === "complete"
  ).length;
  const progressPercentage = (completedSteps / stepStatuses.length) * 100;

  // Get status badge
  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case "complete":
        return (
          <Badge variant="outline" className="step-complete">
            Complete
          </Badge>
        );
      case "in-progress":
        return (
          <Badge variant="outline" className="step-in-progress">
            In Progress
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="step-pending">
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Currently at Step {currentStep}:{" "}
            {trainingStepInfo[currentStep - 1]?.name || ""}
          </p>
        </div>
        <div className="mb-6">
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-4 gap-4 sm:grid-cols-8 mt-4">
          {trainingStepInfo.map((step, index) => (
            <div key={step.id} className="text-center">
              <div
                className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                  stepStatuses[index] === "complete" ||
                  stepStatuses[index] === "in-progress"
                    ? "bg-primary"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={
                    stepStatuses[index] === "complete" ||
                    stepStatuses[index] === "in-progress"
                      ? "text-white font-medium"
                      : "text-gray-600 font-medium"
                  }
                >
                  {step.id}
                </span>
              </div>
              <div className="mt-2 text-xs font-medium text-gray-700">
                {step.name}
              </div>
              <div className="mt-1">{getStatusBadge(stepStatuses[index])}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
