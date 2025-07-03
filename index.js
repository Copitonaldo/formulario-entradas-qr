// Importar Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Configuración de Supabase
const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWVqZWVpZWh3ZmtkY2Jwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQwOTYsImV4cCI6MjA2NzE0MDA5Nn0.yDq4eOHujKH2nmg-F-DVnqCHGwdfEmf4Z968KXl1SDc';

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Contraseña simple
const PASSWORD = 'admin123'; // Esto permanece igual, ya que no es parte de Firebase Auth
const loginSection = document.getElementById('loginSection');
const adminPanel = document.getElementById('adminPanel');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const createForm = document.getElementById('createForm');
const formNameInput = document.getElementById('formName');
const minAgeInput = document.getElementById('minAge');
const maxAgeInput = document.getElementById('maxAge');
const formBgInput = document.getElementById('formBgInput');
const formulariosTableBody = document.querySelector('#formulariosTable tbody');

let formulariosCache = []; // Caché local de formularios para evitar múltiples lecturas si no hay realtime

// TODO: Reemplazar la lógica de Firebase con Supabase
// Escuchar cambios en tiempo real (onValue) se reemplazará por una carga inicial
// y potencialmente suscripciones de Supabase si se desea real-time.

async function cargarFormularios() {
  const { data, error } = await supabase
    .from('formularios')
    .select('id, codigo_form, nombre, imagen_url, min_age, max_age') // Asegúrate que los nombres de columna coincidan
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error cargando formularios desde Supabase:', error);
    formulariosCache = [];
  } else {
    formulariosCache = data.map(f => ({
      db_id: f.id, // Guardamos el id de la BD por si lo necesitamos para borrar/editar
      codigo: f.codigo_form, // Mapeamos a 'codigo' para mantener consistencia con renderFormularios
      nombre: f.nombre,
      imagenFondoUrl: f.imagen_url, // Mapeamos a lo que espera renderFormularios
      min_age: f.min_age, // Aseguramos que estos también se pasen si renderFormularios los necesita
      max_age: f.max_age
    }));
  }
  renderFormularios();
}

function generarCodigoFormulario() {
  // Esta función puede permanecer igual
  return 'FORM' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// La función leerArchivoBase64 ya no será necesaria si subimos el archivo directamente.
// Si se mantiene para previsualización o algo así, puede quedarse.
// Por ahora, la comentaremos ya que la subida a Supabase Storage usará el objeto File directamente.
/*
async function leerArchivoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}
*/

function renderFormularios() {
  formulariosTableBody.innerHTML = '';
  // Usar formulariosCache en lugar de la variable global 'formularios' que venía de Firebase
  formulariosCache.forEach(f => {
    const tr = document.createElement('tr');
    // Ajustar los campos según la estructura de formulariosCache (ej. f.codigo, f.nombre, f.imagenFondoUrl)
    tr.innerHTML = `
      <td>${f.codigo}</td>
      <td>${f.nombre}</td>
      <td><img src="${f.imagenFondoUrl || ''}" alt="Fondo" class="thumb"></td>
      <td>
        <a href="form.html?id=${f.codigo}" target="_blank">Formulario Público</a> |
        <a href="respuestas.html?id=${f.codigo}" target="_blank">Lista de Datos</a> |
        <button class="delete-btn" onclick="borrarFormulario('${f.codigo}', '${f.db_id}')">Borrar</button> 
      </td>
    `;
    // Se añade f.db_id a borrarFormulario para poder usar el ID de Supabase para el borrado.
    formulariosTableBody.appendChild(tr);
  });
}

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = formNameInput.value.trim();
  if (!nombre) return alert('Ingrese un nombre para el formulario');

  const minAgeValue = minAgeInput.value;
  const maxAgeValue = maxAgeInput.value;

  let minAge = null;
  if (minAgeValue && minAgeValue.trim() !== "") {
    minAge = parseInt(minAgeValue);
    if (isNaN(minAge) || minAge < 0) return alert('Edad mínima inválida.');
  }

  let maxAge = null;
  if (maxAgeValue && maxAgeValue.trim() !== "") {
    maxAge = parseInt(maxAgeValue);
    if (isNaN(maxAge) || maxAge < 0) return alert('Edad máxima inválida.');
  }

  if (minAge !== null && maxAge !== null && minAge > maxAge) {
    return alert('La edad mínima no puede ser mayor que la edad máxima.');
  }

  const file = formBgInput.files.length > 0 ? formBgInput.files[0] : null;
  let imagenUrl = null;

  let imagenUrl = null;
  if (file) {
    const fileName = `public/${Date.now()}_${file.name.replace(/\s/g, '_')}`; // Almacenar en una carpeta 'public' dentro del bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('form-backgrounds') // Nombre correcto del bucket
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error subiendo imagen:', uploadError);
      alert('Error al subir la imagen de fondo. El formulario se creará sin imagen.');
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('form-backgrounds')
        .getPublicUrl(fileName);
      imagenUrl = publicUrlData.publicUrl;
    }
  }

  const codigoForm = generarCodigoFormulario();
  const nuevoFormularioSupabase = {
    codigo_form: codigoForm,
    nombre: nombre,
    min_age: minAge,
    max_age: maxAge,
    imagen_url: imagenUrl
  };

  const { data: insertData, error: insertError } = await supabase
    .from('formularios')
    .insert([nuevoFormularioSupabase])
    .select()
    .single(); // .single() si esperas insertar y devolver un solo registro

  if (insertError) {
    console.error('Error creando formulario en Supabase:', insertError);
    alert(`Error al crear el formulario: ${insertError.message}`);
    return;
  }

  if (insertData) {
    alert(`Formulario creado con código ${codigoForm}`);
    // Actualizar la lista de formularios localmente o recargar desde Supabase
    // Opción 1: Recargar todo (más simple)
    await cargarFormularios();
    // Opción 2: Añadir al caché local (más rápido, pero más propenso a inconsistencias si hay fallos)
    // formulariosCache.unshift({
    //   db_id: insertData.id,
    //   codigo: insertData.codigo_form,
    //   nombre: insertData.nombre,
    //   imagenFondoUrl: insertData.imagen_url,
    //   min_age: insertData.min_age,
    //   max_age: insertData.max_age
    // });
    // renderFormularios();
  }
  createForm.reset();
});

