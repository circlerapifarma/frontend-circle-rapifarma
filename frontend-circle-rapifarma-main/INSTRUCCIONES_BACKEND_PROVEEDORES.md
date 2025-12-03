# Instrucciones para Implementar el Backend de Proveedores

Este documento contiene las instrucciones detalladas para implementar el módulo de proveedores en el backend.

## 📋 Estructura de Datos

### Modelo de Proveedor

El modelo debe tener los siguientes campos:

```python
{
    "_id": ObjectId,  # ID único generado por MongoDB
    "nombreJuridico": str,  # Nombre jurídico de la empresa (requerido)
    "rif": str,  # RIF del proveedor (requerido, único)
    "direccion": str,  # Dirección completa (requerido)
    "numeroTelefono": str,  # Número de teléfono (requerido)
    "diasCredito": int,  # Días de crédito que otorga el proveedor (requerido, >= 0)
    "descuentosComerciales": float,  # Porcentaje de descuentos comerciales (0-100)
    "descuentosProntoPago": float,  # Porcentaje de descuentos por pronto pago (0-100)
    "createdAt": datetime,  # Fecha de creación (opcional pero recomendado)
    "updatedAt": datetime,  # Fecha de última actualización (opcional pero recomendado)
}
```

## 🔌 Endpoints Requeridos

### 1. GET `/proveedores`
**Descripción:** Obtener todos los proveedores registrados.

**Autenticación:** Requerida (Bearer Token)

**Respuesta exitosa (200):**
```json
[
    {
        "_id": "507f1f77bcf86cd799439011",
        "nombreJuridico": "Farmacia ABC, C.A.",
        "rif": "J-12345678-9",
        "direccion": "Av. Principal, Caracas",
        "numeroTelefono": "0412-1234567",
        "diasCredito": 30,
        "descuentosComerciales": 5.5,
        "descuentosProntoPago": 2.0,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
    }
]
```

**Errores:**
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

---

### 2. POST `/proveedores`
**Descripción:** Crear un nuevo proveedor.

**Autenticación:** Requerida (Bearer Token)

**Body (JSON):**
```json
{
    "nombreJuridico": "Farmacia ABC, C.A.",
    "rif": "J-12345678-9",
    "direccion": "Av. Principal, Caracas",
    "numeroTelefono": "0412-1234567",
    "diasCredito": 30,
    "descuentosComerciales": 5.5,
    "descuentosProntoPago": 2.0
}
```

**Validaciones:**
- `nombreJuridico`: Requerido, string no vacío
- `rif`: Requerido, string no vacío, debe ser único
- `direccion`: Requerido, string no vacío
- `numeroTelefono`: Requerido, string no vacío
- `diasCredito`: Requerido, número entero >= 0
- `descuentosComerciales`: Opcional, número entre 0 y 100
- `descuentosProntoPago`: Opcional, número entre 0 y 100

