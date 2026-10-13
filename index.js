// Importar Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.4/+esm";

// Configuración de Supabase
const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWVqZWVpZWh3ZmtkY2Jwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQwOTYsImV4cCI6MjA2NzE0MDA5Nn0.yDq4eOHujKH2nmg-F-DVnqCHGwdfEmf4Z968KXl1SDc';

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Contraseña simple
const PASSWORD = 'admin123';

// Variables del DOM
const loginSection = document.getElementById('loginSection');
const adminPanel = document.getElementById('adminPanel');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const createForm = document.getElementById('createForm');
const formNameInput = document.getElementById('formName');
const formTypeInput = document.getElementById('formType'); // Selector de tipo de formulario
const minAgeInput = document.getElementById('minAge');
const maxAgeInput = document.getElementById('maxAge');
const formBgInput = document.getElementById('formBgInput');
const formulariosTableBody = document.querySelector('#formulariosTable tbody');

// Elementos para parámetros personalizados dinámicos
const toggleParamsBtn = document.getElementById('toggleParamsBtn');
const customParamsContainer = document.getElementById('customParamsContainer');
const nuevoParamInput = document.getElementById('nuevoParamInput');
const btnAddParam = document.getElementById('btnAddParam');
const customParamsList = document.getElementById('customParamsList');

let formulariosCache = [];
let customParamsArray = [];

// Mostrar / Ocultar sección de parámetros personalizados
if (toggleParamsBtn && customParamsContainer) {
  toggleParamsBtn.addEventListener('click', () => {
    if (customParamsContainer.style.display === 'none') {
      customParamsContainer.style.display = 'block';
      toggleParamsBtn.textContent = '➖ Ocultar casilla personalizada';
      toggleParamsBtn.style.background = '#dc3545';
    } else {
      customParamsContainer.style.display = 'none';
      toggleParamsBtn.textContent = '➕ Agregar casilla personalizada (Opcional)';
      toggleParamsBtn.style.background = '#6c757d';
    }
  });
}

// Control de parámetros personalizados escritos por ti
if (btnAddParam) {
  btnAddParam.addEventListener('click', () => {
    const paramName = nuevoParamInput.value.trim();
    if (!paramName) return;

    if (customParamsArray.includes(paramName)) {
      alert('Esta casilla ya ha sido agregada.');
      return;
    }

    customParamsArray.push(paramName);
    renderCustomParams();
    nuevoParamInput.value = '';
  });
}

function renderCustomParams() {
  if (!customParamsList) return;
  customParamsList.innerHTML = '';
  customParamsArray.forEach((param, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.style.display = 'flex';
    itemDiv.style.justifyContent = 'space-between';
    itemDiv.style.alignItems = 'center';
    itemDiv.style.background = '#fff';
    itemDiv.style.border = '1px solid #ddd';
    itemDiv.style.padding = '6px 10px';
    itemDiv.style.borderRadius = '4px';

    itemDiv.innerHTML = `
      <span style="font-weight: bold; color: #333;">📌 ${param}</span>
      <button type="button" class="remove-param-btn" data-index="${index}" style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 3px 8px; cursor: pointer; width: auto;">Eliminar</button>
    `;
    customParamsList.appendChild(itemDiv);
  });

  document.querySelectorAll('.remove-param-btn').forEach(btn => {
    btn.onclick = (e) => {
      const idx = e.target.getAttribute('data-index');
      customParamsArray.splice(idx, 1);
      renderCustomParams();
    };
  });
}

// Función principal: Cargar formularios
async function cargarFormularios() {
  const { data, error } = await supabase
    .from('formularios')
    .select('id, codigo_form, nombre, tipo_formulario, imagen_url, min_age, max_age')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error cargando formularios:", error);
    formulariosCache = [];
  } else {
    formulariosCache = data.map(f => ({
      db_id: f.id,
      codigo: f.codigo_form,
      nombre: f.nombre,
      tipo_formulario: f.tipo_formulario || 'normal',
      imagenFondoUrl: f.imagen_url || '',
      min_age: f.min_age,
      max_age: f.max_age
    }));
  }

  renderFormularios();
}

