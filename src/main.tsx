import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
const redirect = new URLSearchParams(window.location.search).get('redirect');
if (redirect) window.history.replaceState(null, '', '/hu-chart' + redirect);
createRoot(document.getElementById("root")!).render(<App />);
