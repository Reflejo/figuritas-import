import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found.");
}

const root = ReactDOM.createRoot(rootElement);

const render = (): void => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

render();
