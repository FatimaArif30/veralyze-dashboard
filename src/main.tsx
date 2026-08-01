
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { trackVisit } from "./lib/track";

  trackVisit();

  createRoot(document.getElementById("root")!).render(<App />);
  