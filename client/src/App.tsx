import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppDomain from "./pages/AppDomain";
import Home from "./pages/Home";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/app-domain" component={AppDomain} />
      <Route path="/speaker/:id" component={Home} />
      <Route path="/:tab" component={Home} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster position="top-center" theme="dark" closeButton />
        <WouterRouter base={routerBase}>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </WouterRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
