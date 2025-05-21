import React, { useState } from 'react';
import AgregarCuadreModal from '../components/AgregarCuadreModal';

const AgregarCuadrePage: React.FC = () => {
    const [modalOpen, setModalOpen] = useState(true);

    const handleClose = () => setModalOpen(false);

    return (
        <div>
            <h1>Agregar Cuadre</h1>
            <AgregarCuadreModal dia='2025-05-21' farmacia='01' open={modalOpen} onClose={handleClose} />
        </div>
    );
};

export default AgregarCuadrePage;