**Respuesta exitosa (201):**
```json
{
    "_id": "507f1f77bcf86cd799439011",
    "nombreJuridico": "Farmacia ABC, C.A.",
    "rif": "J-12345678-9",
    "direccion": "Av. Principal, Caracas",
    "numeroTelefono": "0412-1234567",
    "diasCredito": 30,
    "descuentosComerciales": 5.5,
    "descuentosProntoPago": 2.0,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Errores:**
- `400 Bad Request`: Datos inválidos o faltantes
- `409 Conflict`: El RIF ya existe
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

**Ejemplo de error (400):**
```json
{
    "detail": "El campo 'nombreJuridico' es requerido"
}
```

---

### 3. PATCH `/proveedores/{id}`
**Descripción:** Actualizar un proveedor existente.

**Autenticación:** Requerida (Bearer Token)

**Parámetros de URL:**
- `id`: ID del proveedor (ObjectId de MongoDB)

**Body (JSON):** Todos los campos son opcionales, solo enviar los que se desean actualizar
```json
{
    "nombreJuridico": "Farmacia ABC Actualizada, C.A.",
    "diasCredito": 45,
    "descuentosComerciales": 7.0
}
```

**Validaciones:**
- Si se envía `rif`, debe ser único (no puede duplicar otro proveedor)
- Los valores numéricos deben cumplir las mismas validaciones que en POST

**Respuesta exitosa (200):**
```json
{
    "_id": "507f1f77bcf86cd799439011",
    "nombreJuridico": "Farmacia ABC Actualizada, C.A.",
    "rif": "J-12345678-9",
    "direccion": "Av. Principal, Caracas",
    "numeroTelefono": "0412-1234567",
    "diasCredito": 45,
    "descuentosComerciales": 7.0,
    "descuentosProntoPago": 2.0,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:15:00Z"
}
```

**Errores:**
- `400 Bad Request`: Datos inválidos
- `404 Not Found`: Proveedor no encontrado
- `409 Conflict`: El RIF ya existe (si se intenta cambiar)
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

---

### 4. DELETE `/proveedores/{id}`
**Descripción:** Eliminar un proveedor.

**Autenticación:** Requerida (Bearer Token)

**Parámetros de URL:**
- `id`: ID del proveedor (ObjectId de MongoDB)

**Respuesta exitosa (200 o 204):**
- Código 200 con mensaje de confirmación, o 204 No Content

**Errores:**
- `404 Not Found`: Proveedor no encontrado
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

**Ejemplo de respuesta (200):**
```json
{
    "message": "Proveedor eliminado exitosamente"
}
```

---

## 🔒 Permisos

Todos los endpoints requieren autenticación mediante Bearer Token. Se recomienda que solo usuarios con permiso `acceso_admin` puedan acceder a estos endpoints, aunque esto puede variar según la política de seguridad de tu aplicación.

---

## 💾 Base de Datos

### MongoDB - Esquema de Colección

**Nombre de la colección:** `proveedores`

**Índices recomendados:**
```javascript
// Índice único para RIF
db.proveedores.createIndex({ "rif": 1 }, { unique: true })

