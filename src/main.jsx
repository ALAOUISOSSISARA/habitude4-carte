import { createRoot } from "react-dom/client";
import "./index.css";
import Phone from "./Phone.jsx";
import Screen from "./Screen.jsx";

// /screen (et l'ancienne adresse /admin) : grand écran avec les commandes ; tout le reste : téléphone
const path = window.location.pathname.replace(/\/+$/, "");
const isScreen = path === "/screen" || path === "/admin";
document.body.dataset.page = isScreen ? "screen" : "phone";
createRoot(document.getElementById("root")).render(isScreen ? <Screen /> : <Phone />);
