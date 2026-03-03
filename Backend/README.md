# Backend

## Variables de entorno
1. Copiar `.env.example` a `.env`.
2. Ajustar credenciales de base de datos y banderas de seguridad.

Variables nuevas relevantes:
- `AUDIT_ENABLED`, `AUDIT_LOG_FILE` para auditoría.
- `CRITICAL_CONFIRMATION_*` para confirmar acciones críticas.
- `BACKUP_*` para respaldos automáticos.

## Seguridad implementada
- RBAC por encabezados de autenticación:
  - `X-User-Id`: identificador del usuario.
  - `X-User-Role`: rol (`PLAYER` o `ADMIN`).
- Acciones administrativas (`POST/PUT/DELETE /api/productos`) requieren rol `ADMIN`.
- Intentos no autorizados se registran en `logs/audit.log`.

## Confirmación de acciones críticas
Las acciones críticas (`POST`, `PUT`, `DELETE` de productos) requieren:
- Header `X-Confirm-Action` con valor configurado en `CRITICAL_CONFIRMATION_VALUE`.

Ejemplo:
```bash
curl -X DELETE http://localhost:3000/api/productos/1 \
  -H "X-User-Id: 10" \
  -H "X-User-Role: ADMIN" \
  -H "X-Confirm-Action: CONFIRM"
```

## Backup y rollback
- Antes de cada operación crítica se crea un backup JSON en `BACKUP_DIR`.
- Si ocurre error tras modificar datos, se ejecuta rollback automático:
  - `create`: elimina el registro creado.
  - `update`: restaura estado previo.
  - `delete`: recrea el registro eliminado.
- Eventos de backup y rollback se auditan.

## Tests
Ejecutar:
```bash
npm test
```

Cobertura principal:
- Acceso por rol (permitido/denegado).
- Jugador bloqueado en acciones admin.
- Confirmación crítica requerida.
- Confirmación válida permite operación.
- Backup previo a cambio significativo.
- Rollback ante error simulado.
