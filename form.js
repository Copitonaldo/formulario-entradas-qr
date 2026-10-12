// Importar Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.4/+esm";

const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWVqZWVpZWh3ZmtkY2Jwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQwOTYsImV4cCI6MjA2NzE0MDA5Nn0.yDq4eOHujKH2nmg-F-DVnqCHGwdfEmf4Z968KXl1SDc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
const formTitleElement = document.getElementById('formTitle');
const formData = document.getElementById('formData');
const inputNombre = document.getElementById('nombre');
const inputCedula = document.getElementById('cedula');
const inputEdad = document.getElementById('edad');
const inputReferencia = document.getElementById('referencia');
const errorMsg = document.getElementById('errorMsg');
const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confCedula');
const confEdad = document.getElementById('confEdad');
const confReferencia = document.getElementById('confReferencia');
const confCustomFieldsContainer = document.getElementById('confCustomFieldsContainer');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnCorregir = document.getElementById('btnCorregir');
const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outCodigo = document.getElementById('outCodigo');
const outReferencia = document.getElementById('outReferencia');
const outReferenciaContenedor = document.getElementById('outReferenciaContenedor');
const outCustomFieldsContainer = document.getElementById('outCustomFieldsContainer');
const codigoQR = document.getElementById('codigoQR');
const qrCanvas = document.getElementById('qrCanvas');
const entradaGenerada = document.getElementById('entradaGenerada');
const ticketBg = document.getElementById('ticketBg');
const guardarBtn = document.getElementById('guardarBtn');
const customFieldsContainer = document.getElementById('customFieldsContainer');

let currentMinAge = null;
let currentMaxAge = null;
let currentFormDbId = null;
let currentParametrosPersonalizados = [];
let isSubmitting = false;

async function cargarDatosFormulario() {
  if (!formId) return;
  const { data: formDataResult, error: formError } = await supabase
    .from('formularios')
    .select('id, nombre, imagen_url, min_age, max_age, parametros_personalizados')
    .eq('codigo_form', formId)
    .single();

  if (formError) {
    if (formTitleElement) formTitleElement.textContent = 'Error al cargar formulario';
    if (ticketBg) ticketBg.style.display = 'none';
    if (formData) formData.style.display = 'none';
    errorMsg.innerHTML = '<b>Error:</b> No se pudo cargar la información del formulario.';
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
    currentParametrosPersonalizados = Array.isArray(formDataResult.parametros_personalizados) 
      ? formDataResult.parametros_personalizados 
      : [];

    renderizarCamposPersonalizadosPublico();

  } else {
    if (formTitleElement) formTitleElement.textContent = 'Formulario no encontrado';
    if (ticketBg) ticketBg.style.display = 'none';
    if (formData) formData.style.display = 'none';
    errorMsg.innerHTML = '<b>Error:</b> El formulario especificado no existe.';
    errorMsg.style.display = 'block';
  }
}

function renderizarCamposPersonalizadosPublico() {
  if (!customFieldsContainer) return;
  customFieldsContainer.innerHTML = '';

  if (!currentParametrosPersonalizados || currentParametrosPersonalizados.length === 0) {
    customFieldsContainer.style.display = 'none';
    return;
  }

  // Dejamos que el CSS original controle la visualización sin forzar estilos en línea raros
  customFieldsContainer.style.display = 'block';

  currentParametrosPersonalizados.forEach((param, index) => {
    const wrapper = document.createElement('div');
    // Usamos las mismas etiquetas estándar del formulario original
    wrapper.innerHTML = `
      <label for="custom_param_${index}">${escapeHtml(param)}:</label>
      <input type="text" id="custom_param_${index}" data-param-name="${escapeHtml(param)}" required autocomplete="off" placeholder="Ingrese ${escapeHtml(param.toLowerCase())}" />
    `;
    customFieldsContainer.appendChild(wrapper);
  });
}

