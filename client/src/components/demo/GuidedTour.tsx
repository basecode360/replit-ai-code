import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { ChevronLeft, ChevronRight, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Define the tour steps with their routes and descriptions
const tourSteps = [
  {
    id: 1,
    name: "Welcome",
    path: "/demo",
    description: "Introduction to the Venice AI Training Management System",
    highlightId: null
  },
  {
    id: 2,
    name: "Events",
    path: "/demo/events",
    description: "See how the system tracks training events through the 8-step process",
    highlightId: "event-calendar"
  },
  {
    id: 3,
    name: "AARs",
    path: "/demo/aars",
    description: "Explore how after action reviews capture and preserve training insights",
    highlightId: "aar-list"
  },
  {
    id: 4,
    name: "Analysis",
    path: "/demo/analysis",
    description: "Discover AI-powered analysis of training data",
    highlightId: "analysis-results"
  },
  {
    id: 5,
    name: "Custom Prompts",
    path: "/demo/custom-prompt",
    description: "Ask specific questions about your training data",
    highlightId: "prompt-input"
  },
  {
    id: 6,
    name: "Profile",
    path: "/demo/profile",
    description: "See how your training history follows you between units",
    highlightId: "user-history"
  },
  {
    id: 7,
    name: "Sign Up",
    path: "/demo/signup",
    description: "Choose a plan and get started with Venice AI",
    highlightId: null
  }
];

export default function GuidedTour() {
  const [location, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  // Determine the current step based on the URL path
  useEffect(() => {
    const step = tourSteps.find(step => step.path === location);
    if (step) {
      setCurrentStep(step.id);
      
      // Highlight the element if specified
      if (step.highlightId) {
        const element = document.querySelector(`.${step.highlightId}`);
        if (element) {
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all');
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }
    }
  }, [location]);

  // Navigate to the previous step
  const goToPrevious = () => {
    if (currentStep > 1) {
      const prevStep = tourSteps.find(step => step.id === currentStep - 1);
      if (prevStep) {
        navigate(prevStep.path);
      }
    }
  };

  // Navigate to the next step
  const goToNext = () => {
    if (currentStep < tourSteps.length) {
      const nextStep = tourSteps.find(step => step.id === currentStep + 1);
      if (nextStep) {
        navigate(nextStep.path);
      }
    }
  };

  // Get the current tour step
  const currentTourStep = tourSteps.find(step => step.id === currentStep) || tourSteps[0];

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-4">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-full">
            <ListOrdered className="h-4 w-4 mr-2" />
            Tour Guide
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>GreenBookAAR Demo Tour</SheetTitle>
            <SheetDescription>
              Follow this guided tour to explore the key features of GreenBookAAR
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Step {currentStep} of {tourSteps.length}
              </h3>
              <h2 className="text-xl font-semibold">{currentTourStep.name}</h2>
              <p className="text-muted-foreground">{currentTourStep.description}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Tour Steps</h3>
              <ul className="space-y-2">
                {tourSteps.map((step) => (
                  <li key={step.id}>
                    <Button
                      variant={step.id === currentStep ? "default" : "ghost"}
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => {
                        navigate(step.path);
                        setIsOpen(false);
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2">
                        <span className="text-xs font-medium">{step.id}</span>
                      </div>
                      {step.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      <div className="bg-card rounded-full border shadow-md p-1 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={goToPrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="px-2 text-sm">
          <span className="font-medium">{currentStep}</span>
          <span className="text-muted-foreground">/{tourSteps.length}</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={goToNext}
          disabled={currentStep === tourSteps.length}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}