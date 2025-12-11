import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import WarehouseIndex from "./pages/warehouse/WarehouseIndex";
import GoodsReceiptList from "./pages/warehouse/GoodsReceiptList";
import GoodsReceiptForm from "./pages/warehouse/GoodsReceiptForm";
import GoodsReceiptView from "./pages/warehouse/GoodsReceiptView";
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
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* POS routes outside main layout */}
            <Route path="/pos/classic" element={<ProtectedRoute><ClassicPOS /></ProtectedRoute>} />
            <Route path="/pos/touch" element={<ProtectedRoute><TouchPOS /></ProtectedRoute>} />
            
            {/* Main app routes with sidebar */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/warehouse" element={<WarehouseIndex />} />
              <Route path="/warehouse/receipts" element={<GoodsReceiptList />} />
              <Route path="/warehouse/receipts/new" element={<GoodsReceiptForm />} />
              <Route path="/warehouse/receipts/:id" element={<GoodsReceiptView />} />
              <Route path="/warehouse/receipts/:id/edit" element={<GoodsReceiptForm />} />
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
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
