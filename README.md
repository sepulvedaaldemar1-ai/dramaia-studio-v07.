# DramaIA Studio V0.7 — Storyboard IA

Versión web basada en la interfaz local V0.6. Conecta la generación de storyboard a Gemini desde una función de servidor en Vercel. La clave se lee exclusivamente desde `GEMINI_API_KEY`; nunca se envía al navegador.

## Qué incluye
- `index.html`: interfaz de DramaIA Studio con botón **Generar storyboard con IA**.
- `api/generate-storyboard.js`: endpoint POST para generar entre 5 y 8 planos en JSON.
- `api/health.js`: comprobación básica que solo informa si existe una clave configurada, nunca revela la clave.
- `vercel.json`: configuración de funciones.

## Despliegue desde GitHub y Vercel
1. En GitHub, crea un repositorio nuevo llamado `dramaia-studio-v07`. Si estás en el móvil, puedes usar **Add file → Upload files** para subir los archivos y carpetas de este ZIP. Sube el contenido de esta carpeta, no el ZIP como único archivo.
2. En Vercel, importa ese repositorio como un proyecto nuevo. Framework preset: **Other**; root directory: la raíz del repositorio.
3. Antes de probar la app, abre **Settings → Environment Variables** en Vercel y agrega `GEMINI_API_KEY` con la clave creada en Google AI Studio. No pegues la clave en el HTML, en el chat, ni en GitHub. Añade `GEMINI_MODEL` opcional con valor `gemini-2.5-flash` si quieres fijar el modelo.
4. Guarda las variables y vuelve a desplegar (**Redeploy**) para que las funciones las reciban.
5. Abre `https://TU-DOMINIO/api/health`. La respuesta debe mostrar `"providerKeyConfigured":true`. Esto solo comprueba que Vercel detecta una variable; no garantiza que la cuota o el modelo estén disponibles.
6. Abre la app y entra a **Storyboard**, selecciona un episodio y pulsa **Generar storyboard con IA**. Si ya hay planos de ese episodio, la app pedirá confirmación para reemplazarlos.

## Respaldo de tus episodios anteriores
Los datos del HTML abierto como archivo local no se transfieren automáticamente al sitio desplegado. En la V0.6, usa **Exportar proyecto** y guarda el JSON en un lugar seguro. En la V0.7 desplegada, usa **Importar proyecto** y elige ese JSON. Conserva también el HTML V0.6 original.

## Límites
- Esta versión genera texto de storyboard. **No genera imágenes, clips de vídeo ni el episodio final**; esos proveedores aún deben integrarse por separado.
- El nivel gratuito de Google AI Studio/Gemini está sujeto a cuotas, disponibilidad, límites de uso y condiciones vigentes; no es ilimitado ni garantizado.
- Las funciones de servidor no exponen la clave al frontend y devuelven mensajes de error controlados. No registres ni publiques la clave. Si alguna vez la compartes accidentalmente, revócala y crea otra.
- La primera generación requiere conexión a internet y que Vercel tenga la variable configurada. No se ha realizado una llamada real a Gemini porque no se dispone de tu credencial (y no debes compartirla aquí).
