import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Login from "./components/Login";
import S3Operations from "./components/S3Operations";
import VectorDBOperations from "./components/VectorDBOperations";
import CustomerView from "./components/CustomerView";
import Report from "./components/Report";

const queryClient = new QueryClient();

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const handleLogin = (username) => {
    setIsLoggedIn(true);
    setCustomerName(username);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          {!isLoggedIn ? (
            <Login onLogin={handleLogin} />
          ) : (
            <Routes>
              <Route path="/" element={<S3Operations customerName={customerName} />} />
              <Route path="/vectordb" element={<VectorDBOperations customerName={customerName} />} />
              <Route path="/customer" element={<CustomerView customerName={customerName} />} />
              <Route path="/report" element={<Report customerName={customerName} />} />
            </Routes>
          )}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
