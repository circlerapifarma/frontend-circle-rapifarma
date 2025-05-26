const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 p-6">
            <h1 className="text-4xl font-bold text-blue-900 mb-4">CIRCLE - Sistema de Gestión de Cuadres de Caja</h1>
            <p className="text-lg text-gray-700 max-w-2xl text-center mb-6">
                Bienvenido al panel principal de CIRCLE. Esta herramienta permite a farmacias gestionar, verificar y analizar los cuadre de caja diarios de manera eficiente y segura.
                Administra ventas, verifica cuadre de caja, consulta reportes por farmacia o por rango de fechas, y mantén el control de sobrantes y faltantes en cada sucursal.
            </p>
            <ul className="text-base text-gray-800 mb-8 list-disc list-inside max-w-xl">
                <li>Agregar y consultar cuadre de caja por farmacia y día.</li>
                <li>Verificar y aprobar cuadre de caja pendientes.</li>
                <li>Visualizar reportes de ventas mensuales y por rango de días.</li>
                <li>Filtrar y analizar sobrantes/faltantes por sucursal.</li>
                <li>Acceso seguro y controlado para administradores y cajeros.</li>
            </ul>
        </div>
    );
};

export default HomePage;