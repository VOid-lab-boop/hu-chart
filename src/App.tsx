import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Users from "./pages/Users";
import ComingSoon from "./pages/ComingSoon";
import ChartingList from "./pages/ChartingList";
import Charting from "./pages/Charting";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />

                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="patients" element={<Patients />} />
                  <Route path="patients/:id" element={<PatientDetail />} />
                  <Route path="charting" element={<ChartingList />} />
                  <Route path="charting/:id" element={<Charting />} />
                  <Route path="indices" element={<ComingSoon title="Periodontal Indices" />} />
                  <Route path="radiographs" element={<ComingSoon title="Radiographs" />} />
                  <Route path="treatment" element={<ComingSoon title="Treatment Planning" />} />
                  <Route path="appointments" element={<ComingSoon title="Appointments" />} />
                  <Route path="reports" element={<ComingSoon title="Reports & Analytics" />} />
                  <Route path="supervision" element={<ComingSoon title="Supervisor Workflow" subtitle="Approve and digitally sign student cases" />} />
                  <Route path="users" element={<Users />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