// Generar código único para nuevo formulario
function generarCodigoFormulario() {
  return 'FORM' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Renderizar formularios (actualiza tanto la tabla de PC con sus "|" como las tarjetas de móvil limpias)
function renderFormularios() {
  // 1. Rellenar tabla de PC (con las barras '|' originales)
  if (formulariosTableBody) {
    formulariosTableBody.innerHTML = '';
    formulariosCache.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${f.codigo}</td>
        <td>${f.nombre}</td>
        <td>${f.tipo_formulario === 'vip_general' ? 'VIP / General' : 'Normal'}</td>
        <td><img src="${f.imagenFondoUrl}" alt="Fondo" class="thumb" /></td>
        <td>
          <a href="form.html?id=${f.codigo}" target="_blank">Formulario Público</a> |
          <a href="respuestas.html?id=${f.codigo}" target="_blank">Lista de Datos</a> |
          <a href="referencia.html?id_formulario=${f.codigo}" target="_blank">Formulario de Referencia</a> |
          <button class="delete-btn" onclick="borrarFormulario('${f.codigo}', '${f.db_id}')">Borrar</button>
        </td>
      `;
      formulariosTableBody.appendChild(tr);
    });
  }

  // 2. Rellenar tarjetas para Móvil (limpias, ordenadas y sin barras)
  const mobileContainer = document.getElementById('mobileCardsContainer');
  if (mobileContainer) {
    mobileContainer.innerHTML = '';
    formulariosCache.forEach(f => {
      const card = document.createElement('div');
      card.className = 'm-card';
      card.innerHTML = `
        <div class="m-card-row"><span class="m-card-label">Código:</span> <span>${f.codigo}</span></div>
        <div class="m-card-row"><span class="m-card-label">Nombre:</span> <span>${f.nombre}</span></div>
        <div class="m-card-row"><span class="m-card-label">Tipo:</span> <span>${f.tipo_formulario === 'vip_general' ? 'VIP / General' : 'Normal'}</span></div>
        <div class="m-card-row"><span class="m-card-label">Imagen:</span> <img src="${f.imagenFondoUrl}" alt="Fondo" class="thumb" /></div>
        <div style="font-weight: bold; color: #007bff; margin-top: 4px;">Acciones:</div>
        <div class="m-card-actions">
          <a href="form.html?id=${f.codigo}" target="_blank">Formulario Público</a>
          <a href="respuestas.html?id=${f.codigo}" target="_blank">Lista de Datos</a>
          <a href="referencia.html?id_formulario=${f.codigo}" target="_blank">Formulario de Referencia</a>
          <button class="delete-btn" onclick="borrarFormulario('${f.codigo}', '${f.db_id}')">Borrar</button>
        </div>
      `;
      mobileContainer.appendChild(card);
    });
  }
}

// Evento: Crear formulario
createForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = formNameInput.value.trim();
  const tipoFormulario = formTypeInput ? formTypeInput.value : 'normal';
  if (!nombre) return alert('Ingrese un nombre para el formulario');

  let minAge = null;
  const minAgeValue = minAgeInput.value.trim();
  if (minAgeValue) {
    minAge = parseInt(minAgeValue);
    if (isNaN(minAge) || minAge < 0) return alert('Edad mínima inválida.');
  }

  let maxAge = null;
  const maxAgeValue = maxAgeInput.value.trim();
  if (maxAgeValue) {
    maxAge = parseInt(maxAgeValue);
    if (isNaN(maxAge) || maxAge < 0) return alert('Edad máxima inválida.');
  }

  if (minAge !== null && maxAge !== null && minAge > maxAge) {
    return alert('La edad mínima no puede ser mayor que la edad máxima.');
  }

  const file = formBgInput.files.length > 0 ? formBgInput.files[0] : null;
  let imagenUrl = null;

  if (file) {
    const filePath = `public/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('form-backgrounds')
      .upload(filePath, file);

    if (uploadError) {
      alert('Error al subir imagen. El formulario se creará sin imagen.');
    } else {
      const { data } = supabase.storage.from('form-backgrounds').getPublicUrl(filePath);
      imagenUrl = data.publicUrl;
    }
  }

  const codigoForm = generarCodigoFormulario();
  const nuevoFormulario = {
    codigo_form: codigoForm,
    nombre,
    tipo_formulario: tipoFormulario,
    min_age: minAge,
    max_age: maxAge,
    imagen_url: imagenUrl,
    parametros_personalizados: customParamsArray
  };

  const { error: insertError } = await supabase.from('formularios').insert([nuevoFormulario]);

  if (insertError) {
    console.error("Error al crear formulario:", insertError);
    alert(`No se pudo crear el formulario: ${insertError.message}`);
    return;
  }

  alert(`✅ Formulario creado: ${codigoForm}`);
  customParamsArray = [];
  renderCustomParams();
  if (customParamsContainer) customParamsContainer.style.display = 'none';
  if (toggleParamsBtn) {
    toggleParamsBtn.textContent = '➕ Agregar casilla personalizada (Opcional)';
    toggleParamsBtn.style.background = '#6c757d';
  }
  await cargarFormularios();
  createForm.reset();
});

