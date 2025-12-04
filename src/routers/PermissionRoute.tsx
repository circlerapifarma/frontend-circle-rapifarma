import React from "react";
import { Navigate } from "react-router";

interface Props {
    permiso: string;
    children: React.ReactNode;
}

const PermissionRoute: React.FC<Props> = ({ permiso, children }) => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

    if (!usuario) {
        console.warn("PermissionRoute: No hay usuario en localStorage");
        return <Navigate to="/login" replace />;
    }
    
    if (!usuario.permisos || !usuario.permisos.includes(permiso)) {
        console.warn(`PermissionRoute: Usuario no tiene permiso "${permiso}". Permisos disponibles:`, usuario.permisos);
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default PermissionRoute;