import React from "react";
import { Navigate } from "react-router";
import { useUserContext } from "@/context/UserContext";

interface Props {
    children: React.ReactNode;
}

const PrivateRoute: React.FC<Props> = ({ children }) => {
    const { usuario } = useUserContext();
    if (!usuario) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

export default PrivateRoute;