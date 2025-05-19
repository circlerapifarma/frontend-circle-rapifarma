import React from "react";
import { Navigate } from "react-router";
import { useUserContext } from "@/context/UserContext";

interface Props {
    permiso: string;
    children: React.ReactNode;
}

const PermissionRoute: React.FC<Props> = ({ permiso, children }) => {
    const { usuario } = useUserContext();
    if (!usuario) return <Navigate to="/login" replace />;
    if (!usuario.permisos.includes(permiso)) return <Navigate to="/" replace />;
    return <>{children}</>;
};

export default PermissionRoute;