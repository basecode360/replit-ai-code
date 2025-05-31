import React from "react";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { Check } from "lucide-react";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";

export default function PricingPage() {
  const [, navigate] = useLocation();
  const [annualBilling, setAnnualBilling] = useState(false);

  const basicPrice = annualBilling ? "$49.90" : "$4.99";
  const basicPeriod = annualBilling ? "/year" : "/month";
  const basicSaving = annualBilling ? "(Save $9.98)" : "";

  const premiumPrice = annualBilling ? "$149.90" : "$14.99";
  const premiumPeriod = annualBilling ? "/year" : "/month";
  const premiumSaving = annualBilling ? "(Save $29.98)" : "";

  return (
    <>
      <Helmet>
        <title>Pricing | GreenBookAAR</title>
        <meta
          name="description"
          content="Choose the right GreenBookAAR plan for your military unit's after-action review needs. Simple, transparent pricing with monthly or annual options."
        />
      </Helmet>

      <div className="container max-w-6xl py-12">
        <div className="mx-auto text-center mb-10 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the right plan for your unit's after-action review needs
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <span
              className={
                annualBilling ? "text-muted-foreground" : "font-medium"
              }
            >
              Monthly
            </span>
            <div className="flex items-center">
              <Switch
                id="billing-toggle"
                checked={annualBilling}
                onCheckedChange={setAnnualBilling}
              />
              <Label htmlFor="billing-toggle" className="sr-only">
                Toggle annual billing
              </Label>
            </div>
            <span
              className={
                !annualBilling ? "text-muted-foreground" : "font-medium"
              }
            >
              Annual{" "}
              <span className="text-green-600 font-medium">Save 16%</span>
            </span>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* Basic Tier */}
          <Card className="border-primary/20 relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Basic</CardTitle>
              <CardDescription>Perfect for individual units</CardDescription>
              <div className="mt-2">
                <span className="text-4xl font-bold">{basicPrice}</span>
                <span className="text-muted-foreground ml-1">
                  {basicPeriod}
                </span>
                {basicSaving && (
                  <span className="ml-2 text-sm text-green-600">
                    {basicSaving}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Essential AAR reporting</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Basic AI trend analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Unlimited training events</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Single unit timeline management</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Standard AAR templates</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Email notifications</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                className="w-full"
                onClick={() => navigate("/subscribe/basic")}
              >
                Get Started
              </Button>
            </CardFooter>
          </Card>

          {/* Premium Tier */}
          <Card className="border-2 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
              RECOMMENDED
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Premium</CardTitle>
              <CardDescription>For battalions and larger units</CardDescription>
              <div className="mt-2">
                <span className="text-4xl font-bold">{premiumPrice}</span>
                <span className="text-muted-foreground ml-1">
                  {premiumPeriod}
                </span>
                {premiumSaving && (
                  <span className="ml-2 text-sm text-green-600">
                    {premiumSaving}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>All Basic features, plus:</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Advanced AI analysis & recommendations</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Multi-unit hierarchy management</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Custom AAR templates</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Performance tracking across units</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Training effectiveness metrics</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mr-2" />
                  <span>Unlimited custom AI prompts</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                className="w-full"
                variant="default"
                onClick={() => navigate("/subscribe/premium")}
              >
                Upgrade to Premium
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-16 text-center space-y-6">
          <h2 className="text-2xl font-bold">Need a custom solution?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            For larger organizations or specialized requirements, we offer
            tailored solutions that meet your specific needs.
          </p>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/contact")}
          >
            Contact for Enterprise pricing
          </Button>
        </div>
      </div>
    </>
  );
}