// Índice para búsquedas por nombre
db.proveedores.createIndex({ "nombreJuridico": 1 })
```

### Ejemplo de Documento en MongoDB

```json
{
    "_id": ObjectId("507f1f77bcf86cd799439011"),
    "nombreJuridico": "Farmacia ABC, C.A.",
    "rif": "J-12345678-9",
    "direccion": "Av. Principal, Caracas",
    "numeroTelefono": "0412-1234567",
    "diasCredito": 30,
    "descuentosComerciales": 5.5,
    "descuentosProntoPago": 2.0,
    "createdAt": ISODate("2024-01-15T10:30:00Z"),
    "updatedAt": ISODate("2024-01-15T10:30:00Z")
}
```

---

## 📝 Ejemplo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user  # Tu función de autenticación

router = APIRouter(prefix="/proveedores", tags=["proveedores"])

# Modelos Pydantic
class ProveedorCreate(BaseModel):
    nombreJuridico: str = Field(..., min_length=1)
    rif: str = Field(..., min_length=1)
    direccion: str = Field(..., min_length=1)
    numeroTelefono: str = Field(..., min_length=1)
    diasCredito: int = Field(..., ge=0)
    descuentosComerciales: float = Field(0, ge=0, le=100)
    descuentosProntoPago: float = Field(0, ge=0, le=100)

class ProveedorUpdate(BaseModel):
    nombreJuridico: Optional[str] = Field(None, min_length=1)
    rif: Optional[str] = Field(None, min_length=1)
    direccion: Optional[str] = Field(None, min_length=1)
    numeroTelefono: Optional[str] = Field(None, min_length=1)
    diasCredito: Optional[int] = Field(None, ge=0)
    descuentosComerciales: Optional[float] = Field(None, ge=0, le=100)
    descuentosProntoPago: Optional[float] = Field(None, ge=0, le=100)

class ProveedorResponse(BaseModel):
    _id: str
    nombreJuridico: str
    rif: str
    direccion: str
    numeroTelefono: str
    diasCredito: int
    descuentosComerciales: float
    descuentosProntoPago: float
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Helper para convertir ObjectId a string
def proveedor_helper(proveedor) -> dict:
    return {
        "_id": str(proveedor["_id"]),
        "nombreJuridico": proveedor["nombreJuridico"],
        "rif": proveedor["rif"],
        "direccion": proveedor["direccion"],
        "numeroTelefono": proveedor["numeroTelefono"],
        "diasCredito": proveedor["diasCredito"],
        "descuentosComerciales": proveedor.get("descuentosComerciales", 0),
        "descuentosProntoPago": proveedor.get("descuentosProntoPago", 0),
        "createdAt": proveedor.get("createdAt", datetime.utcnow()),
        "updatedAt": proveedor.get("updatedAt", datetime.utcnow()),
    }

@router.get("", response_model=List[ProveedorResponse])
async def obtener_proveedores(current_user: dict = Depends(get_current_user)):
    """Obtener todos los proveedores"""
    db = get_database()  # Tu función para obtener la conexión a MongoDB
    proveedores = []
    async for proveedor in db.proveedores.find():
        proveedores.append(proveedor_helper(proveedor))
    return proveedores

@router.post("", response_model=ProveedorResponse, status_code=201)
async def crear_proveedor(
    proveedor: ProveedorCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo proveedor"""
    db = get_database()
    
    # Verificar que el RIF no exista
    existing = await db.proveedores.find_one({"rif": proveedor.rif})
    if existing:
        raise HTTPException(status_code=409, detail="El RIF ya existe")
    
    proveedor_dict = proveedor.dict()
    proveedor_dict["createdAt"] = datetime.utcnow()
    proveedor_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.proveedores.insert_one(proveedor_dict)
    nuevo_proveedor = await db.proveedores.find_one({"_id": result.inserted_id})
    
    if not nuevo_proveedor:
        raise HTTPException(status_code=500, detail="Error al crear proveedor")
    
    return proveedor_helper(nuevo_proveedor)

@router.patch("/{proveedor_id}", response_model=ProveedorResponse)
async def actualizar_proveedor(
    proveedor_id: str,
    proveedor: ProveedorUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar un proveedor existente"""
    db = get_database()
    
    # Verificar que el proveedor existe
    existing = await db.proveedores.find_one({"_id": ObjectId(proveedor_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # Si se intenta cambiar el RIF, verificar que no exista
    if proveedor.rif and proveedor.rif != existing["rif"]:
        rif_existing = await db.proveedores.find_one({"rif": proveedor.rif})
        if rif_existing:
            raise HTTPException(status_code=409, detail="El RIF ya existe")
    
    # Actualizar solo los campos proporcionados
    update_data = {k: v for k, v in proveedor.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    
    await db.proveedores.update_one(
        {"_id": ObjectId(proveedor_id)},
        {"$set": update_data}
    )
    
    updated_proveedor = await db.proveedores.find_one({"_id": ObjectId(proveedor_id)})
    return proveedor_helper(updated_proveedor)

@router.delete("/{proveedor_id}")
async def eliminar_proveedor(
    proveedor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un proveedor"""
    db = get_database()
    
    result = await db.proveedores.delete_one({"_id": ObjectId(proveedor_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    return {"message": "Proveedor eliminado exitosamente"}
```

---

## 📝 Ejemplo de Implementación (Node.js/Express)

