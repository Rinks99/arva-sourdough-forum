import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import CategoryPage from "@/pages/CategoryPage";
import ThreadPage from "@/pages/ThreadPage";
import NewThreadPage from "@/pages/NewThreadPage";
import SearchPage from "@/pages/SearchPage";
import AdminPage from "@/pages/AdminPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useHashLocation}>
          <Layout>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/category/:slug" component={CategoryPage} />
              <Route path="/thread/:id" component={ThreadPage} />
              <Route path="/new-thread" component={NewThreadPage} />
              <Route path="/search" component={SearchPage} />
              <Route path="/admin" component={AdminPage} />
              <Route path="/forgot-password" component={ForgotPasswordPage} />
              <Route path="/reset-password" component={ResetPasswordPage} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
