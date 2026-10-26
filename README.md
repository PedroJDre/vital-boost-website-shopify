# Vital Boost 2026 — tema de Shopify

Tema propio (Online Store 2.0) para vitalboost.com.ar. Sin dependencias ni build: lo que está en el repo es lo que sube a Shopify.

## Cómo está conectado
- Este repo está conectado a Shopify por la integración de GitHub: la rama `main` se sincroniza con el tema `vital-boost-website-shopify/main`.
- Los cambios hechos en el editor de temas de Shopify vuelven al repo como commits ("Update from Shopify...").
- Preview local: `shopify theme dev --store yb6chb-5a.myshopify.com`

## Dónde se edita cada cosa (editor de temas → Configuración del tema)
- **Fórmulas**: producto, color, textos y beneficios de Deporte, Belleza y Vitalidad. Se usan en la home, la ficha, el menú y el carrito.
- **Packs y descuentos**: cantidades (1,2,3,6), % de descuento y etiquetas. Solo muestran precios: el descuento real lo aplica Shopify en el carrito ("Descuento por cantidad"). Si cambiás uno, cambiá el otro.
- **Compra**: textos de los botones y mensajes de envío/pago, número de WhatsApp.

## Piezas
- `sections/formula-picker.liquid`: selector de fórmula + pack + compra en la home.
- `snippets/buy-form.liquid`: selector de packs y botones "Comprar ahora" (va directo al checkout) y "Agregar al carrito".
- `sections/reviews.liquid`: reseñas de Judge.me leídas de sus metacampos (sin el widget).
- `assets/theme.js`: carrito lateral, compra rápida, selector, galería, barra fija en mobile.
- `assets/tub-*.webp`: potes recortados sin fondo.

## Apps
- Judge.me y Shopify Inbox: app embeds activos en `config/settings_data.json`.
- Bundler: su widget y su popup se ocultan por CSS (`assets/base.css`); el descuento por cantidad sigue funcionando porque lo aplica Shopify en el carrito.
