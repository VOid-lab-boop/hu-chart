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
import MedicalHistory from "./pages/MedicalHistory";
import Users from "./pages/Users";
import ChartingList from "./pages/ChartingList";
import Charting from "./pages/Charting";
import Indices from "./pages/Indices";
import Radiographs from "./pages/Radiographs";
import Treatment from "./pages/Treatment";
import Appointments from "./pages/Appointments";
import Reports from "./pages/Reports";
import Supervision from "./pages/Supervision";
import Requirements from "./pages/Requirements";
import Photos from "./pages/Photos";
import AuditLog from "./pages/AuditLog";
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
                  <Route path="patients/:id/history" element={<MedicalHistory />} />
                  <Route path="charting" element={<ChartingList />} />
                  <Route path="charting/:id" element={<Charting />} />
                  <Route path="indices" element={<Indices />} />
                  <Route path="indices/:chartId" element={<Indices />} />
                  <Route path="radiographs" element={<Radiographs />} />
                  <Route path="photos" element={<Photos />} />
                  <Route path="treatment" element={<Treatment />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="supervision" element={<Supervision />} />
                  <Route path="requirements" element={<Requirements />} />
                  <Route path="audit" element={<AuditLog />} />
                  <Route path="users" element={<Users />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter  basename="/hu-chart/">
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
