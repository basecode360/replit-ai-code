import React from "react";
import { useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2,
  Shield,
  BarChart3,
  FileText,
  Building,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import GuidedTour from "../../components/demo/GuidedTour";

export default function DemoSignup() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>("platoon");

  return (
    <div className="container py-6">
      <GuidedTour />

      <div className="flex flex-col space-y-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight">
            Ready to Transform Your Training?
          </h1>
          <p className="text-xl text-muted-foreground mt-4">
            Start using GreenBookAAR to enhance your unit's training
            effectiveness, preserve institutional knowledge, and drive
            continuous improvement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <Card
            className={`border-2 ${
              selectedPlan === "platoon" ? "border-primary" : "border-border"
            }`}
          >
            <CardHeader>
              <CardTitle>Platoon Level</CardTitle>
              <CardDescription>
                For platoons seeking to enhance training management
              </CardDescription>
              <div className="text-3xl font-bold mt-2">
                $99
                <span className="text-base font-normal text-muted-foreground">
                  /month
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setSelectedPlan("platoon")}
                className="w-full"
                variant={selectedPlan === "platoon" ? "default" : "outline"}
              >
                {selectedPlan === "platoon" ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Selected
                  </>
                ) : (
                  "Select Plan"
                )}
              </Button>

              <Separator />

              <div className="space-y-2">
                <FeatureItem
                  icon={<Building className="h-4 w-4" />}
                  text="Up to 50 personnel"
                />
                <FeatureItem
                  icon={<Calendar className="h-4 w-4" />}
                  text="Unlimited training events"
                />
                <FeatureItem
                  icon={<FileText className="h-4 w-4" />}
                  text="Unlimited AARs"
                />
                <FeatureItem
                  icon={<BarChart3 className="h-4 w-4" />}
                  text="Basic AI analysis"
                />
                <FeatureItem
                  icon={<Shield className="h-4 w-4" />}
                  text="Standard user roles"
                />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-2 ${
              selectedPlan === "company" ? "border-primary" : "border-border"
            }`}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Company Level</CardTitle>
                  <CardDescription>
                    For companies wanting comprehensive training management
                  </CardDescription>
                  <div className="text-3xl font-bold mt-2">
                    $249
                    <span className="text-base font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  POPULAR
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setSelectedPlan("company")}
                className="w-full"
                variant={selectedPlan === "company" ? "default" : "outline"}
              >
                {selectedPlan === "company" ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Selected
                  </>
                ) : (
                  "Select Plan"
                )}
              </Button>

              <Separator />

              <div className="space-y-2">
                <FeatureItem
                  icon={<Building className="h-4 w-4" />}
                  text="Up to 200 personnel"
                />
                <FeatureItem
                  icon={<Calendar className="h-4 w-4" />}
                  text="Unlimited training events"
                />
                <FeatureItem
                  icon={<FileText className="h-4 w-4" />}
                  text="Unlimited AARs"
                />
                <FeatureItem
                  icon={<BarChart3 className="h-4 w-4" />}
                  text="Advanced AI analysis"
                />
                <FeatureItem
                  icon={<Sparkles className="h-4 w-4" />}
                  text="Custom AI queries"
                />
                <FeatureItem
                  icon={<Shield className="h-4 w-4" />}
                  text="Enhanced user roles"
                />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-2 ${
              selectedPlan === "battalion" ? "border-primary" : "border-border"
            }`}
          >
            <CardHeader>
              <CardTitle>Battalion Level</CardTitle>
              <CardDescription>
                For battalions requiring enterprise-level capabilities
              </CardDescription>
              <div className="text-3xl font-bold mt-2">
                $599
                <span className="text-base font-normal text-muted-foreground">
                  /month
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setSelectedPlan("battalion")}
                className="w-full"
                variant={selectedPlan === "battalion" ? "default" : "outline"}
              >
                {selectedPlan === "battalion" ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Selected
                  </>
                ) : (
                  "Select Plan"
                )}
              </Button>

              <Separator />

              <div className="space-y-2">
                <FeatureItem
                  icon={<Building className="h-4 w-4" />}
                  text="Unlimited personnel"
                />
                <FeatureItem
                  icon={<Calendar className="h-4 w-4" />}
                  text="Unlimited training events"
                />
                <FeatureItem
                  icon={<FileText className="h-4 w-4" />}
                  text="Unlimited AARs"
                />
                <FeatureItem
                  icon={<BarChart3 className="h-4 w-4" />}
                  text="Enterprise AI analysis"
                />
                <FeatureItem
                  icon={<Sparkles className="h-4 w-4" />}
                  text="Advanced custom queries"
                />
                <FeatureItem
                  icon={<Shield className="h-4 w-4" />}
                  text="Complete access controls"
                />
                <FeatureItem
                  icon={<Building className="h-4 w-4" />}
                  text="Multi-battalion support"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mt-10">
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>

        <div className="mt-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <FaqItem
                  question="Is GreenBookAAR secure for military training data?"
                  answer="Yes, GreenBookAAR is designed with military-grade security. All data is encrypted in transit and at rest, and we adhere to strict information security standards. We can also deploy in air-gapped environments."
                />
                <FaqItem
                  question="Can we import existing training data?"
                  answer="Absolutely! Our onboarding process includes data migration from your existing systems. We'll work with you to ensure a smooth transition with all your historical training data intact."
                />
                <FaqItem
                  question="Is there a minimum contract period?"
                  answer="Our standard service agreement is for 12 months, but we offer flexible terms for different organizational needs. Contact our sales team to discuss options for your specific requirements."
                />
                <FaqItem
                  question="Can we customize GreenBook for our specific needs?"
                  answer="Yes, GreenBook supports extensive customization, especially at the Company and Battalion levels. We can tailor the system to match your unit's specific training doctrine, reporting requirements, and hierarchy."
                />
                <FaqItem
                  question="How does the training transfer feature work?"
                  answer="When personnel transfer between units within the system, their training history and AAR contributions automatically follow them. The new unit immediately gains access to their insights while maintaining appropriate access controls."
                />
                <FaqItem
                  question="Is technical support included?"
                  answer="Yes, all plans include dedicated technical support. Company and Battalion plans include priority support channels and regular check-ins from our customer success team."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-primary flex-shrink-0">{icon}</div>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">{question}</h3>
      <p className="text-sm text-muted-foreground">{answer}</p>
    </div>
  );
}
