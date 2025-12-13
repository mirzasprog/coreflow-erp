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
import GoodsIssueList from "./pages/warehouse/GoodsIssueList";
import GoodsIssueForm from "./pages/warehouse/GoodsIssueForm";
import GoodsIssueView from "./pages/warehouse/GoodsIssueView";
import ItemsList from "./pages/warehouse/ItemsList";
import TransferList from "./pages/warehouse/TransferList";
import TransferForm from "./pages/warehouse/TransferForm";
import TransferView from "./pages/warehouse/TransferView";
import InventoryList from "./pages/warehouse/InventoryList";
import InventoryForm from "./pages/warehouse/InventoryForm";
import InventoryView from "./pages/warehouse/InventoryView";
import StockReport from "./pages/warehouse/StockReport";
import PurchaseOrderList from "./pages/warehouse/PurchaseOrderList";
import PurchaseOrderView from "./pages/warehouse/PurchaseOrderView";
import PurchaseOrderForm from "./pages/warehouse/PurchaseOrderForm";
import FinanceIndex from "./pages/finance/FinanceIndex";
import OutgoingInvoiceList from "./pages/finance/OutgoingInvoiceList";
import IncomingInvoiceList from "./pages/finance/IncomingInvoiceList";
import InvoiceForm from "./pages/finance/InvoiceForm";
import InvoiceView from "./pages/finance/InvoiceView";
import GLEntryList from "./pages/finance/GLEntryList";
import GLEntryForm from "./pages/finance/GLEntryForm";
import GLEntryView from "./pages/finance/GLEntryView";
import ChartOfAccounts from "./pages/finance/ChartOfAccounts";
import AccountBalanceReport from "./pages/finance/AccountBalanceReport";
import AssetsIndex from "./pages/assets/AssetsIndex";
import AssetForm from "./pages/assets/AssetForm";
import AssetView from "./pages/assets/AssetView";
import POSIndex from "./pages/pos/POSIndex";
import ClassicPOS from "./pages/pos/ClassicPOS";
import TouchPOS from "./pages/pos/TouchPOS";
import ShiftManagement from "./pages/pos/ShiftManagement";
import HRIndex from "./pages/hr/HRIndex";
import EmployeeForm from "./pages/hr/EmployeeForm";
import EmployeeView from "./pages/hr/EmployeeView";
import DepartmentList from "./pages/hr/DepartmentList";
import AbsenceList from "./pages/hr/AbsenceList";
import ContractList from "./pages/hr/ContractList";
import PayrollList from "./pages/hr/PayrollList";
import PayrollView from "./pages/hr/PayrollView";
import PayslipView from "./pages/hr/PayslipView";
import PayrollReports from "./pages/hr/PayrollReports";
import PayrollComparison from "./pages/hr/PayrollComparison";
import EmployeePayslipHistory from "./pages/hr/EmployeePayslipHistory";
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
              <Route path="/warehouse/issues" element={<GoodsIssueList />} />
              <Route path="/warehouse/issues/new" element={<GoodsIssueForm />} />
              <Route path="/warehouse/issues/:id" element={<GoodsIssueView />} />
              <Route path="/warehouse/issues/:id/edit" element={<GoodsIssueForm />} />
              <Route path="/warehouse/transfers" element={<TransferList />} />
              <Route path="/warehouse/transfers/new" element={<TransferForm />} />
              <Route path="/warehouse/transfers/:id" element={<TransferView />} />
              <Route path="/warehouse/transfers/:id/edit" element={<TransferForm />} />
              <Route path="/warehouse/inventory" element={<InventoryList />} />
              <Route path="/warehouse/inventory/new" element={<InventoryForm />} />
              <Route path="/warehouse/inventory/:id" element={<InventoryView />} />
              <Route path="/warehouse/inventory/:id/edit" element={<InventoryForm />} />
              <Route path="/warehouse/stock-report" element={<StockReport />} />
              <Route path="/warehouse/purchase-orders" element={<PurchaseOrderList />} />
              <Route path="/warehouse/purchase-orders/new" element={<PurchaseOrderForm />} />
              <Route path="/warehouse/purchase-orders/:id" element={<PurchaseOrderView />} />
              <Route path="/warehouse/purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
              <Route path="/warehouse/items" element={<ItemsList />} />
              <Route path="/finance" element={<FinanceIndex />} />
              <Route path="/finance/invoices/outgoing" element={<OutgoingInvoiceList />} />
              <Route path="/finance/invoices/outgoing/new" element={<InvoiceForm />} />
              <Route path="/finance/invoices/outgoing/:id" element={<InvoiceView />} />
              <Route path="/finance/invoices/outgoing/:id/edit" element={<InvoiceForm />} />
              <Route path="/finance/invoices/incoming" element={<IncomingInvoiceList />} />
              <Route path="/finance/invoices/incoming/new" element={<InvoiceForm />} />
              <Route path="/finance/invoices/incoming/:id" element={<InvoiceView />} />
              <Route path="/finance/invoices/incoming/:id/edit" element={<InvoiceForm />} />
              <Route path="/finance/gl-entries" element={<GLEntryList />} />
              <Route path="/finance/gl-entries/new" element={<GLEntryForm />} />
              <Route path="/finance/gl-entries/:id" element={<GLEntryView />} />
              <Route path="/finance/gl-entries/:id/edit" element={<GLEntryForm />} />
              <Route path="/finance/accounts" element={<ChartOfAccounts />} />
              <Route path="/finance/balance-report" element={<AccountBalanceReport />} />
              <Route path="/finance/gl-entries/:id/edit" element={<GLEntryForm />} />
              <Route path="/assets" element={<AssetsIndex />} />
              <Route path="/assets/new" element={<AssetForm />} />
              <Route path="/assets/:id" element={<AssetView />} />
              <Route path="/assets/:id/edit" element={<AssetForm />} />
              <Route path="/pos" element={<POSIndex />} />
              <Route path="/pos/shifts" element={<ShiftManagement />} />
              <Route path="/hr" element={<HRIndex />} />
              <Route path="/hr/employees/new" element={<EmployeeForm />} />
              <Route path="/hr/employees/:id" element={<EmployeeView />} />
              <Route path="/hr/employees/:id/edit" element={<EmployeeForm />} />
              <Route path="/hr/employees/:id/payslips" element={<EmployeePayslipHistory />} />
              <Route path="/hr/departments" element={<DepartmentList />} />
              <Route path="/hr/absences" element={<AbsenceList />} />
              <Route path="/hr/absences/new" element={<AbsenceList />} />
              <Route path="/hr/contracts" element={<ContractList />} />
              <Route path="/hr/contracts/new" element={<ContractList />} />
              <Route path="/hr/payroll" element={<PayrollList />} />
              <Route path="/hr/payroll/:id" element={<PayrollView />} />
              <Route path="/hr/payslip/:id" element={<PayslipView />} />
              <Route path="/hr/payroll/reports" element={<PayrollReports />} />
              <Route path="/hr/payroll/comparison" element={<PayrollComparison />} />
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
