import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { WalletProvider } from "./context/WalletContext";
import { PaymentProvider } from "./context/PaymentContext";
import { ToastProvider } from "./context/ToastContext";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { PaymentLinksPage } from "./pages/PaymentLinksPage";
import { ReceivePage } from "./pages/ReceivePage";
import { WithdrawPage } from "./pages/WithdrawPage";
import { UtilitiesPage } from "./pages/UtilitiesPage";
import { PayLinkPage } from "./pages/PayLinkPage";

function App() {
  return (
    <ToastProvider>
      <WalletProvider>
        <PaymentProvider>
          <BrowserRouter>
            <Routes>
              {/* Public payment link page - no layout */}
              <Route path="/pay/:linkId" element={<PayLinkPage />} />
              {/* Protected pages with layout */}
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/links" element={<PaymentLinksPage />} />
                <Route path="/receive" element={<ReceivePage />} />
                <Route path="/withdraw" element={<WithdrawPage />} />
                <Route path="/utilities" element={<UtilitiesPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PaymentProvider>
      </WalletProvider>
    </ToastProvider>
  );
}

export default App;