// Modificar borrarFormulario para tomar el id de la base de datos si es necesario,
// o seguir usando el codigo_form si es UNIQUE y suficiente.
// Usar el id (UUID) es más directo para Supabase.
window.borrarFormulario = async function(codigoForm, db_id) {
  if (!confirm(`¿Seguro que quieres borrar el formulario ${codigoForm} y todos sus datos?`)) return;

  const { error } = await supabase
    .from('formularios')
    .delete()
    .eq('id', db_id); // Usar el id de la base de datos para el borrado

  if (error) {
    console.error('Error borrando formulario de Supabase:', error);
    alert(`Error al borrar el formulario: ${error.message}`);
  } else {
    alert(`Formulario ${codigoForm} borrado exitosamente.`);
    // Recargar formularios
    await cargarFormularios();
  }
};

loginBtn.addEventListener('click', async () => { 
  if (passwordInput.value === PASSWORD) {
    loginError.style.display = 'none';
    loginSection.style.display = 'none';
    adminPanel.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
    await cargarFormularios(); // Cargar formularios al hacer login
  } else {
    loginError.style.display = 'block';
  }
});

logoutBtn.addEventListener('click', () => {
  loginSection.style.display = 'block';
  adminPanel.style.display = 'none';
  logoutBtn.style.display = 'none';
  passwordInput.value = '';
  loginError.style.display = 'none';
  formulariosCache = []; // Limpiar caché al salir
  renderFormularios(); // Renderizar tabla vacía
});

// Llamada inicial para cargar formularios si el panel de admin es visible por defecto
// (aunque en este caso, está oculto hasta el login, así que no es estrictamente necesario aquí)
// window.addEventListener('DOMContentLoaded', async () => {
//    await cargarFormularios();
// });

// TODOs generales:
// - Implementar las funciones de Supabase comentadas (cargarFormularios, submit de createForm, borrarFormulario).
// - Manejar la subida de imágenes a Supabase Storage (bucket 'form-backgrounds').
// - Decidir estrategia para actualizar la lista de formularios (recarga completa vs. suscripción a cambios).
// - La función 'renderFormularios' ahora usa 'formulariosCache' y espera 'db_id', 'codigo', 'nombre', 'imagenFondoUrl'.
// - 'borrarFormulario' ahora está preparado para recibir 'db_id'.
// - Se eliminó la dependencia de 'onValue' de Firebase.
// - La función 'leerArchivoBase64' se comentó, ya que Supabase Storage maneja Files.
// - El login es local y no necesita cambios de Supabase Auth por ahora.
```
