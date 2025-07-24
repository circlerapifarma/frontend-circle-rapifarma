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
import TotalGeneralFarmaciasPage from '@/pages/TotalGeneralFarmaciasPage';
import CuadresPorUsuarioPage from '@/pages/CuadresPorUsuarioPage';
import ChequeoGastosPage from '@/pages/ChequeoGastosPage';
import GastosPorUsuarioPage from '@/pages/GastosPorUsuarioPage';
import AgregarGastos from '@/pages/AgregarGastosPage';
import AdminCajerosPage from '@/pages/AdminCajerosPage';
import ComisionesPorTurnoPage from '@/pages/ComisionesPorTurnoPage';
import ComisionesEspecialesPage from '@/pages/ComisionesEspecialesPage';
import VisualizarGastosFarmaciaPage from '@/pages/VisualizarGastosFarmaciaPage';
import VisualizarCuadresPage from '@/pages/VisualizarCuadresPage';
import AgregarInventarioPage from '@/pages/AgregarInventarioPage';
import VisualizarInventariosPage from '@/pages/VisualizarInventariosPage';
import RetiroPage from '@/pages/RetiroPage';
import VisualizarCuentasPorPagarPage from '@/pages/cuentasPorPagar/visualizarCuentas/VisualizarCuentasPorPagarPage';
import VerificacionCuentasPorPagarPage from '@/pages/cuentasPorPagar/verificacionCuentas/VerificacionCuentasPorPagarPage';
import CuentasPorPagarPage from '@/pages/cuentasPorPagar/agregarCuentas/CuentasPorPagarPage';
import GastosCuentasCuadresPorFarmaciaPage from '@/pages/GastosCuentasCuadresPorFarmaciaPage';
import ValesPorFarmaciaPage from '@/pages/vales/ValesPorFarmaciaPage';
import VisualizarPagos from '@/pages/pagosCPP/VisualizarPagos';

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
            path="/gastoscxc-cuadres"
            element={
                <PermissionRoute permiso="agregar_cuadre">
                    <GastosCuentasCuadresPorFarmaciaPage />
                </PermissionRoute>
            }
        />
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
            path="/ventatotal"
            element={
                <PermissionRoute permiso="ver_ventas_totales">
                    <TotalGeneralFarmaciasPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/cuadresporfarmacia"
            element={
                <PermissionRoute permiso="agregar_cuadre">
                    <CuadresPorUsuarioPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/agregargastos"
            element={
                <PermissionRoute permiso="agregar_cuadre">
                    <AgregarGastos />
                </PermissionRoute>
            }
        />
        <Route
            path="/verificaciongastos"
            element={
                <PermissionRoute permiso="verificar_gastos">
                    <ChequeoGastosPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/gastosporusuario"
            element={
                <PermissionRoute permiso="agregar_cuadre">
                    <GastosPorUsuarioPage />
                </PermissionRoute>
            }
        />
        <Route path="*" element={<NotFoundPage />} />
        <Route
            path="/cajeros"
            element={
                <PermissionRoute permiso="cajeros">
                    <AdminCajerosPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/comisiones"
            element={
                <PermissionRoute permiso="comisiones">
                    <ComisionesPorTurnoPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/comisionesgenerales"
            element={
                <PermissionRoute permiso="comisiones">
                    <ComisionesEspecialesPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/cuentasporpagar"
            element={
                <PermissionRoute permiso="agregar_cuadre">
                    <CuentasPorPagarPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/vercuentasporpagar"
            element={
                <PermissionRoute permiso="verificar_gastos">
                    <VisualizarCuentasPorPagarPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/vergastos"
            element={
                <PermissionRoute permiso="verificar_gastos">
                    <VisualizarGastosFarmaciaPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/visualizarcuadres"
            element={
                <PermissionRoute permiso="ver_cuadres_dia">
                    <VisualizarCuadresPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/agregarinventariocosto"
            element={
                <PermissionRoute permiso="acceso_admin">
                    <AgregarInventarioPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/verinventarios"
            element={
                <PermissionRoute permiso="acceso_admin">
                    <VisualizarInventariosPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/retiros"
            element={
                <PermissionRoute permiso="acceso_admin">
                    <RetiroPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/verificacioncuentasporpagar"
            element={
                <PermissionRoute permiso="verificar_gastos">
                    <VerificacionCuentasPorPagarPage />
                </PermissionRoute>
            }
        />
        <Route
            path="/pagoscpp"
            element={
                <PermissionRoute permiso="verificar_gastos">
                    <VisualizarPagos />
                </PermissionRoute>
            }
        />
        <Route
            path="/valesporfarmacia"
            element={
                <PermissionRoute permiso="ver_cuadres_dia">
                    <ValesPorFarmaciaPage />
                </PermissionRoute>
            }
        />
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
);

export default AppRouter;
