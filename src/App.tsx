import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { LawfirmLayout } from "@/components/lawfirm/LawfirmLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import LeadNew from "@/pages/LeadNew";
import LeadDetail from "@/pages/LeadDetail";
import LeadEdit from "@/pages/LeadEdit";
import LeadPreviewAsLawyer from "@/pages/LeadPreviewAsLawyer";
import Users from "@/pages/Users";
import ApiKeys from "@/pages/settings/ApiKeys";
import LexcoreConfig from "@/pages/settings/LexcoreConfig";
import LawfirmsManagement from "@/pages/settings/LawfirmsManagement";
import LawfirmDashboard from "@/pages/lawfirm/LawfirmDashboard";
import LawfirmCases from "@/pages/lawfirm/LawfirmCases";
import LawfirmCaseDetail from "@/pages/lawfirm/LawfirmCaseDetail";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              {/* Internal Panel */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="leads" element={<Leads />} />
                <Route path="leads/new" element={<LeadNew />} />
                <Route path="leads/:id" element={<LeadDetail />} />
                <Route path="leads/:id/edit" element={<LeadEdit />} />
                <Route path="leads/:id/preview" element={<LeadPreviewAsLawyer />} />
                <Route path="users" element={<Users />} />
                <Route path="settings/api-keys" element={<ApiKeys />} />
                <Route path="settings/lexcore" element={<LexcoreConfig />} />
                <Route path="settings/lawfirms" element={<LawfirmsManagement />} />
              </Route>
              {/* Lawfirm Portal */}
              <Route path="/despacho" element={<LawfirmLayout />}>
                <Route index element={<Navigate to="/despacho/dashboard" replace />} />
                <Route path="dashboard" element={<LawfirmDashboard />} />
                <Route path="casos" element={<LawfirmCases />} />
                <Route path="casos/:id" element={<LawfirmCaseDetail />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
