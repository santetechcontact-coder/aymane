import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import OfflineNotice from "@/components/OfflineNotice";

const Index = lazy(() => import("./pages/Index.tsx"));
const Splash = lazy(() => import("./pages/Splash"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MedicalRecord = lazy(() => import("./pages/MedicalRecord"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Consultations = lazy(() => import("./pages/Consultations"));
const Pharmacy = lazy(() => import("./pages/Pharmacy"));
const Payments = lazy(() => import("./pages/Payments"));
const SOS = lazy(() => import("./pages/SOS"));
const DoctorSpace = lazy(() => import("./pages/DoctorSpace"));
const PharmacistSpace = lazy(() => import("./pages/PharmacistSpace"));
const ProviderSignup = lazy(() => import("./pages/ProviderSignup"));
const Admin = lazy(() => import("./pages/Admin"));
const Directory = lazy(() => import("./pages/Directory"));
const Profile = lazy(() => import("./pages/Profile"));
const Structure = lazy(() => import("./pages/Structure"));
const Triage = lazy(() => import("./pages/Triage"));
const Dispatch = lazy(() => import("./pages/Dispatch"));
const Track = lazy(() => import("./pages/Track"));
const Messages = lazy(() => import("./pages/Messages"));
const Teleconsultation = lazy(() => import("./pages/Teleconsultation"));
const LaboratorySpace = lazy(() => import("./pages/LaboratorySpace"));
const Monitoring = lazy(() => import("./pages/Monitoring"));
const CarePrograms = lazy(() => import("./pages/CarePrograms"));
const HealthVault = lazy(() => import("./pages/HealthVault"));
const SharedMedicalRecord = lazy(() => import("./pages/SharedMedicalRecord"));
const Subscription = lazy(() => import("./pages/Subscription"));
const ProviderWallet = lazy(() => import("./pages/ProviderWallet"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));
const FinancialAdmin = lazy(() => import("./pages/FinancialAdmin"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ServicesMarketplace = lazy(() => import("./pages/ServicesMarketplace"));
const HealthContentAdmin = lazy(() => import("./pages/HealthContentAdmin"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Invoice = lazy(() => import("./pages/Invoice"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Legal = lazy(() => import("./pages/Legal"));
const PreviewAccess = lazy(() => import("./pages/PreviewAccess"));
const InvestorTour = lazy(() => import("./pages/InvestorTour"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
};

const RouteFallback = () => (
  <div className="min-h-[100dvh] bg-background px-4 py-24">
    <div className="mx-auto max-w-md">
      <div className="h-3 w-24 rounded-full bg-surface-2 animate-pulse" />
      <div className="mt-5 h-10 w-4/5 rounded-[0.75rem] bg-surface-2 animate-pulse" />
      <div className="mt-3 h-4 w-full rounded-full bg-surface-1 animate-pulse" />
      <div className="mt-8 h-48 rounded-[1rem] border border-hairline bg-surface-0 shadow-xs animate-pulse" />
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineNotice />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ScrollToTop />
          <a href="#main-content" className="sr-only focus:not-sr-only fixed top-3 left-3 z-50 rounded-[0.65rem] bg-ink px-4 py-2 text-sm font-semibold text-white">
            Aller au contenu
          </a>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/splash" element={<Splash />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/provider" element={<ProviderSignup />} />
              <Route path="/triage" element={<Triage />} />
              <Route path="/track/:token" element={<Track />} />
              <Route path="/suivi/:token" element={<Track />} />
              <Route path="/tarifs" element={<Pricing />} />
              <Route path="/confidentialite" element={<Legal type="privacy" />} />
              <Route path="/cgu" element={<Legal type="terms" />} />
              <Route path="/mentions-legales" element={<Legal type="mentions" />} />
              <Route path="/securite" element={<Legal type="security" />} />
              <Route path="/investisseurs" element={<InvestorTour />} />
              <Route path="/vue-mobile" element={<InvestorTour />} />
              <Route path="/mobile" element={<InvestorTour />} />
              <Route path="/vue-web" element={<PreviewAccess mode="web" />} />
              <Route path="/web" element={<PreviewAccess mode="web" />} />
              <Route path="/dossier-partage/:token" element={<SharedMedicalRecord />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/annuaire" element={<Directory />} />
              <Route path="/pharmacy" element={<Pharmacy />} />
              <Route path="/pharmacie" element={<Pharmacy />} />
              <Route path="/medical-record" element={<ProtectedRoute><MedicalRecord /></ProtectedRoute>} />
              <Route path="/sos" element={<ProtectedRoute><SOS /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/medical-record" element={<ProtectedRoute><MedicalRecord /></ProtectedRoute>} />
              <Route path="/dashboard/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
              <Route path="/dashboard/consultations" element={<ProtectedRoute><Consultations /></ProtectedRoute>} />
              <Route path="/dashboard/pharmacy" element={<ProtectedRoute><Pharmacy /></ProtectedRoute>} />
              <Route path="/dashboard/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/dashboard/sos" element={<ProtectedRoute><SOS /></ProtectedRoute>} />
              <Route path="/dashboard/emergencies" element={<Navigate to="/dashboard/sos" replace />} />
              <Route path="/dashboard/blood-bank" element={<Navigate to="/dashboard/sos" replace />} />
              <Route path="/dashboard/doctor" element={<ProtectedRoute><DoctorSpace /></ProtectedRoute>} />
              <Route path="/dashboard/pharmacist" element={<ProtectedRoute><PharmacistSpace /></ProtectedRoute>} />
              <Route path="/dashboard/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/dashboard/directory" element={<ProtectedRoute><Directory /></ProtectedRoute>} />
              <Route path="/dashboard/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/dashboard/structure" element={<ProtectedRoute><Structure /></ProtectedRoute>} />
              <Route path="/dashboard/triage" element={<ProtectedRoute><Triage /></ProtectedRoute>} />
              <Route path="/dashboard/dispatch" element={<ProtectedRoute><Dispatch /></ProtectedRoute>} />
              <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/dashboard/teleconsultation" element={<ProtectedRoute><Teleconsultation /></ProtectedRoute>} />
              <Route path="/dashboard/lab" element={<ProtectedRoute><LaboratorySpace /></ProtectedRoute>} />
              <Route path="/dashboard/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
              <Route path="/dashboard/care" element={<ProtectedRoute><CarePrograms /></ProtectedRoute>} />
              <Route path="/dashboard/health-vault" element={<ProtectedRoute><HealthVault /></ProtectedRoute>} />
              <Route path="/dashboard/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/dashboard/wallet" element={<ProtectedRoute><ProviderWallet /></ProtectedRoute>} />
              <Route path="/dashboard/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
              <Route path="/dashboard/admin-finance" element={<ProtectedRoute><FinancialAdmin /></ProtectedRoute>} />
              <Route path="/dashboard/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/dashboard/services" element={<ProtectedRoute><ServicesMarketplace /></ProtectedRoute>} />
              <Route path="/dashboard/health-content" element={<ProtectedRoute><HealthContentAdmin /></ProtectedRoute>} />
              <Route path="/dashboard/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/dashboard/invoices/:id" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
