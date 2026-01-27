import { createBrowserRouter, Navigate } from "react-router"
import { LoginPage } from "@/pages/LoginPage"
import { SignupPage } from "@/pages/SignupPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ContactsPage } from "@/pages/ContactsPage"
import { MessagesPage } from "@/pages/MessagesPage"
import { ProtectedRoute } from "./ProtectedRoute"

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/contacts",
    element: (
      <ProtectedRoute>
        <ContactsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/messages",
    element: (
      <ProtectedRoute>
        <MessagesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/messages/:contactId",
    element: (
      <ProtectedRoute>
        <MessagesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])
