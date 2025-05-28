import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-provider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/auth-page";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import CreateEvent from "@/pages/CreateEvent";
import EventsAdmin from "@/pages/EventsAdmin";
import AARs from "@/pages/AARs";
import AARDetail from "@/pages/AARDetail";
import SubmitAAR from "@/pages/SubmitAAR";
import AARDashboard from "@/pages/AAR-Dashboard";
import AARsAdmin from "@/pages/AARsAdmin";
import EventAARs from "@/pages/EventAARs";
import UnitManagement from "@/pages/UnitManagement";
import UnitRoster from "@/pages/UnitRoster";
import UserProfile from "@/pages/UserProfile";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import SecurityLogs from "@/pages/SecurityLogs";
import PricingPage from "@/pages/pricing";
import SubscribeIndex from "@/pages/subscribe";
import SubscribeBasic from "@/pages/subscribe/basic";
import SubscribePremium from "@/pages/subscribe/premium";
import Layout from "@/components/layout/Layout";
import { ThemeProvider } from "@/components/ui/theme-provider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Import demo pages
import DemoWelcome from "./pages/demo/DemoWelcome";
import DemoEvents from "@/pages/demo/DemoEvents";
import DemoAARs from "@/pages/demo/DemoAARs";
import DemoAnalysis from "@/pages/demo/DemoAnalysis";
import DemoCustomPrompt from "@/pages/demo/DemoCustomPrompt";
import DemoProfile from "@/pages/demo/DemoProfile";
import DemoSignup from "@/pages/demo/DemoSignup";

function Router() {
  return (
    <Switch>
      {/* Demo Routes - publicly accessible */}
      <Route path="/demo">
        <DemoWelcome />
      </Route>

      <Route path="/demo/events">
        <DemoEvents />
      </Route>

      <Route path="/demo/aars">
        <DemoAARs />
      </Route>

      <Route path="/demo/analysis">
        <DemoAnalysis />
      </Route>

      <Route path="/demo/custom-prompt">
        <DemoCustomPrompt />
      </Route>

      <Route path="/demo/profile">
        <DemoProfile />
      </Route>

      <Route path="/demo/signup">
        <DemoSignup />
      </Route>

      {/* Public routes */}
      <Route path="/pricing">
        <PricingPage />
      </Route>

      <Route path="/subscribe">
        <SubscribeIndex />
      </Route>

      <Route path="/subscribe/basic">
        <SubscribeBasic />
      </Route>

      <Route path="/subscribe/premium">
        <SubscribePremium />
      </Route>

      {/* Auth and protected routes */}
      <Route path="/auth">
        <AuthPage />
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/events">
        <ProtectedRoute>
          <Layout>
            <Events />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/events/admin">
        <ProtectedRoute>
          <Layout>
            <EventsAdmin />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/events/create">
        <ProtectedRoute>
          <Layout>
            <CreateEvent />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/events/:id">
        <ProtectedRoute>
          <Layout>
            <EventDetail />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/aars/dashboard">
        <ProtectedRoute>
          <Layout>
            <AARDashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/aars/admin">
        <ProtectedRoute>
          <Layout>
            <AARsAdmin />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/aars/event/:eventId">
        <ProtectedRoute>
          <Layout>
            <EventAARs />
          </Layout>
        </ProtectedRoute>
      </Route>

      {/* Redirect /aars to the AAR Dashboard */}
      <Route path="/aars">
        <ProtectedRoute>
          <Layout>
            <AARDashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/aars/:id">
        <ProtectedRoute>
          <Layout>
            <AARDetail />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/submit-aar/:eventId">
        <ProtectedRoute>
          <Layout>
            <SubmitAAR />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/units">
        <ProtectedRoute>
          <Layout>
            <UnitManagement />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/unit-roster">
        <ProtectedRoute>
          <Layout>
            <UnitRoster />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/users/:id">
        <ProtectedRoute>
          <Layout>
            <UserProfile />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/analytics">
        <ProtectedRoute>
          <Layout>
            <Analytics />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/security-logs">
        <ProtectedRoute>
          <Layout>
            <SecurityLogs />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
