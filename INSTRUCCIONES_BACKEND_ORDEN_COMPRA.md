# Instrucciones para Implementar el Backend de Orden de Compra (Opcional)

Este documento contiene las instrucciones **OPCIONALES** para implementar persistencia de órdenes de compra en el backend. La funcionalidad actual del frontend funciona completamente sin backend (usa localStorage), pero estos endpoints permitirían guardar las órdenes en el servidor para mayor persistencia y acceso desde múltiples dispositivos.

## ⚠️ Nota Importante

**La funcionalidad de Orden de Compra funciona completamente en el frontend sin necesidad de backend.** Los endpoints descritos aquí son **opcionales** y solo necesarios si deseas:
- Guardar órdenes de compra en el servidor
- Acceder a órdenes desde múltiples dispositivos
- Mantener un historial de órdenes de compra
- Compartir órdenes entre usuarios

Si no necesitas estas funcionalidades, **NO es necesario implementar estos endpoints**.

---

## 📋 Estructura de Datos

### Modelo de Orden de Compra

El modelo debe tener los siguientes campos:

```python
{
    "_id": ObjectId,  # ID único generado por MongoDB
    "usuarioCorreo": str,  # Correo del usuario que creó la orden (requerido)
    "farmacia": str,  # ID de la farmacia (requerido)
    "farmaciaNombre": str,  # Nombre de la farmacia (requerido)
    "items": [  # Array de items de la orden
        {
            "listaId": str,  # ID de la lista de precios
            "codigo": str,  # Código del producto
            "descripcion": str,  # Descripción del producto
            "laboratorio": str,  # Laboratorio
            "precio": float,  # Precio original
            "descuento": float,  # Descuento del Excel (%)
            "precioNeto": float,  # Precio neto final
            "proveedorId": str,  # ID del proveedor
            "proveedorNombre": str,  # Nombre del proveedor
            "cantidad": int,  # Cantidad solicitada
            "fechaVencimiento": datetime | null,  # Fecha de vencimiento (opcional)
        }
    ],
    "total": float,  # Total de la orden
    "estado": str,  # Estado de la orden: "borrador", "enviada", "recibida", "cancelada"
    "fechaCreacion": datetime,  # Fecha de creación
    "fechaActualizacion": datetime,  # Fecha de última actualización
    "fechaEnvio": datetime | null,  # Fecha en que se envió la orden (opcional)
    "notas": str,  # Notas adicionales (opcional)
}
```

### Índices Recomendados

```javascript
// Índice para búsquedas por usuario
db.ordenes_compra.createIndex({ "usuarioCorreo": 1, "fechaCreacion": -1 })

// Índice para búsquedas por farmacia
db.ordenes_compra.createIndex({ "farmacia": 1, "fechaCreacion": -1 })

// Índice para búsquedas por estado
db.ordenes_compra.createIndex({ "estado": 1, "fechaCreacion": -1 })
```

---

## 🔌 Endpoints Opcionales

### 1. POST `/ordenes-compra`

**Descripción:** Crear o actualizar una orden de compra.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Request Body (JSON):**
```json
{
    "farmacia": "01",
    "farmaciaNombre": "Santa Elena",
    "items": [
        {
            "listaId": "507f1f77bcf86cd799439011",
            "codigo": "PROD001",
            "descripcion": "Paracetamol 500mg",
            "laboratorio": "Laboratorio XYZ",
            "precio": 2.50,
            "descuento": 5.5,
            "precioNeto": 2.36,
            "proveedorId": "507f1f77bcf86cd799439012",
            "proveedorNombre": "Farmacia ABC, C.A.",
            "cantidad": 10,
            "fechaVencimiento": "2024-12-31T00:00:00Z"
        }
    ],
    "notas": "Orden urgente"
}
```

**Validaciones:**
- `farmacia`: Requerido, debe ser un ID válido de farmacia
- `items`: Requerido, array con al menos un item
- Cada item debe tener todos los campos requeridos
- `total` se calcula automáticamente: suma de (precioNeto * cantidad) de todos los items