```javascript
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { authenticateToken } = require('../middleware/auth'); // Tu middleware de autenticación

// GET /proveedores
router.get('/', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const proveedores = await db.collection('proveedores').find({}).toArray();
        const proveedoresFormateados = proveedores.map(p => ({
            ...p,
            _id: p._id.toString()
        }));
        res.json(proveedoresFormateados);
    } catch (error) {
        res.status(500).json({ detail: 'Error al obtener proveedores' });
    }
});

// POST /proveedores
router.post('/', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { nombreJuridico, rif, direccion, numeroTelefono, diasCredito, descuentosComerciales, descuentosProntoPago } = req.body;
        
        // Validaciones
        if (!nombreJuridico || !rif || !direccion || !numeroTelefono || diasCredito === undefined) {
            return res.status(400).json({ detail: 'Campos requeridos faltantes' });
        }
        
        // Verificar RIF único
        const existing = await db.collection('proveedores').findOne({ rif });
        if (existing) {
            return res.status(409).json({ detail: 'El RIF ya existe' });
        }
        
        const nuevoProveedor = {
            nombreJuridico,
            rif,
            direccion,
            numeroTelefono,
            diasCredito: parseInt(diasCredito),
            descuentosComerciales: descuentosComerciales || 0,
            descuentosProntoPago: descuentosProntoPago || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('proveedores').insertOne(nuevoProveedor);
        const proveedorCreado = await db.collection('proveedores').findOne({ _id: result.insertedId });
        
        res.status(201).json({
            ...proveedorCreado,
            _id: proveedorCreado._id.toString()
        });
    } catch (error) {
        res.status(500).json({ detail: 'Error al crear proveedor' });
    }
});

// PATCH /proveedores/:id
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        
        // Verificar que el proveedor existe
        const existing = await db.collection('proveedores').findOne({ _id: new ObjectId(id) });
        if (!existing) {
            return res.status(404).json({ detail: 'Proveedor no encontrado' });
        }
        
        // Si se intenta cambiar el RIF, verificar que no exista
        if (req.body.rif && req.body.rif !== existing.rif) {
            const rifExisting = await db.collection('proveedores').findOne({ rif: req.body.rif });
            if (rifExisting) {
                return res.status(409).json({ detail: 'El RIF ya existe' });
            }
        }
        
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        
        await db.collection('proveedores').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        const proveedorActualizado = await db.collection('proveedores').findOne({ _id: new ObjectId(id) });
        res.json({
            ...proveedorActualizado,
            _id: proveedorActualizado._id.toString()
        });
    } catch (error) {
        res.status(500).json({ detail: 'Error al actualizar proveedor' });
    }
});

// DELETE /proveedores/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        
        const result = await db.collection('proveedores').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ detail: 'Proveedor no encontrado' });
        }
        
        res.json({ message: 'Proveedor eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ detail: 'Error al eliminar proveedor' });
    }
});

module.exports = router;
```

---

## ✅ Checklist de Implementación

- [ ] Crear modelo/esquema de Proveedor en la base de datos
- [ ] Crear índice único para el campo `rif`
- [ ] Implementar endpoint GET `/proveedores`
- [ ] Implementar endpoint POST `/proveedores` con validaciones
- [ ] Implementar endpoint PATCH `/proveedores/{id}`
- [ ] Implementar endpoint DELETE `/proveedores/{id}`
- [ ] Agregar autenticación a todos los endpoints
- [ ] Agregar manejo de errores apropiado
- [ ] Probar todos los endpoints con Postman o similar
- [ ] Verificar que el RIF sea único
- [ ] Verificar validaciones de campos numéricos (0-100 para porcentajes)

---

## 🔍 Notas Adicionales

1. **Validación de RIF**: Aunque no es estrictamente necesario, puedes agregar validación de formato de RIF venezolano (J-12345678-9, G-12345678-9, etc.)

2. **Soft Delete**: Si prefieres no eliminar físicamente los registros, puedes agregar un campo `activo: boolean` y hacer "soft delete"

3. **Historial**: Considera agregar un sistema de historial de cambios si es necesario para auditoría

4. **Búsqueda**: Puedes agregar un endpoint de búsqueda con filtros adicionales si lo necesitas

5. **Paginación**: Para grandes volúmenes de datos, considera agregar paginación al endpoint GET

---

## 📞 Soporte

Si tienes dudas sobre la implementación, revisa el código del frontend en:
- `src/hooks/useProveedores.ts` - Para ver cómo se consumen los endpoints
- `src/pages/ProveedoresPage.tsx` - Para ver la estructura de datos esperada

