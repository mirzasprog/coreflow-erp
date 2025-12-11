import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import WarehouseIndex from "./pages/warehouse/WarehouseIndex";
import FinanceIndex from "./pages/finance/FinanceIndex";
import AssetsIndex from "./pages/assets/AssetsIndex";
import POSIndex from "./pages/pos/POSIndex";
import ClassicPOS from "./pages/pos/ClassicPOS";
import TouchPOS from "./pages/pos/TouchPOS";
import HRIndex from "./pages/hr/HRIndex";
import HSEIndex from "./pages/hse/HSEIndex";
import HSECalendar from "./pages/hse/HSECalendar";
import SettingsIndex from "./pages/settings/SettingsIndex";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* POS routes outside main layout */}
          <Route path="/pos/classic" element={<ClassicPOS />} />
          <Route path="/pos/touch" element={<TouchPOS />} />
          
          {/* Main app routes with sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/warehouse" element={<WarehouseIndex />} />
            <Route path="/finance" element={<FinanceIndex />} />
            <Route path="/assets" element={<AssetsIndex />} />
            <Route path="/pos" element={<POSIndex />} />
            <Route path="/hr" element={<HRIndex />} />
            <Route path="/hse" element={<HSEIndex />} />
            <Route path="/hse/calendar" element={<HSECalendar />} />
            <Route path="/settings" element={<SettingsIndex />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