**Respuesta exitosa (200 o 201):**
```json
{
    "_id": "507f1f77bcf86cd799439020",
    "usuarioCorreo": "usuario@ejemplo.com",
    "farmacia": "01",
    "farmaciaNombre": "Santa Elena",
    "items": [...],
    "total": 23.60,
    "estado": "borrador",
    "fechaCreacion": "2024-01-15T10:30:00Z",
    "fechaActualizacion": "2024-01-15T10:30:00Z",
    "fechaEnvio": null,
    "notas": "Orden urgente"
}
```

---

### 2. GET `/ordenes-compra`

**Descripción:** Obtener todas las órdenes de compra del usuario actual.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Query Parameters (todos opcionales):**
- `farmacia`: Filtrar por farmacia
- `estado`: Filtrar por estado ("borrador", "enviada", "recibida", "cancelada")
- `fechaInicio`: Filtrar desde fecha (ISO string)
- `fechaFin`: Filtrar hasta fecha (ISO string)

**Respuesta exitosa (200):**
```json
[
    {
        "_id": "507f1f77bcf86cd799439020",
        "usuarioCorreo": "usuario@ejemplo.com",
        "farmacia": "01",
        "farmaciaNombre": "Santa Elena",
        "items": [...],
        "total": 23.60,
        "estado": "borrador",
        "fechaCreacion": "2024-01-15T10:30:00Z",
        "fechaActualizacion": "2024-01-15T10:30:00Z",
        "fechaEnvio": null,
        "notas": "Orden urgente"
    }
]
```

---

### 3. GET `/ordenes-compra/{id}`

**Descripción:** Obtener una orden de compra específica.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Parámetros de URL:**
- `id`: ID de la orden de compra (ObjectId de MongoDB)

**Respuesta exitosa (200):**
```json
{
    "_id": "507f1f77bcf86cd799439020",
    "usuarioCorreo": "usuario@ejemplo.com",
    "farmacia": "01",
    "farmaciaNombre": "Santa Elena",
    "items": [...],
    "total": 23.60,
    "estado": "borrador",
    "fechaCreacion": "2024-01-15T10:30:00Z",
    "fechaActualizacion": "2024-01-15T10:30:00Z",
    "fechaEnvio": null,
    "notas": "Orden urgente"
}
```

---

### 4. PATCH `/ordenes-compra/{id}`

**Descripción:** Actualizar una orden de compra existente.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Parámetros de URL:**
- `id`: ID de la orden de compra (ObjectId de MongoDB)

**Request Body (JSON):** Todos los campos son opcionales
```json
{
    "items": [...],  # Actualizar items
    "estado": "enviada",  # Cambiar estado
    "notas": "Notas actualizadas"
}
```

**Validaciones:**
- Solo el usuario que creó la orden puede actualizarla
- Si se actualizan `items`, se recalcula automáticamente el `total`
- Si se cambia el estado a "enviada", se establece `fechaEnvio` automáticamente

**Respuesta exitosa (200):**
```json
{
    "_id": "507f1f77bcf86cd799439020",
    "usuarioCorreo": "usuario@ejemplo.com",
    "farmacia": "01",
    "farmaciaNombre": "Santa Elena",
    "items": [...],
    "total": 25.00,
    "estado": "enviada",
    "fechaCreacion": "2024-01-15T10:30:00Z",
    "fechaActualizacion": "2024-01-15T11:00:00Z",
    "fechaEnvio": "2024-01-15T11:00:00Z",
    "notas": "Notas actualizadas"
}
```

---

### 5. DELETE `/ordenes-compra/{id}`

**Descripción:** Eliminar una orden de compra.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Parámetros de URL:**
- `id`: ID de la orden de compra (ObjectId de MongoDB)

**Validaciones:**
- Solo el usuario que creó la orden puede eliminarla
- No se pueden eliminar órdenes con estado "recibida" (solo cancelar)

**Respuesta exitosa (200):**
```json
{
    "message": "Orden de compra eliminada exitosamente",
    "id": "507f1f77bcf86cd799439020"
}
```

---

## 📝 Ejemplo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user

router = APIRouter(prefix="/ordenes-compra", tags=["ordenes-compra"])

# Modelos Pydantic
class ItemOrdenCompra(BaseModel):
    listaId: str
    codigo: str
    descripcion: str
    laboratorio: str
    precio: float
    descuento: float
    precioNeto: float
    proveedorId: str
    proveedorNombre: str
    cantidad: int
    fechaVencimiento: Optional[datetime] = None

