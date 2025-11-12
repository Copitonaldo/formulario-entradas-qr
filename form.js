// Importar Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Configuración de Supabase
const SUPABASE_URL = 'https://zopnkmqythglllxjkgfh.supabase.co'; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY'; // Reemplaza con tu ANON KEY
// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables del DOM
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id'); // Este es el 'codigo_form' en Supabase
const formTitleElement = document.getElementById('formTitle');
const formData = document.getElementById('formData');
const inputNombre = document.getElementById('nombre');
const inputCedula = document.getElementById('cedula');
const inputEdad = document.getElementById('edad');
const inputNumero = document.getElementById('numero');
const inputCorreo = document.getElementById('correo');
const inputReferencia = document.getElementById('referencia');
const errorMsg = document.getElementById('errorMsg');
const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confCedula');
const confEdad = document.getElementById('confEdad');
const confNumero = document.getElementById('confNumero');
const confCorreo = document.getElementById('confCorreo');
const confReferencia = document.getElementById('confReferencia');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnCorregir = document.getElementById('btnCorregir');
const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outNumero = document.getElementById('outNumero');
const outCorreo = document.getElementById('outCorreo');
const outCodigo = document.getElementById('outCodigo');
const outReferencia = document.getElementById('outReferencia');
const outReferenciaContenedor = document.getElementById('outReferenciaContenedor');
const codigoQR = document.getElementById('codigoQR');
const qrCanvas = document.getElementById('qrCanvas');
const entradaGenerada = document.getElementById('entradaGenerada');
const ticketBg = document.getElementById('ticketBg');
const guardarBtn = document.getElementById('guardarBtn');

let currentMinAge = null;
let currentMaxAge = null;
let currentFormDbId = null;
let isSubmitting = false;

// --- Carga de datos del formulario ---
async function cargarDatosFormulario() {
  if (!formId) return;
  const { data: formDataResult, error: formError } = await supabase
    .from('formularios')
    .select('id, nombre, imagen_url, min_age, max_age')
    .eq('codigo_form', formId)
    .single();

  if (formError) {
    console.error("Error al cargar datos del formulario desde Supabase:", formError);
    if (formTitleElement) formTitleElement.textContent = 'Error al cargar formulario';
    if (ticketBg) ticketBg.style.display = 'none';
    if (formData) formData.style.display = 'none';
    errorMsg.innerHTML = '<b>Error:</b> No se pudo cargar la información del formulario. Intente más tarde.';
    errorMsg.style.display = 'block';
    return;
  }

  if (formDataResult) {
    currentFormDbId = formDataResult.id;
    if (formTitleElement) {
      formTitleElement.textContent = `Formulario: ${formDataResult.nombre || formId}`;
    }
    if (ticketBg && formDataResult.imagen_url) {
      ticketBg.src = formDataResult.imagen_url;
      ticketBg.style.display = 'block';
    } else if (ticketBg) {
      ticketBg.style.display = 'none';
    }
    currentMinAge = formDataResult.min_age !== undefined ? formDataResult.min_age : null;
    currentMaxAge = formDataResult.max_age !== undefined ? formDataResult.max_age : null;
  } else {
    if (formTitleElement) formTitleElement.textContent = 'Formulario no encontrado';
    if (ticketBg) ticketBg.style.display = 'none';
    console.warn(`Formulario con codigo_form ${formId} no encontrado en Supabase.`);
    if (formData) formData.style.display = 'none';
    errorMsg.innerHTML = '<b>Error:</b> El formulario especificado no existe. Verifique el enlace o contacte al administrador.';
    errorMsg.style.display = 'block';
  }
}

