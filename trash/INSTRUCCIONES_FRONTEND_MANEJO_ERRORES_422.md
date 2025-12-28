# Instrucciones Frontend: Manejo de Errores 422

## Estructura de Respuesta de Error 422

El backend puede retornar errores 422 en dos formatos:

### Formato 1: Array de Errores (Validación de Pydantic)

```json
{
  "detail": [
    {
      "loc": ["body", "tipoMoneda"],
      "msg": "tipoMoneda debe ser 'USD' o 'Bs', recibido: 'EUR'",
      "type": "value_error"
    },
    {
      "loc": ["body", "farmacias"],
      "msg": "Debe seleccionar al menos una farmacia",
      "type": "value_error"
    }
  ]
}
```

### Formato 2: Mensaje Simple (HTTPException)

```json
{
  "detail": "El número de cuenta es requerido"
}
```

## Funciones Helper

### Función `manejarError422()`

```typescript
/**
 * Convierte errores 422 a mensajes legibles para el usuario
 */
export function manejarError422(errorData: any): string {
  if (!errorData || !errorData.detail) {
    return "Error de validación desconocido";
  }

  // Si es un array (Formato 1)
  if (Array.isArray(errorData.detail)) {
    return errorData.detail
      .map((error: any) => {
        // Extraer el nombre del campo del path
        const campo = error.loc && error.loc.length > 0 
          ? error.loc[error.loc.length - 1] 
          : "campo";
        
        // Convertir nombre de campo a formato legible
        const campoLegible = campo
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
        
        return `${campoLegible}: ${error.msg || error.message || "Error de validación"}`;
      })
      .join('\n');
  }

  // Si es un string (Formato 2)
  if (typeof errorData.detail === 'string') {
    return errorData.detail;
  }

  // Si es un objeto con mensaje
  if (errorData.detail.message) {
    return errorData.detail.message;
  }

  return "Error de validación";
}
```

### Función `extraerMensajeError()` (Versión Mejorada)

```typescript
/**
 * Extrae mensaje de error de cualquier formato de respuesta
 */
export async function extraerMensajeError(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    
    // Error 422 (Validación)
    if (response.status === 422) {
      return manejarError422(errorData);
    }

    // Otros errores
    if (errorData.detail) {
      return typeof errorData.detail === 'string' 
        ? errorData.detail 
        : JSON.stringify(errorData.detail);
    }

    if (errorData.message) {
      return errorData.message;
    }

    return `Error ${response.status}: ${response.statusText}`;
  } catch (e) {
    return `Error ${response.status}: ${response.statusText}`;
  }
}
```

## Ejemplo Completo

### Función `crearBanco()` con Manejo de Errores

```typescript
// En useBancos.ts
const crearBanco = async (banco: Omit<Banco, "_id" | "disponible" | "createdAt" | "updatedAt">) => {
  setError(null);
  try {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const bancoToSend = {
      ...banco,
      disponible: 0,
      nombreBanco: banco.nombreBanco,
    };
    delete (bancoToSend as any).disponibleUsd;

    const res = await fetch(`${API_BASE_URL}/bancos`, {
      method: "POST",
      headers,
      body: JSON.stringify(bancoToSend),
    });

    if (!res.ok) {
      // ✅ Usar la función helper para extraer el mensaje
      const mensajeError = await extraerMensajeError(res);
      throw new Error(mensajeError);
    }

    const nuevoBanco = await res.json();
    await fetchBancos();
    return nuevoBanco;
  } catch (err: any) {
    const mensaje = err.message || "Error al crear banco";
    setError(mensaje);
    throw err;
  }
};
```

### Ejemplo en Componente React