class OrdenCompraCreate(BaseModel):
    farmacia: str
    farmaciaNombre: str
    items: List[ItemOrdenCompra]
    notas: Optional[str] = None

class OrdenCompraUpdate(BaseModel):
    items: Optional[List[ItemOrdenCompra]] = None
    estado: Optional[str] = None
    notas: Optional[str] = None

class OrdenCompraResponse(BaseModel):
    _id: str
    usuarioCorreo: str
    farmacia: str
    farmaciaNombre: str
    items: List[dict]
    total: float
    estado: str
    fechaCreacion: datetime
    fechaActualizacion: datetime
    fechaEnvio: Optional[datetime]
    notas: Optional[str]

# Helper para calcular total
def calcular_total(items: List[ItemOrdenCompra]) -> float:
    return sum(item.precioNeto * item.cantidad for item in items)

# Helper para convertir ObjectId a string
def orden_helper(orden) -> dict:
    return {
        "_id": str(orden["_id"]),
        "usuarioCorreo": orden["usuarioCorreo"],
        "farmacia": orden["farmacia"],
        "farmaciaNombre": orden["farmaciaNombre"],
        "items": orden["items"],
        "total": orden["total"],
        "estado": orden.get("estado", "borrador"),
        "fechaCreacion": orden.get("fechaCreacion", datetime.utcnow()),
        "fechaActualizacion": orden.get("fechaActualizacion", datetime.utcnow()),
        "fechaEnvio": orden.get("fechaEnvio"),
        "notas": orden.get("notas"),
    }

