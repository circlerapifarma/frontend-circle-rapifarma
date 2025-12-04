# Instrucciones Backend - Eliminar Inventario

## Endpoint: DELETE `/inventarios/{id}`

Este endpoint permite eliminar un inventario específico por su ID.

### Parámetros de Ruta

- `id` (string, requerido): ID del inventario a eliminar

### Headers Requeridos

```
Authorization: Bearer <token>
```

### Ejemplo de Request

```
DELETE /inventarios/507f1f77bcf86cd799439011
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Exitosa (200 OK)

```json
{
  "message": "Inventario eliminado correctamente",
  "id": "507f1f77bcf86cd799439011"
}
```

### Response de Error (404 Not Found)

```json
{
  "detail": "Inventario no encontrado"
}
```

### Response de Error (401 Unauthorized)

```json
{
  "detail": "No autorizado"
}
```

### Response de Error (403 Forbidden)

```json
{
  "detail": "No tiene permisos para eliminar inventarios"
}
```

### Validaciones Requeridas

1. **Autenticación**: El usuario debe estar autenticado (token válido)
2. **Autorización**: Se recomienda verificar que el usuario tenga permisos para eliminar inventarios (opcional, según tu lógica de negocio)
3. **Existencia**: El inventario con el ID proporcionado debe existir en la base de datos

### Ejemplo de Implementación (FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

router = APIRouter()

@router.delete("/inventarios/{id}")
async def eliminar_inventario(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    # Validar que el ID sea un ObjectId válido (MongoDB)
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=400,
            detail="ID de inventario inválido"
        )
    
    # Buscar el inventario
    inventario = await db.inventarios.find_one({"_id": ObjectId(id)})
    if not inventario:
        raise HTTPException(
            status_code=404,
            detail="Inventario no encontrado"
        )
    
    # Opcional: Verificar permisos
    # if not current_user.get("puede_eliminar_inventarios"):
    #     raise HTTPException(
    #         status_code=403,
    #         detail="No tiene permisos para eliminar inventarios"
    #     )
    
    # Eliminar el inventario
    result = await db.inventarios.delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Inventario no encontrado"
        )
    
    return {
        "message": "Inventario eliminado correctamente",
        "id": id
    }
```

### Ejemplo de Implementación (Node.js/Express)

```javascript
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

router.delete('/inventarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ detail: 'ID de inventario inválido' });
    }
    
    // Buscar el inventario
    const inventario = await Inventario.findById(id);
    if (!inventario) {
      return res.status(404).json({ detail: 'Inventario no encontrado' });
    }
    
    // Opcional: Verificar permisos
    // if (!req.user.puedeEliminarInventarios) {
    //   return res.status(403).json({ detail: 'No tiene permisos para eliminar inventarios' });
    // }
    
    // Eliminar el inventario
    await Inventario.findByIdAndDelete(id);
    
    res.json({
      message: 'Inventario eliminado correctamente',
      id: id
    });
  } catch (error) {
    res.status(500).json({ detail: 'Error al eliminar inventario: ' + error.message });
  }
});

module.exports = router;
```

### Notas Importantes

1. **Cascada**: Si el inventario tiene relaciones con otros documentos (por ejemplo, items de inventario asociados), decide si:
   - Eliminar también los items relacionados (cascada)
   - Solo eliminar el inventario principal
   - Rechazar la eliminación si hay items relacionados

2. **Soft Delete**: Como alternativa, puedes implementar "soft delete" cambiando el estado a "eliminado" en lugar de borrar físicamente el documento:

```python
# Soft delete
await db.inventarios.update_one(
    {"_id": ObjectId(id)},
    {"$set": {"estado": "eliminado", "fechaEliminacion": datetime.utcnow()}}
)
```

3. **Auditoría**: Considera registrar quién eliminó el inventario y cuándo:

```python
await db.inventarios.update_one(
    {"_id": ObjectId(id)},
    {
        "$set": {
            "estado": "eliminado",
            "fechaEliminacion": datetime.utcnow(),
            "eliminadoPor": current_user["correo"]
        }
    }
)
```

4. **Transacciones**: Si eliminas el inventario y sus items relacionados, usa transacciones para asegurar atomicidad.

### Estructura de Base de Datos

El inventario debe tener al menos:
- `_id`: ObjectId único
- Otros campos según tu modelo actual

Si implementas soft delete, agrega:
- `estado`: "activo" | "inactivo" | "eliminado"
- `fechaEliminacion`: Date (opcional)
- `eliminadoPor`: String (correo del usuario, opcional)

