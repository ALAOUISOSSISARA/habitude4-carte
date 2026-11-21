import { createRoot } from "react-dom/client";
import "./index.css";
import Phone from "./Phone.jsx";
import Screen from "./Screen.jsx";
import Admin from "./Admin.jsx";

const path = window.location.pathname.replace(/\/+$/, "");
const Page = path === "/screen" ? Screen : path === "/admin" ? Admin : Phone;
document.body.dataset.page = path === "/screen" ? "screen" : path === "/admin" ? "admin" : "phone";
createRoot(document.getElementById("root")).render(<Page />);