if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'Error: Formulario no especificado';
  if (errorMsg) {
    errorMsg.innerHTML = '<b>Error Crítico:</b> No se ha especificado un ID de formulario en la URL (parámetro `?id=`).<br>Por favor, contacte al administrador o verifique el enlace.';
    errorMsg.style.display = 'block';
  }
  if (formData) formData.style.display = 'none';
  if (ticketBg) ticketBg.style.display = 'none';
  console.error("formId (codigo_form) es nulo o vacío. La aplicación no puede continuar.");
} else {
  cargarDatosFormulario();
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

function formatCedula(cedula) {
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

function formatSequentialCode(number) {
  return number.toString().padStart(3, '0');
}

if (formData) {
  formData.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMsg.style.display = 'none';

    const nombre = inputNombre.value.trim();
    const cedulaRaw = inputCedula.value.replace(/\D/g, '');
    const edadValue = inputEdad.value.trim();
    const numeroValue = inputNumero.value.trim();
    const correoValue = inputCorreo.value.trim();
    const referenciaValue = inputReferencia.value.trim();

    if (!nombre || !/^\d{8}$/.test(cedulaRaw) || !edadValue || !referenciaValue) {
      if (!nombre) errorMsg.textContent = 'Debe ingresar un nombre.';
      else if (!/^\d{8}$/.test(cedulaRaw)) errorMsg.textContent = 'La cédula debe tener exactamente 8 dígitos.';
      else if (!edadValue) errorMsg.textContent = 'Debe ingresar una edad.';
      else if (!referenciaValue) errorMsg.textContent = 'Debe ingresar un código de referencia.';
      errorMsg.style.display = 'block';
      return;
    }

    // Validaciones opcionales para número y correo
    if (numeroValue && !/^\d+$/.test(numeroValue.replace(/\D/g, ''))) {
        errorMsg.textContent = 'Número de teléfono inválido.';
        errorMsg.style.display = 'block';
        return;
    }
    if (correoValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoValue)) {
        errorMsg.textContent = 'Correo electrónico inválido.';
        errorMsg.style.display = 'block';
        return;
    }

    const edad = parseInt(edadValue);
    if (isNaN(edad) || edad < 0) {
        errorMsg.textContent = 'Edad inválida.';
        errorMsg.style.display = 'block';
        return;
    }
    if (currentMinAge !== null && edad < currentMinAge) {
      errorMsg.textContent = `Error: Su edad no es válida. Debe ser mayor o igual a ${currentMinAge}.`;
      errorMsg.style.display = 'block';
      return;
    }
    if (currentMaxAge !== null && edad > currentMaxAge) {
      errorMsg.textContent = `Error: Su edad no es válida. Debe ser menor o igual a ${currentMaxAge}.`;
      errorMsg.style.display = 'block';
      return;
    }

    confNombre.textContent = toTitleCase(nombre);
    confCedula.textContent = formatCedula(cedulaRaw);
    confEdad.textContent = `${edad} años`;
    confNumero.textContent = numeroValue || '-';
    confCorreo.textContent = correoValue || '-';
    confReferencia.textContent = referenciaValue;

    formData.style.display = 'none';
    entradaGenerada.style.display = 'none';
    confirmacionDatos.style.display = 'block';

    window.datosParaConfirmar = { nombre, cedula: cedulaRaw, edad: edadValue, edadInt: edad, numero: numeroValue, correo: correoValue, referencia: referenciaValue };
  });
}

async function validarYObtenerReferencia(codigoReferencia, formDbId) {
  const { data, error } = await supabase
    .from('referencias_usos')
    .select('id, usos_disponibles')
    .eq('formulario_id', formDbId)
    .eq('codigo_referencia', codigoReferencia)
    .single();

  if (error || !data) {
    console.warn("Error al buscar referencia o no encontrada:", error);
    return { valida: false, mensaje: "El código de referencia proporcionado no existe o es incorrecto." };
  }

  if (data.usos_disponibles <= 0) {
    return { valida: false, mensaje: "Este código de referencia ya ha sido utilizado y no tiene usos disponibles." };
  }

  return { valida: true, datosReferencia: data };
}