@router.post("", response_model=OrdenCompraResponse, status_code=201)
async def crear_orden_compra(
    orden: OrdenCompraCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear una nueva orden de compra"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    usuario_correo = current_user.get("correo")
    
    # Validar farmacia
    farmacia = await db.farmacias.find_one({"_id": orden.farmacia})
    if not farmacia:
        raise HTTPException(status_code=404, detail="Farmacia no encontrada")
    
    # Validar items
    if not orden.items or len(orden.items) == 0:
        raise HTTPException(status_code=400, detail="La orden debe tener al menos un item")
    
    # Calcular total
    total = calcular_total(orden.items)
    
    # Crear orden
    orden_data = {
        "usuarioCorreo": usuario_correo,
        "farmacia": orden.farmacia,
        "farmaciaNombre": orden.farmaciaNombre,
        "items": [item.dict() for item in orden.items],
        "total": total,
        "estado": "borrador",
        "fechaCreacion": datetime.utcnow(),
        "fechaActualizacion": datetime.utcnow(),
        "fechaEnvio": None,
        "notas": orden.notas,
    }
    
    result = await db.ordenes_compra.insert_one(orden_data)
    nueva_orden = await db.ordenes_compra.find_one({"_id": result.inserted_id})
    
    return orden_helper(nueva_orden)

@router.get("", response_model=List[OrdenCompraResponse])
async def obtener_ordenes_compra(
    farmacia: Optional[str] = None,
    estado: Optional[str] = None,
    fechaInicio: Optional[str] = None,
    fechaFin: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener todas las órdenes de compra del usuario"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    usuario_correo = current_user.get("correo")
    
    # Construir filtro
    filtro = {"usuarioCorreo": usuario_correo}
    
    if farmacia:
        filtro["farmacia"] = farmacia
    if estado:
        filtro["estado"] = estado
    if fechaInicio or fechaFin:
        filtro["fechaCreacion"] = {}
        if fechaInicio:
            filtro["fechaCreacion"]["$gte"] = datetime.fromisoformat(fechaInicio.replace('Z', '+00:00'))
        if fechaFin:
            filtro["fechaCreacion"]["$lte"] = datetime.fromisoformat(fechaFin.replace('Z', '+00:00'))
    
    # Obtener órdenes
    ordenes = []
    async for orden in db.ordenes_compra.find(filtro).sort("fechaCreacion", -1):
        ordenes.append(orden_helper(orden))
    
    return ordenes

@router.get("/{orden_id}", response_model=OrdenCompraResponse)
async def obtener_orden_compra(
    orden_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener una orden de compra específica"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    usuario_correo = current_user.get("correo")
    
    orden = await db.ordenes_compra.find_one({
        "_id": ObjectId(orden_id),
        "usuarioCorreo": usuario_correo
    })
    
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    return orden_helper(orden)

@router.patch("/{orden_id}", response_model=OrdenCompraResponse)
async def actualizar_orden_compra(
    orden_id: str,
    orden_update: OrdenCompraUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar una orden de compra"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    usuario_correo = current_user.get("correo")
    
    # Verificar que la orden existe y pertenece al usuario
    orden_existente = await db.ordenes_compra.find_one({
        "_id": ObjectId(orden_id),
        "usuarioCorreo": usuario_correo
    })
    
    if not orden_existente:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    # No permitir modificar órdenes recibidas
    if orden_existente.get("estado") == "recibida":
        raise HTTPException(status_code=400, detail="No se puede modificar una orden recibida")
    
    # Preparar actualización
    update_data = {"fechaActualizacion": datetime.utcnow()}
    
    if orden_update.items is not None:
        update_data["items"] = [item.dict() for item in orden_update.items]
        update_data["total"] = calcular_total(orden_update.items)
    
    if orden_update.estado:
        update_data["estado"] = orden_update.estado
        # Si se cambia a "enviada", establecer fechaEnvio
        if orden_update.estado == "enviada":
            update_data["fechaEnvio"] = datetime.utcnow()
    
    if orden_update.notas is not None:
        update_data["notas"] = orden_update.notas
    
    # Actualizar
    await db.ordenes_compra.update_one(
        {"_id": ObjectId(orden_id)},
        {"$set": update_data}
    )
    
    orden_actualizada = await db.ordenes_compra.find_one({"_id": ObjectId(orden_id)})
    return orden_helper(orden_actualizada)

@router.delete("/{orden_id}")
async def eliminar_orden_compra(
    orden_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar una orden de compra"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    usuario_correo = current_user.get("correo")
    
    # Verificar que la orden existe y pertenece al usuario
    orden = await db.ordenes_compra.find_one({
        "_id": ObjectId(orden_id),
        "usuarioCorreo": usuario_correo
    })
    
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    # No permitir eliminar órdenes recibidas
    if orden.get("estado") == "recibida":
        raise HTTPException(status_code=400, detail="No se puede eliminar una orden recibida. Debe cancelarla primero.")
    
    # Eliminar
    result = await db.ordenes_compra.delete_one({"_id": ObjectId(orden_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    return {"message": "Orden de compra eliminada exitosamente", "id": orden_id}
```

---

## ✅ Checklist de Implementación (Opcional)

- [ ] Decidir si se necesita persistencia en el backend
- [ ] Crear colección `ordenes_compra` en MongoDB
- [ ] Crear índices recomendados
- [ ] Implementar endpoint POST `/ordenes-compra`
- [ ] Implementar endpoint GET `/ordenes-compra`
- [ ] Implementar endpoint GET `/ordenes-compra/{id}`
- [ ] Implementar endpoint PATCH `/ordenes-compra/{id}`
- [ ] Implementar endpoint DELETE `/ordenes-compra/{id}`
- [ ] Agregar validaciones de permisos
- [ ] Agregar validaciones de propiedad (solo el creador puede modificar)
- [ ] Probar todos los endpoints

---

## 🔍 Notas Adicionales

1. **Estados de Orden:**
   - `borrador`: Orden en creación/edición
   - `enviada`: Orden enviada al proveedor
   - `recibida`: Orden recibida/completada
   - `cancelada`: Orden cancelada

2. **Seguridad:**
   - Solo el usuario que creó la orden puede verla, modificarla o eliminarla
   - Las órdenes recibidas no se pueden modificar ni eliminar (solo cancelar)

3. **Cálculo de Total:**
   - Se calcula automáticamente: `sum(item.precioNeto * item.cantidad)`
   - Se recalcula cada vez que se actualizan los items

4. **Integración con Frontend:**
   - El frontend actual funciona sin estos endpoints
   - Si se implementan, el frontend puede opcionalmente guardar las órdenes en el servidor
   - Se puede mantener localStorage como respaldo/caché local

---

## 📞 Soporte

Si decides implementar estos endpoints, el frontend puede ser actualizado para usar estos endpoints en lugar de solo localStorage, proporcionando mayor persistencia y funcionalidad colaborativa.

