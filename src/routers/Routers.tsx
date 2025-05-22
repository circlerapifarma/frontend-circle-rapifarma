import { BrowserRouter as Router, Routes, Route } from 'react-router';
import AboutPage from "@/pages/AboutPage";
import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import AdminPage from '@/pages/AdminPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import PrivateRoute from './PrivateRoute';
import PermissionRoute from './PermissionRoute';
import AgregarCuadrePage from '@/pages/AgregarCuadrePage';
import ResumenFarmaciasVentas from '@/pages/ResumenFarmaciasVentas';
import VerificacionCuadresPage from '@/pages/VerificacionCuadresPage';
import CuadresPorFarmaciaPage from '@/pages/CuadresPorFarmaciaPage';
import ResumenFarmaciasPorDia from '@/pages/ResumenFarmaciasPorDia';

const AppRouter = () => (
    <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
            path="/"
            element={
                <PrivateRoute>
                    <HomePage />
                </PrivateRoute>
            }
        />
        <Route path="/about" element={<AboutPage />} />

        <Route
            path="/agregarcuadre"
            element={
                <PrivateRoute>
                    <AgregarCuadrePage />
                </PrivateRoute>
            }
        />
        <Route
            path="/resumenfarmacias"
            element={
                <PrivateRoute>
                    <ResumenFarmaciasVentas />
                </PrivateRoute>
            }
        />
        <Route
            path="/verificacion-cuadres"
            element={
                <PrivateRoute>
                    <VerificacionCuadresPage />
                </PrivateRoute>
            }
        />
        <Route
            path="/ver-cuadres-dia"
            element={
                <PrivateRoute>
                    <CuadresPorFarmaciaPage />
                </PrivateRoute>
            }
        />
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
        <Route
            path="/resumenfarmacias-dia"
            element={
                <PrivateRoute>
                    <ResumenFarmaciasPorDia />
                </PrivateRoute>
            }
        />
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
);

export default AppRouter;