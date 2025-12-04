# Instrucciones Frontend - Manejo de Usuarios y Autenticación

## Cambios Implementados

Se ha actualizado el archivo `src/pages/UsuariosAdminPage.tsx` con las siguientes mejoras:

### 1. Endpoint Actualizado
- ✅ Cambiado de `/usuarios` a `/adminusuarios` para el GET
- ✅ Mantiene `/usuarios` para POST y PATCH (crear y actualizar)

### 2. Manejo de Errores 401
- ✅ Verificación de token antes de hacer peticiones
- ✅ Redirección automática al login cuando el token es inválido o expirado
- ✅ Limpieza de localStorage al detectar token inválido

### 3. Validación de Respuestas
- ✅ Verificación de que la respuesta sea un array antes de usar `.map()`
- ✅ Manejo de errores cuando la respuesta no es un array
- ✅ Retorno de array vacío en caso de error para evitar crashes

### 4. Autenticación Mejorada
- ✅ Token incluido en todas las peticiones (GET, POST, PATCH)
- ✅ Verificación de expiración del token antes de hacer peticiones
- ✅ Headers de autenticación correctos en todas las peticiones

## Funciones Implementadas

### `isTokenValid()`
Verifica si el token JWT es válido y no ha expirado:
```typescript
const isTokenValid = (): boolean => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp;
  } catch (e) {
    return false;
  }
};
```

### `redirectToLogin()`
Limpia el localStorage y redirige al login:
```typescript
const redirectToLogin = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "/login";
};
```

### `fetchUsuarios()`
Obtiene la lista de usuarios con manejo completo de errores:
- Verifica token antes de hacer la petición
- Maneja errores 401 con redirección
- Valida que la respuesta sea un array
- Retorna array vacío en caso de error

## Flujo de Autenticación

1. **Antes de cada petición**:
   - Verifica si existe token
   - Verifica si el token no ha expirado
   - Si no es válido, redirige al login

2. **Durante la petición**:
   - Incluye token en header `Authorization: Bearer <token>`
   - Maneja errores de red

3. **Después de la petición**:
   - Si es 401, limpia localStorage y redirige
   - Si es otro error, muestra mensaje de error
   - Valida que la respuesta sea un array antes de usar

## Endpoints Utilizados

### GET `/adminusuarios`
- **Uso**: Obtener lista de usuarios
- **Autenticación**: Requerida (Bearer Token)
- **Response**: Array de usuarios
- **Manejo de errores**: ✅ Implementado

### POST `/usuarios`
- **Uso**: Crear nuevo usuario
- **Autenticación**: Requerida (Bearer Token)
- **Response**: Usuario creado
- **Manejo de errores**: ✅ Implementado

### PATCH `/usuarios/{id}`
- **Uso**: Actualizar usuario existente
- **Autenticación**: Requerida (Bearer Token)
- **Response**: Usuario actualizado
- **Manejo de errores**: ✅ Implementado

## Checklist de Implementación

- [x] Endpoint cambiado a `/adminusuarios` para GET
- [x] Token incluido en todas las peticiones
- [x] Verificación de token antes de peticiones
- [x] Manejo de error 401 con redirección
- [x] Validación de respuesta como array
- [x] Limpieza de localStorage en errores 401
- [x] Mensajes de error apropiados
- [x] Manejo de errores de red

## Pruebas Recomendadas

1. **Token válido**: Debe cargar usuarios correctamente
2. **Token expirado**: Debe redirigir al login
3. **Sin token**: Debe redirigir al login
4. **Error 401**: Debe limpiar localStorage y redirigir
5. **Respuesta no array**: Debe mostrar error y no crashear
6. **Error de red**: Debe mostrar mensaje de error apropiado

## Notas Adicionales

- El endpoint `/adminusuarios` funciona igual que `/usuarios` según el backend
- Se mantiene `/usuarios` para POST y PATCH para mantener compatibilidad
- Todas las peticiones ahora incluyen el token de autenticación
- El manejo de errores es robusto y evita crashes de la aplicación

