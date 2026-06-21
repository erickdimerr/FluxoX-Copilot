import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { FlowList } from "./pages/FlowList";
import { ChatPage } from "./pages/ChatPage";
import { WebhookSetupPage } from "./pages/WebhookSetupPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/automacao/:typeId" element={<FlowList />} />
      <Route path="/automacao/:typeId/webhook/:sessionId" element={<WebhookSetupPage />} />
      <Route path="/automacao/:typeId/chat/:sessionId" element={<ChatPage />} />
      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
