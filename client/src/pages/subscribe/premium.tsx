import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-provider";

export default function SubscribePremium() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [isYearlyBilling, setIsYearlyBilling] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to subscribe to GreenBookAAR",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, isLoading, navigate, toast]);

  const handleSubscribe = async () => {
    setIsPending(true);
    
    try {
      // Here we would initiate the subscription process
      // For now, we'll just show a toast and navigate back
      
      setTimeout(() => {
        toast({
          title: "Coming Soon",
          description: "Premium subscription functionality will be available soon!",
        });
        setIsPending(false);
      }, 1500);
      
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Subscription Failed",
        description: "There was an error processing your subscription. Please try again.",
        variant: "destructive",
      });
      setIsPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Subscribe to Premium Plan | GreenBookAAR</title>
        <meta 
          name="description" 
          content="Subscribe to GreenBookAAR Premium Plan at $14.99/month for advanced AI analysis features and multi-unit support."
        />
      </Helmet>
      
      <div className="container max-w-2xl py-16">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Subscribe to Premium Plan</h1>
            <p className="text-muted-foreground mt-2">
              Access advanced features with GreenBookAAR Premium
            </p>
          </div>
          
          <Card className="border-primary">
            <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
              RECOMMENDED
            </div>
            <CardHeader>
              <CardTitle>Premium Plan</CardTitle>
              <CardDescription>
                For battalions and larger units with advanced needs
              </CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold">{isYearlyBilling ? "$149.90" : "$14.99"}</span>
                <span className="text-muted-foreground ml-1">{isYearlyBilling ? "/year" : "/month"}</span>
                {isYearlyBilling && (
                  <span className="ml-2 text-sm text-green-600">(Save $29.98)</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Billing Period</span>
                  <div className="flex items-center gap-2">
                    <span className={!isYearlyBilling ? "font-medium" : "text-muted-foreground"}>Monthly</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="relative px-8 h-7 transition-all"
                      onClick={() => setIsYearlyBilling(!isYearlyBilling)}
                    >
                      <span
                        className={`absolute inset-0 h-full w-1/2 bg-primary rounded-sm transform transition-transform ${
                          isYearlyBilling ? "translate-x-full" : ""
                        }`}
                      />
                      <span className="block relative z-10 text-xs text-transparent">Toggle</span>
                    </Button>
                    <span className={isYearlyBilling ? "font-medium" : "text-muted-foreground"}>Yearly</span>
                  </div>
                </div>
                
                <div className="py-4 space-y-2">
                  <h3 className="font-medium">Plan Includes:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      All Basic features, plus:
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      Advanced AI analysis & recommendations
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      Multi-unit hierarchy management
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      Custom AAR templates
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      Performance tracking across units
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      Training effectiveness metrics
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      Priority support
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      Unlimited custom AI prompts
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                className="w-full" 
                onClick={handleSubscribe}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Subscribe for ${isYearlyBilling ? "$149.90/year" : "$14.99/month"}`
                )}
              </Button>
              <Button 
                variant="ghost" 
                className="text-sm" 
                onClick={() => navigate("/pricing")}
              >
                Back to pricing
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}