```typescript
// En BancosPage.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (formData.farmacias.length === 0) {
    alert("Por favor seleccione al menos una farmacia que utilizará este banco");
    return;
  }
  try {
    const dataToSend = {
      ...formData,
    };
    if (editingBanco && editingBanco._id) {
      await actualizarBanco(editingBanco._id, dataToSend);
    } else {
      await crearBanco(dataToSend);
    }
    handleCloseModal();
    alert("Banco guardado exitosamente");
  } catch (err: any) {
    // ✅ Mostrar mensaje de error legible al usuario
    const mensajeError = err.message || "Error al guardar banco";
    alert(mensajeError);
    console.error("Error al guardar banco:", err);
  }
};
```

## Ejemplos de Respuestas

### Campo Faltante

**Backend retorna:**
```json
{
  "detail": [
    {
      "loc": ["body", "numeroCuenta"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Frontend muestra:**
```
Numero Cuenta: field required
```

### Validación de Tipo

**Backend retorna:**
```json
{
  "detail": [
    {
      "loc": ["body", "tipoMoneda"],
      "msg": "tipoMoneda debe ser 'USD' o 'Bs', recibido: 'EUR'",
      "type": "value_error"
    }
  ]
}
```

**Frontend muestra:**
```
Tipo Moneda: tipoMoneda debe ser 'USD' o 'Bs', recibido: 'EUR'
```

### Error de Validación Personalizado

**Backend retorna:**
```json
{
  "detail": "Debe seleccionar al menos una farmacia"
}
```

**Frontend muestra:**
```
Debe seleccionar al menos una farmacia
```

## Solución Rápida para el Frontend

### ❌ Incorrecto (causa "[object Object]")

```typescript
catch (error) {
  console.error(error);  // Muestra "[object Object]"
  alert(error);  // Muestra "[object Object]"
}
```

### ✅ Correcto

```typescript
catch (error: any) {
  // Si es un error de fetch
  if (error.response) {
    const mensaje = await extraerMensajeError(error.response);
    alert(mensaje);
  } else if (error.message) {
    // Si ya es un Error con mensaje
    alert(error.message);
  } else {
    alert("Error desconocido");
  }
  console.error("Error:", error);
}
```

## Implementación en useBancos.ts

Actualizar todas las funciones que hacen fetch para usar `extraerMensajeError()`:

```typescript
// Helper function
async function extraerMensajeError(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    
    if (response.status === 422) {
      if (Array.isArray(errorData.detail)) {
        return errorData.detail
          .map((e: any) => {
            const campo = e.loc?.[e.loc.length - 1] || "campo";
            const campoLegible = campo
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim();
            return `${campoLegible}: ${e.msg || e.message || "Error"}`;
          })
          .join('\n');
      }
      return typeof errorData.detail === 'string' 
        ? errorData.detail 
        : JSON.stringify(errorData.detail);
    }

    return errorData.detail || errorData.message || `Error ${response.status}`;
  } catch (e) {
    return `Error ${response.status}: ${response.statusText}`;
  }
}

// Usar en todas las funciones
const res = await fetch(...);
if (!res.ok) {
  const mensajeError = await extraerMensajeError(res);
  throw new Error(mensajeError);
}
```

## Checklist de Implementación

- [ ] Crear función `extraerMensajeError()` en `useBancos.ts`
- [ ] Actualizar `crearBanco()` para usar `extraerMensajeError()`
- [ ] Actualizar `actualizarBanco()` para usar `extraerMensajeError()`
- [ ] Actualizar `realizarDeposito()` para usar `extraerMensajeError()`
- [ ] Actualizar `realizarTransferencia()` para usar `extraerMensajeError()`
- [ ] Actualizar `emitirCheque()` para usar `extraerMensajeError()`
- [ ] Actualizar `handleSubmit()` en `BancosPage.tsx` para mostrar errores con `alert()`
- [ ] Probar con diferentes tipos de errores 422

## Notas Importantes

1. **Siempre convertir errores a string**: Nunca mostrar objetos directamente
2. **Manejar ambos formatos**: Array y string en `errorData.detail`
3. **Mensajes legibles**: Convertir nombres de campos a formato legible
4. **Feedback al usuario**: Mostrar errores con `alert()` o componente de UI
5. **Logging**: Mantener `console.error()` para debugging

