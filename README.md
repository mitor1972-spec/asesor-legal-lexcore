# LexMarket / Lexcore

Marketplace de leads legales y ERP para despachos de abogados.

Plataforma SaaS que conecta consultas legales cualificadas con despachos de abogados, integrando un motor de scoring (Lexcore) y un CRM completo de gestión de casos.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Lovable Cloud (Supabase: PostgreSQL + Edge Functions + Auth + Storage)
- **Pagos:** Stripe (Checkout + Webhooks)
- **IA:** OpenAI GPT-4o-mini (extracción, scoring, resúmenes y documentos legales)
- **Mensajería:** Chatwoot (captación de leads vía webhook)

## Funcionalidades clave

- **Marketplace de leads** con compra exclusiva y atómica
- **Motor Lexcore** de valoración automática (0-95) con precio determinista
- **CRM de despacho** con casos, documentos, timeline, KPIs y comisiones
- **Asistente comercial IA** para estrategia de marketing
- **Sistema de roles** (admin, operator, lawfirm_admin, lawfirm_manager, lawfirm_lawyer)
- **Línea de crédito** y reclamaciones de leads con auto-reembolso

## Instalación local

```sh
npm install
npm run dev
```

Las variables de entorno (`.env`) son gestionadas automáticamente por Lovable Cloud. Solo contienen claves públicas (anon key) — las claves privadas se almacenan como secrets en el backend.

## Variables de entorno (públicas)

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

## Seguridad

- Row Level Security (RLS) activado en todas las tablas
- Roles separados en tabla `user_roles` (no en `profiles`)
- Validación JWT en gateway (`verify_jwt`) + en código (`auth.getUser`)
- Webhooks públicos protegidos con tokens dinámicos / firmas
- Datos de contacto enmascarados en marketplace pre-compra

## Despliegue

Producción: [https://market.asesor.legal](https://market.asesor.legal)

Las Edge Functions se despliegan automáticamente al hacer push.