function escapeHtml(text) {
  if (text === null || typeof text === 'undefined') return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'Error: Formulario no especificado';
  if (errorMsg) {
    errorMsg.innerHTML = '<b>Error Crítico:</b> No se ha especificado un ID de formulario en la URL.';
    errorMsg.style.display = 'block';
  }
  if (formData) formData.style.display = 'none';
  if (ticketBg) ticketBg.style.display = 'none';
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
    const referenciaValue = inputReferencia.value.trim();

    if (!nombre || !/^\d{8}$/.test(cedulaRaw) || !edadValue || !referenciaValue) {
      if (!nombre) errorMsg.textContent = 'Debe ingresar un nombre.';
      else if (!/^\d{8}$/.test(cedulaRaw)) errorMsg.textContent = 'La cédula debe tener exactamente 8 dígitos.';
      else if (!edadValue) errorMsg.textContent = 'Debe ingresar una edad.';
      else if (!referenciaValue) errorMsg.textContent = 'Debe ingresar un código de referencia.';
      errorMsg.style.display = 'block';
      return;
    }

    const customValuesMap = {};
    let camposPersonalizadosValidos = true;

    currentParametrosPersonalizados.forEach((param, index) => {
      const inputEl = document.getElementById(`custom_param_${index}`);
      if (inputEl) {
        const val = inputEl.value.trim();
        if (!val) {
          camposPersonalizadosValidos = false;
        }
        customValuesMap[param] = val;
      }
    });

    if (!camposPersonalizadosValidos) {
      errorMsg.textContent = 'Debe completar todos los campos personalizados.';
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
      errorMsg.textContent = `Error: Su edad debe ser mayor o igual a ${currentMinAge}.`;
      errorMsg.style.display = 'block';
      return;
    }
    if (currentMaxAge !== null && edad > currentMaxAge) {
      errorMsg.textContent = `Error: Su edad debe ser menor o igual a ${currentMaxAge}.`;
      errorMsg.style.display = 'block';
      return;
    }

    confNombre.textContent = toTitleCase(nombre);
    confCedula.textContent = formatCedula(cedulaRaw);
    confEdad.textContent = `${edad} años`;
    confReferencia.textContent = referenciaValue;

    if (confCustomFieldsContainer) {
      confCustomFieldsContainer.innerHTML = '';
      Object.entries(customValuesMap).forEach(([key, val]) => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(val)}`;
        confCustomFieldsContainer.appendChild(p);
      });
    }

    formData.style.display = 'none';
    entradaGenerada.style.display = 'none';
    confirmacionDatos.style.display = 'block';
    window.datosParaConfirmar = { 
      nombre, 
      cedula: cedulaRaw, 
      edad: edadValue, 
      edadInt: edad, 
      referencia: referenciaValue, 
      customValues: customValuesMap 
    };
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
    return { valida: false, mensaje: "El código de referencia proporcionado no existe o es incorrecto." };
  }
  if (data.usos_disponibles <= 0) {
    return { valida: false, mensaje: "Este código de referencia ya ha sido utilizado y no tiene usos disponibles." };
  }
  return { valida: true, datosReferencia: data };
}

async function decrementarUsoReferencia(idReferencia) {
  const { data: refData } = await supabase
    .from('referencias_usos')
    .select('usos_disponibles')
    .eq('id', idReferencia)
    .single();
  if (!refData) return;
  
  await supabase
    .from('referencias_usos')
    .update({ usos_disponibles: refData.usos_disponibles - 1 })
    .eq('id', idReferencia);
}

if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async function () {
    if (isSubmitting) return;
    isSubmitting = true;
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Procesando...';
    errorMsg.style.display = 'none';

    try {
      if (!formId || !currentFormDbId) {
        errorMsg.innerHTML = "<b>Error Crítico:</b> ID de formulario no válido.";
        errorMsg.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Sí';
        return;
      }

      const { nombre, cedula, edadInt, referencia, customValues } = window.datosParaConfirmar;
      const formDisplayName = (formTitleElement.textContent || "Evento").replace("Formulario: ", "").trim();

      const validacionRef = await validarYObtenerReferencia(referencia, currentFormDbId);
      if (!validacionRef.valida) {
        errorMsg.textContent = validacionRef.mensaje;
        errorMsg.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Sí';
        return;
      }
      const idReferenciaParaDecrementar = validacionRef.datosReferencia.id;

      const { data: existingResponse } = await supabase
        .from('respuestas')
        .select('cedula')
        .eq('formulario_id', currentFormDbId)
        .eq('cedula', cedula)
        .maybeSingle();

      if (existingResponse) {
        errorMsg.textContent = "Esta cédula ya ha sido registrada para este formulario.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Sí';
        return;
      }

      let nuevoCodigoSecuencial;
      let nuevoCodigoSecuencialFormateado;

      let { data: contadorData } = await supabase
        .from('contadores_formularios')
        .select('ultimo_codigo')
        .eq('formulario_id', currentFormDbId)
        .single();

      if (contadorData && typeof contadorData.ultimo_codigo === 'number') {
        nuevoCodigoSecuencial = contadorData.ultimo_codigo + 1;
      } else {
        nuevoCodigoSecuencial = 1;
      }

      await supabase
        .from('contadores_formularios')
        .upsert({ formulario_id: currentFormDbId, ultimo_codigo: nuevoCodigoSecuencial }, { onConflict: 'formulario_id' });

      nuevoCodigoSecuencialFormateado = formatSequentialCode(nuevoCodigoSecuencial);

      const nuevaRespuesta = {
        formulario_id: currentFormDbId,
        codigo_secuencial: nuevoCodigoSecuencialFormateado,
        nombre_completo: toTitleCase(nombre),
        cedula: cedula,
        edad: edadInt,
        referencia_usada: referencia,
        parametros_personalizados: customValues
      };

      const { data: insertData, error: insertError } = await supabase
        .from('respuestas')
        .insert([nuevaRespuesta])
        .select()
        .single();

      if (insertError || !insertData) {
        errorMsg.textContent = "Error al guardar los datos. Intente de nuevo.";
        errorMsg.style.display = 'block';
        isSubmitting = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Sí';
        return;
      }

      await decrementarUsoReferencia(idReferenciaParaDecrementar);

      outNombre.textContent = insertData.nombre_completo;
      outCedula.textContent = formatCedula(insertData.cedula);
      outEdad.textContent = `${insertData.edad} años`;
      outCodigo.textContent = insertData.codigo_secuencial;
      outReferencia.textContent = insertData.referencia_usada;
      outReferenciaContenedor.style.display = 'block';
      if (codigoQR) codigoQR.textContent = "Código: " + insertData.codigo_secuencial;

      if (outCustomFieldsContainer) {
        outCustomFieldsContainer.innerHTML = '';
        const savedCustomValues = insertData.parametros_personalizados || {};
        Object.entries(savedCustomValues).forEach(([key, val]) => {
          const p = document.createElement('p');
          p.innerHTML = `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(val)}`;
          outCustomFieldsContainer.appendChild(p);
        });
      }

      const qrCanvasElement = document.getElementById('qrCanvas');
      let datosQR = `${formDisplayName}\nNombre: ${insertData.nombre_completo}\nCédula: ${insertData.cedula}\nEdad: ${insertData.edad}\nCódigo: ${insertData.codigo_secuencial}\nRef: ${insertData.referencia_usada}`;

      if (qrCanvasElement) {
        QRCode.toCanvas(qrCanvasElement, datosQR, {
          width: 70,
          height: 70,
          margin: 1
        });
      }

      confirmacionDatos.style.display = 'none';
      entradaGenerada.style.display = 'block';

    } catch (generalError) {
      errorMsg.textContent = "Ocurrió un error inesperado.";
      errorMsg.style.display = 'block';
      isSubmitting = false;
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Sí';
    }
  });
}

if (btnCorregir) {
  btnCorregir.addEventListener('click', () => {
    isSubmitting = false;
    if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Sí';
    }
    confirmacionDatos.style.display = 'none';
    if (formData) formData.style.display = 'block';
    errorMsg.style.display = 'none';
  });
}

if (guardarBtn) {
  guardarBtn.addEventListener('click', async () => {
    try {
      const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js')).default;
      const elementToCapture = document.querySelector('#entradaGenerada .ticket-img-wrap');
      if (!elementToCapture) return;

      const clone = elementToCapture.cloneNode(true);
      const targetOutputWidthPx = 2500;
      const targetOutputHeightPx = 960;
      const cloneBaseWidth = elementToCapture.offsetWidth;
      const cloneBaseHeight = elementToCapture.offsetHeight;
      
      clone.style.width = `${cloneBaseWidth}px`;
      clone.style.height = `${cloneBaseHeight}px`;
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0px';
      clone.style.backgroundColor = 'transparent';

      const qrAbsoluteDivInClone = clone.querySelector('.qr-absolute');
      if (qrAbsoluteDivInClone) {
        qrAbsoluteDivInClone.style.position = 'absolute';
        qrAbsoluteDivInClone.style.top = '55%';
        qrAbsoluteDivInClone.style.left = '18%'; 
        qrAbsoluteDivInClone.style.transform = 'translate(-50%, -50%)';
        qrAbsoluteDivInClone.style.background = 'rgba(255, 255, 255, 0.95)';
        qrAbsoluteDivInClone.style.padding = '6px';
        qrAbsoluteDivInClone.style.borderRadius = '8px';
        qrAbsoluteDivInClone.style.display = 'flex';
        qrAbsoluteDivInClone.style.flexDirection = 'column';
        qrAbsoluteDivInClone.style.alignItems = 'center';
        qrAbsoluteDivInClone.style.zIndex = '10';
      }

      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 250));

      const scaleFactor = targetOutputWidthPx / cloneBaseWidth;
      html2canvas(clone, {
        useCORS: true,
        scale: scaleFactor,
        backgroundColor: null,
        onclone: (documentCloned, clonedElement) => {
          const clonedCanvasEl = clonedElement.querySelector('#qrCanvas');
          if (clonedCanvasEl) {
            const formDisplayName = (formTitleElement.textContent || "Evento").replace("Formulario: ", "").trim();
            let datosQRClone = `${formDisplayName}\nNombre: ${outNombre.textContent}\nCédula: ${outCedula.textContent}\nEdad: ${outEdad.textContent}\nCódigo: ${outCodigo.textContent}\nRef: ${outReferencia.textContent}`;
            
            QRCode.toCanvas(clonedCanvasEl, datosQRClone, { width: 70, height: 70, margin: 1 }, function (error) {
              if (error) console.error('Error redibujando QR en clon:', error);
            });
          }
          const clonedQrLabel = clonedElement.querySelector('.qr-code-label');
          if (clonedQrLabel) {
            clonedQrLabel.textContent = "Código: " + outCodigo.textContent;
          }
        }
      }).then(canvasFromHtml2Canvas => {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetOutputWidthPx;
        finalCanvas.height = targetOutputHeightPx;
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCtx.drawImage(
          canvasFromHtml2Canvas,
          0, 0, canvasFromHtml2Canvas.width, canvasFromHtml2Canvas.height,
          0, 0, targetOutputWidthPx, targetOutputHeightPx
        );

        const link = document.createElement('a');
        link.download = `${outCodigo.textContent || 'TICKET'}${outNombre.textContent || 'nombre'}.jpg`;
        link.href = finalCanvas.toDataURL('image/jpeg', 0.9);
        link.click();
        document.body.removeChild(clone);
      });
    } catch (error) {
      alert("No se pudo generar la imagen de la entrada.");
    }
  });
}
