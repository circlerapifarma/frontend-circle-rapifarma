import React from 'react';

const AdminPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-slate-900 to-green-800 py-8 px-4">
            <div className="w-full max-w-4xl mb-8">
                <h1 className="text-5xl font-extrabold text-center text-white mb-4 drop-shadow-lg tracking-tight">Gestion Administrativa</h1>
                <p className="text-center text-gray-100 mb-6 text-lg">Bienvenido al panel de administración. Aquí puedes gestionar las operaciones de la farmacia.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
                <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <span className="material-icons text-6xl text-blue-500 mb-4">store</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Gestión de Farmacias</h2>
                    <p className="text-gray-600 text-center">Administra las farmacias y sus datos operativos.</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <span className="material-icons text-6xl text-green-500 mb-4">attach_money</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Gestión de Ventas</h2>
                    <p className="text-gray-600 text-center">Consulta y gestiona las ventas realizadas.</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <span className="material-icons text-6xl text-red-500 mb-4">report</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Reportes</h2>
                    <p className="text-gray-600 text-center">Genera reportes detallados de las operaciones.</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <span className="material-icons text-6xl text-yellow-500 mb-4">settings</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Configuración</h2>
                    <p className="text-gray-600 text-center">Ajusta las configuraciones del sistema.</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <span className="material-icons text-6xl text-purple-500 mb-4">group</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Usuarios</h2>
                    <p className="text-gray-600 text-center">Gestiona los usuarios y sus permisos.</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <span className="material-icons text-6xl text-teal-500 mb-4">help</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Soporte</h2>
                    <p className="text-gray-600 text-center">Accede a la ayuda y soporte técnico.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;