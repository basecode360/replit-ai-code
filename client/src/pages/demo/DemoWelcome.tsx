import { Sparkles, BarChart3, Users, FileText, Calendar } from "lucide-react";
import { Button } from "../../components/ui/button";
import GuidedTour from "../../components/demo/GuidedTour";

export default function DemoWelcome() {
  return (
    <div className="container py-12">
      <GuidedTour />

      <div className="max-w-5xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary mb-4">
          <Sparkles className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">Interactive Demo</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          GreenBookAAR Training Management System
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Leverage the power of advanced AI to optimize your unit's training,
          preserve knowledge, and make data-driven decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
        <FeatureCard
          icon={<Calendar className="w-12 h-12 text-purple-500" />}
          title="Training Event Management"
          description="Create, track, and manage training events from planning to execution with our comprehensive 8-step process."
        />

        <FeatureCard
          icon={<FileText className="w-12 h-12 text-blue-500" />}
          title="After Action Reviews"
          description="Capture structured feedback that stays with personnel throughout their career, preserving valuable insights."
        />

        <FeatureCard
          icon={<Sparkles className="w-12 h-12 text-yellow-500" />}
          title="AI-Powered Analysis"
          description="Automatically identify trends, friction points, and actionable recommendations from your unit's AARs."
        />

        <FeatureCard
          icon={<Users className="w-12 h-12 text-green-500" />}
          title="Knowledge Preservation"
          description="When personnel transfer units, their AAR history and insights move with them, maintaining continuity."
        />

        <FeatureCard
          icon={<BarChart3 className="w-12 h-12 text-red-500" />}
          title="Custom Analysis Queries"
          description="Ask specific questions in natural language and get AI-generated insights tailored to your unit's needs."
        />

        <FeatureCard
          icon={<Users className="w-12 h-12 text-orange-500" />}
          title="Hierarchical Access"
          description="Unit leaders can access insights from all subordinate units while maintaining appropriate security boundaries."
        />
      </div>

      <div className="mt-20 text-center">
        <p className="text-muted-foreground mb-4">
          Follow the guided tour to see how GreenBookAAR can transform your
          unit's training management.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg">
            <Calendar className="w-4 h-4 mr-2" />
            Start Demo Tour
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card rounded-lg border p-6 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
