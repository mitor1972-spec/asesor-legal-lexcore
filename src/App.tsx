import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
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
import LawfirmApplications from "@/pages/settings/LawfirmApplications";
import ChatwootSettings from "@/pages/settings/ChatwootSettings";
import ProfileSettings from "@/pages/settings/ProfileSettings";
import DiscardedLeads from "@/pages/settings/DiscardedLeads";
import AiPromptsSettings from "@/pages/settings/AiPromptsSettings";
import MasterConfig from "@/pages/settings/MasterConfig";
import LawfirmDashboard from "@/pages/lawfirm/LawfirmDashboard";
import LawfirmCases from "@/pages/lawfirm/LawfirmCases";
import LawfirmCaseDetail from "@/pages/lawfirm/LawfirmCaseDetail";
import LeadsMarket from "@/pages/lawfirm/LeadsMarket";
import LawfirmAnuncios from "@/pages/lawfirm/LawfirmAnuncios";
import LawfirmConfig from "@/pages/lawfirm/LawfirmConfig";
import LawfirmPricing from "@/pages/lawfirm/LawfirmPricing";
import LawfirmMarketplaceConfig from "@/pages/lawfirm/LawfirmMarketplaceConfig";
import LawfirmAdvertising from "@/pages/lawfirm/LawfirmAdvertising";
import LawfirmAIServices from "@/pages/lawfirm/LawfirmAIServices";
import LawfirmTeam from "@/pages/lawfirm/LawfirmTeam";
import LawfirmBranches from "@/pages/lawfirm/LawfirmBranches";
import LawfirmBilling from "@/pages/lawfirm/LawfirmBilling";
import LawfirmServices from "@/pages/lawfirm/LawfirmServices";
import LawfirmReports from "@/pages/lawfirm/LawfirmReports";
import LawfirmOutsourcing from "@/pages/lawfirm/LawfirmOutsourcing";
import LawfirmCommission from "@/pages/lawfirm/LawfirmCommission";
import LawfirmRadar from "@/pages/lawfirm/LawfirmRadar";
import LawfirmPortada from "@/pages/lawfirm/LawfirmPortada";
import RegistroDespacho from "@/pages/RegistroDespacho";
import SalesReport from "@/pages/reports/SalesReport";
import NotFound from "@/pages/NotFound";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ImpersonationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/registro-despacho" element={<RegistroDespacho />} />
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="leads/new" element={<LeadNew />} />
                  <Route path="leads/:id" element={<LeadDetail />} />
                  <Route path="leads/:id/edit" element={<LeadEdit />} />
                  <Route path="leads/:id/preview" element={<LeadPreviewAsLawyer />} />
                  <Route path="users" element={<RequireAdmin><Users /></RequireAdmin>} />
                  <Route path="settings/api-keys" element={<RequireAdmin><ApiKeys /></RequireAdmin>} />
                  <Route path="settings/lexcore" element={<RequireAdmin><LexcoreConfig /></RequireAdmin>} />
                  <Route path="settings/ai-prompts" element={<AiPromptsSettings />} />
                  <Route path="settings/lawfirms" element={<RequireAdmin><LawfirmsManagement /></RequireAdmin>} />
                  <Route path="settings/solicitudes" element={<LawfirmApplications />} />
                  <Route path="settings/chatwoot" element={<RequireAdmin><ChatwootSettings /></RequireAdmin>} />
                  <Route path="settings/discarded-leads" element={<DiscardedLeads />} />
                  <Route path="settings/profile" element={<ProfileSettings />} />
                  <Route path="informes/ventas" element={<SalesReport />} />
                </Route>
                <Route path="/despacho" element={<LawfirmLayout />}>
                  <Route index element={<Navigate to="/despacho/portada" replace />} />
                  <Route path="portada" element={<LawfirmPortada />} />
                  <Route path="dashboard" element={<LawfirmDashboard />} />
                  <Route path="casos" element={<LawfirmCases />} />
                  <Route path="casos/:id" element={<LawfirmCaseDetail />} />
                  <Route path="leadsmarket" element={<LeadsMarket />} />
                  <Route path="anuncios" element={<LawfirmAnuncios />} />
                  <Route path="configuracion" element={<LawfirmConfig />} />
                  <Route path="precios" element={<LawfirmPricing />} />
                  <Route path="configuracion-marketplace" element={<LawfirmMarketplaceConfig />} />
                  <Route path="publicidad" element={<LawfirmAdvertising />} />
                  <Route path="ia-servicios" element={<LawfirmAIServices />} />
                  <Route path="equipo" element={<LawfirmTeam />} />
                  <Route path="sucursales" element={<LawfirmBranches />} />
                  <Route path="facturacion" element={<LawfirmBilling />} />
                  <Route path="servicios" element={<LawfirmServices />} />
                  <Route path="informes" element={<LawfirmReports />} />
                  <Route path="outsourcing" element={<LawfirmOutsourcing />} />
                  <Route path="comision" element={<LawfirmCommission />} />
                  <Route path="radar" element={<LawfirmRadar />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;