async function decrementarUsoReferencia(idReferencia) {
  const { data: refData, error: fetchError } = await supabase
    .from('referencias_usos')
    .select('usos_disponibles')
    .eq('id', idReferencia)
    .single();

  if (fetchError || !refData) {
    console.error("Error al obtener la referencia para decrementar o no encontrada:", fetchError);
    return;
  }

  const nuevosUsosDisponibles = refData.usos_disponibles - 1;

  const { error: updateError } = await supabase
    .from('referencias_usos')
    .update({ usos_disponibles: nuevosUsosDisponibles })
    .eq('id', idReferencia);

  if (updateError) {
    console.error("Error al decrementar uso de referencia:", updateError);
  } else {
    console.log(`Referencia ${idReferencia} decrementada a ${nuevosUsosDisponibles} usos.`);
  }
}

if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async function () {
    if (isSubmitting) {
      console.log('Envío ya en progreso...');
      return;
    }
    isSubmitting = true;
    btnConfirmar.disabled = true;
    const originalButtonText = btnConfirmar.textContent;
    btnConfirmar.textContent = 'Procesando...';

    errorMsg.style.display = 'none';

    try {
      if (!formId || formId.trim() === "" || !currentFormDbId) {
        errorMsg.innerHTML = "<b>Error Crítico:</b> ID de formulario ausente o no válido.";
        errorMsg.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = originalButtonText;
        return;
      }

      const { nombre, cedula, edadInt, numero, correo, referencia } = window.datosParaConfirmar;

      const formDisplayName = (formTitleElement.textContent || "Evento").replace("Formulario: ", "").trim();

      if (!referencia) {
        errorMsg.textContent = "Error: Falta el código de referencia. Por favor, corrija sus datos.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = originalButtonText;
        return;
      }

      let idReferenciaParaDecrementar = null;
      const validacionRef = await validarYObtenerReferencia(referencia, currentFormDbId);

      if (!validacionRef.valida) {
        errorMsg.textContent = validacionRef.mensaje;
        errorMsg.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = originalButtonText;
        return;
      }

      if (validacionRef.datosReferencia) {
        idReferenciaParaDecrementar = validacionRef.datosReferencia.id;
      } else {
        console.error("Error lógico: Referencia marcada como válida pero sin datos de referencia.");
        errorMsg.textContent = "Error interno al validar la referencia. Intente de nuevo.";
        errorMsg.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = originalButtonText;
        return;
      }

      const { data: existingResponse, error: checkError } = await supabase
        .from('respuestas')
        .select('cedula')
        .eq('formulario_id', currentFormDbId)
        .eq('cedula', cedula)
        .maybeSingle();

      if (checkError) {
        console.error("Error detallado verificando cédula duplicada en Supabase:", checkError);
        errorMsg.textContent = "Error al verificar la cédula. Intente de nuevo.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = originalButtonText;
        return;
      }

      if (existingResponse) {
        errorMsg.textContent = "Esta cédula ya ha sido registrada para este formulario.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = originalButtonText;
        return;
      }

      let nuevoCodigoSecuencial;
      let nuevoCodigoSecuencialFormateado;

      try {
        let { data: contadorData, error: contadorError } = await supabase
          .from('contadores_formularios')
          .select('ultimo_codigo')
          .eq('formulario_id', currentFormDbId)
          .single();

        if (contadorError && contadorError.code !== 'PGRST116') {
          throw contadorError;
        }

        if (contadorData) {
          nuevoCodigoSecuencial = contadorData.ultimo_codigo + 1;
        } else {
          nuevoCodigoSecuencial = 1;
        }

        const { error: upsertError } = await supabase
          .from('contadores_formularios')
          .upsert({ formulario_id: currentFormDbId, ultimo_codigo: nuevoCodigoSecuencial }, { onConflict: 'formulario_id' });

        if (upsertError) {
          throw upsertError;
        }

        nuevoCodigoSecuencialFormateado = formatSequentialCode(nuevoCodigoSecuencial);
      } catch (e) {
        console.error("Error en la lógica del contador con Supabase:", e);
        errorMsg.textContent = "Error crítico al generar el código. Contacte al administrador.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = originalButtonText;
        return;
      }

      const nuevaRespuesta = {
