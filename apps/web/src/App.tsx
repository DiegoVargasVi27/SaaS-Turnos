import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { Home } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { BookPage } from "./pages/BookPage";
import { sessionFromToken, type AuthSession } from "./lib/auth";
import type { ThemeMode } from "./components/TopTabs";

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const token = localStorage.getItem("accessToken");
    return token ? sessionFromToken(token) : null;
  });

  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem("themeMode") as ThemeMode | null) ?? "light",
  );

  useEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("themeMode", theme);
  }, [theme]);

  function onToggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  function onLogin(newSession: AuthSession) {
    setSession(newSession);
    localStorage.setItem("accessToken", newSession.accessToken);
  }

  function onLogout() {
    setSession(null);
    localStorage.removeItem("accessToken");
  }

  const isAuthenticated = Boolean(session);

  return (
    <Routes>
      <Route path="/" element={<Home theme={theme} onToggleTheme={onToggleTheme} />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/admin" replace />
          ) : (
            <LoginPage onLogin={onLogin} />
          )
        }
      />
      <Route
        path="/admin"
        element={
          isAuthenticated && session ? (
            <AdminPage session={session} onLogout={onLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/book" element={<Navigate to="/book/demo-barberia" replace />} />
      <Route path="/book/:businessSlug" element={<BookPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
