import { Routes, Route } from 'react-router';
import AboutPage from "@/pages/AboutPage";
import NotFoundPage from "@/pages/NotFoundPage";
import AdminPage from '@/pages/AdminPage';
import LoginPage from '@/pages/LoginPage';
import PrivateRoute from './PrivateRoute';
import PermissionRoute from './PermissionRoute';
import AgregarCuadrePage from '@/pages/AgregarCuadrePage';
import ResumenFarmaciasVentas from '@/pages/ResumenFarmaciasVentas';
import VerificacionCuadresPage from '@/pages/VerificacionCuadresPage';
import CuadresPorFarmaciaPage from '@/pages/CuadresPorFarmaciaPage';
import ResumenFarmaciasPorDia from '@/pages/ResumenFarmaciasPorDia';
import TotalGeneralFarmaciasPage from '@/pages/TotalGeneralFarmaciasPage';

const AppRouter = () => (
    <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
            path="/"
            element={
                <PrivateRoute>
                    <AdminPage />
                </PrivateRoute>
            }
        />
        <Route path="/about" element={<AboutPage />} />

        <Route
            path="/agregarcuadre"
            element={
                <PermissionRoute permiso="agregar_cuadre">
                    <AgregarCuadrePage />
                </PermissionRoute>
            }
        />
        <Route
            path="/resumenfarmacias"
            element={
                <PermissionRoute permiso="ver_resumen_mensual">
                    <ResumenFarmaciasVentas />
                </PermissionRoute>
            }
        />
        <Route
            path="/verificacion-cuadres"
            element={
                <PermissionRoute permiso="verificar_cuadres">
                    <VerificacionCuadresPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/ver-cuadres-dia"
            element={
                <PermissionRoute permiso="ver_cuadres_dia">
                    <CuadresPorFarmaciaPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/admin"
            element={
                <PermissionRoute permiso="acceso_admin">
                    <AdminPage />
                </PermissionRoute>
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
                <PermissionRoute permiso="ver_resumen_dia">
                    <ResumenFarmaciasPorDia />
                </PermissionRoute>
            }
        />
        <Route
            path="/ventatotal"
            element={
                <PermissionRoute permiso="ver_ventas_totales">
                    <TotalGeneralFarmaciasPage />
                </PermissionRoute>
            }
        />
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
);

export default AppRouter;