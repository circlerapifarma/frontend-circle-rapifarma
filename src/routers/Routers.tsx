import { BrowserRouter as Router, Routes, Route } from 'react-router';
import AboutPage from "@/pages/AboutPage";
import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import AdminPage from '@/pages/AdminPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import PrivateRoute from './PrivateRoute';
import PermissionRoute from './PermissionRoute';

const AppRouter = () => (
    <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
            path="/admin"
            element={
                <PrivateRoute>
                    <AdminPage />
                </PrivateRoute>
            }
        />
        {/* Ejemplo: solo usuarios con permiso eliminar_cuadres pueden acceder */}
        <Route
            path="/admin/eliminar"
            element={
                <PermissionRoute permiso="eliminar_cuadres">
                    {/* Aquí tu componente de eliminar */}
                    <AdminPage />
                </PermissionRoute>
            }
        />
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
);

export default AppRouter;