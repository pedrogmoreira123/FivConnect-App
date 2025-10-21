import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QuickRepliesProvider } from '@/contexts/quick-replies';

createRoot(document.getElementById("root")!).render(
  <QuickRepliesProvider>
    <App />
  </QuickRepliesProvider>
);