// Función: Borrar formulario y todos sus datos relacionados
window.borrarFormulario = async function(codigoForm, db_id) {
  if (!confirm(`¿Seguro que quieres borrar el formulario "${codigoForm}" y todos sus datos?`)) return;

  try {
    const { error: deleteRespuestasError } = await supabase
      .from('respuestas')
      .delete()
      .eq('formulario_id', db_id);

    if (deleteRespuestasError) throw deleteRespuestasError;

    const { error: deleteContadorError } = await supabase
      .from('contadores_formularios')
      .delete()
      .eq('formulario_id', db_id);

    if (deleteContadorError && deleteContadorError.code !== 'PGRST116') {
      throw deleteContadorError;
    }

    const { error: deleteReferenciasError } = await supabase
      .from('referencias_usos')
      .delete()
      .eq('formulario_id', db_id);

    if (deleteReferenciasError && deleteReferenciasError.code !== 'PGRST116') {
      throw deleteReferenciasError;
    }

    const { data: formData, error: fetchImageError } = await supabase
      .from('formularios')
      .select('imagen_url')
      .eq('id', db_id)
      .single();

    if (fetchImageError && fetchImageError.code !== 'PGRST116') {
      throw fetchImageError;
    }

    if (formData?.imagen_url) {
      const imagePath = formData.imagen_url.split('/').slice(-2).join('/');
      const { error: deleteImageError } = await supabase.storage
        .from('form-backgrounds')
        .remove([imagePath]);
      if (deleteImageError && deleteImageError.statusCode !== '404' && !deleteImageError.message.includes("Object not found")) {
          console.warn("Advertencia al borrar imagen de Supabase Storage:", deleteImageError);
      }
    }

    const { error: deleteFormularioError } = await supabase
      .from('formularios')
      .delete()
      .eq('id', db_id);

    if (deleteFormularioError) throw deleteFormularioError;

    alert(`✅ Formulario "${codigoForm}" y todos sus datos han sido eliminados.`);
    await cargarFormularios();

  } catch (error) {
    console.error("Error al borrar formulario o datos relacionados:", error);
    alert(`❌ Error al borrar formulario: ${error.message}`);
  }
};

// Evento: Login
loginBtn.addEventListener('click', () => {
  if (passwordInput.value === PASSWORD) {
    loginError.style.display = 'none';
    loginSection.style.display = 'none';
    adminPanel.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
    cargarFormularios();
  } else {
    loginError.style.display = 'block';
  }
});

// Evento: Logout
logoutBtn.addEventListener('click', () => {
  loginSection.style.display = 'block';
  adminPanel.style.display = 'none';
  logoutBtn.style.display = 'none';
  passwordInput.value = '';
  loginError.style.display = 'none';
  formulariosCache = [];
  renderFormularios();
});
