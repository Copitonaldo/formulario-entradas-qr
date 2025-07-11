// Importar Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Configuración de Supabase
const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWVqZWVpZWh3ZmtkY2Jwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQwOTYsImV4cCI6MjA2NzE0MDA5Nn0.yDq4eOHujKH2nmg-F-DVnqCHGwdfEmf4Z968KXl1SDc';

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
const inputReferencia = document.getElementById('referencia'); // Nuevo campo
const errorMsg = document.getElementById('errorMsg');
const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confCedula');
const confEdad = document.getElementById('confEdad');
const confReferencia = document.getElementById('confReferencia'); // Para mostrar en confirmación
const btnConfirmar = document.getElementById('btnConfirmar');
const btnCorregir = document.getElementById('btnCorregir');
const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outCodigo = document.getElementById('outCodigo');
const outReferencia = document.getElementById('outReferencia'); // Para mostrar en el ticket
const outReferenciaContenedor = document.getElementById('outReferenciaContenedor'); // Contenedor para mostrar/ocultar
const codigoQR = document.getElementById('codigoQR'); // Este es el div .qr-code-label
const qrCanvas = document.getElementById('qrCanvas'); // El canvas original para mostrar QR
const entradaGenerada = document.getElementById('entradaGenerada');
const ticketBg = document.getElementById('ticketBg');
const guardarBtn = document.getElementById('guardarBtn');

let currentMinAge = null;
let currentMaxAge = null;
let currentFormDbId = null; // Para almacenar el UUID del formulario de Supabase

// --- Carga de datos del formulario (incluida imagen de fondo) ---
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
    const referenciaValue = inputReferencia.value.trim();

    // Modificado para incluir referencia obligatoria
    if (!nombre || !/^\d{8}$/.test(cedulaRaw) || !edadValue || !referenciaValue) {
      if (!nombre) errorMsg.textContent = 'Debe ingresar un nombre.';
      else if (!/^\d{8}$/.test(cedulaRaw)) errorMsg.textContent = 'La cédula debe tener exactamente 8 dígitos.';
      else if (!edadValue) errorMsg.textContent = 'Debe ingresar una edad.';
      else if (!referenciaValue) errorMsg.textContent = 'Debe ingresar un código de referencia.'; // Nuevo mensaje
      errorMsg.style.display = 'block';
      return;
    }

    const edad = parseInt(edadValue);
    if (isNaN(edad) || edad < 0) {
        errorMsg.textContent = 'Edad inválida.';
        errorMsg.style.display = 'block';
        return;
    }
    
    // Modificado: si está aquí, es porque referenciaValue no está vacío y debe ser de 4 dígitos.
    if (!/^\d{4}$/.test(referenciaValue)) {
      errorMsg.textContent = 'El código de referencia debe ser de 4 dígitos.';
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
    if (confReferencia) confReferencia.textContent = referenciaValue ? referenciaValue : '-'; // Se mantiene para la confirmación visual

    formData.style.display = 'none';
    entradaGenerada.style.display = 'none';
    confirmacionDatos.style.display = 'block';
    window.datosParaConfirmar = { nombre, cedula: cedulaRaw, edad: edadValue, edadInt: edad, referencia: referenciaValue }; // referenciaValue ya no es `|| null`
  });
}

async function validarYObtenerReferencia(codigoReferencia, formDbId) {
  // Asumimos que codigoReferencia SIEMPRE se pasa porque es obligatorio.
  // La validación de si se proporcionó o no, y su formato, ya se hizo en el 'submit'.
  const { data, error } = await supabase
    .from('referencias_usos')
    .select('id, usos_disponibles')
    .eq('formulario_id', formDbId)
    .eq('codigo_referencia', codigoReferencia)
    .single();

  if (error || !data) {
    console.warn("Error al buscar referencia o no encontrada:", error);
    // Mensaje más específico según el nuevo requisito
    return { valida: false, mensaje: "El código de referencia proporcionado no existe o es incorrecto." };
  }

  if (data.usos_disponibles <= 0) {
    return { valida: false, mensaje: "Este código de referencia ya ha sido utilizado y no tiene usos disponibles." };
  }

  return { valida: true, datosReferencia: data };
}

async function decrementarUsoReferencia(idReferencia) {
  // 1. Leer el valor actual
  const { data: refData, error: fetchError } = await supabase
    .from('referencias_usos')
    .select('usos_disponibles')
    .eq('id', idReferencia)
    .single();

  if (fetchError || !refData) {
    console.error("Error al obtener la referencia para decrementar o no encontrada:", fetchError);
    // Aquí podrías querer manejar el error de forma más robusta,
    // por ejemplo, notificando que no se pudo decrementar.
    // Por ahora, solo lo logueamos, ya que la entrada principal ya se guardó.
    return;
  }

  const nuevosUsosDisponibles = refData.usos_disponibles - 1;

  // 2. Actualizar con el nuevo valor
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
    if (!formId || formId.trim() === "" || !currentFormDbId) {
      errorMsg.innerHTML = "<b>Error Crítico:</b> ID de formulario ausente o no válido.";
      errorMsg.style.display = 'block';
      return;
    }

    const { nombre, cedula, edadInt, referencia } = window.datosParaConfirmar;
    const formDisplayName = (formTitleElement.textContent || "Evento").replace("Formulario: ", "").trim();

    // Como la referencia ahora es obligatoria, 'referencia' SIEMPRE debería tener un valor aquí.
    // La validación de formato y existencia ya ocurrió en el 'submit' y se re-valida aquí.
    if (!referencia) { 
        // Este caso no debería ocurrir si la lógica del submit es correcta, pero es una salvaguarda.
        errorMsg.textContent = "Error: Falta el código de referencia. Por favor, corrija sus datos.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none'; 
        if (formData) formData.style.display = 'block'; 
        return;
    }

    let idReferenciaParaDecrementar = null;
    // Validar referencia (ya no es opcional)
    const validacionRef = await validarYObtenerReferencia(referencia, currentFormDbId);
    if (!validacionRef.valida) {
      errorMsg.textContent = validacionRef.mensaje; // Mensaje de validarYObtenerReferencia
      errorMsg.style.display = 'block';
      // Mantener confirmacionDatos visible para que btnCorregir funcione, 
      // o el usuario puede usar "No" para volver al formulario.
      return;
    }
    
    // Si validacionRef.valida es true, entonces validacionRef.datosReferencia debería existir.
    if (validacionRef.datosReferencia) {
      idReferenciaParaDecrementar = validacionRef.datosReferencia.id;
    } else {
      // Caso anómalo si valida es true pero no hay datosReferencia.
      console.error("Error lógico: Referencia marcada como válida pero sin datos de referencia.");
      errorMsg.textContent = "Error interno al validar la referencia. Intente de nuevo.";
      errorMsg.style.display = 'block';
      return;
    }
    
    // Verificar cédula duplicada en Supabase
    const { data: existingResponse, error:查Error } = await supabase
      .from('respuestas')
      .select('cedula')
      .eq('formulario_id', currentFormDbId)
      .eq('cedula', cedula)
      .maybeSingle(); 

    if (查Error) {
      console.error("Error detallado verificando cédula duplicada en Supabase:", 查Error);
      errorMsg.textContent = "Error al verificar la cédula. Intente de nuevo.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
      return;
    }

    if (existingResponse) {
      errorMsg.textContent = "Esta cédula ya ha sido registrada para este formulario.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
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
      return;
    }

    const nuevaRespuesta = {
      formulario_id: currentFormDbId,
      codigo_secuencial: nuevoCodigoSecuencialFormateado,
      nombre_completo: toTitleCase(nombre),
      cedula: cedula,
      edad: edadInt,
      referencia_usada: referencia // Guardar la referencia usada (ahora siempre habrá una)
    };

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('respuestas')
        .insert([nuevaRespuesta])
        .select()
        .single();

      if (insertError) {
        console.error("Error guardando respuesta en Supabase:", insertError);
        errorMsg.textContent = "Error al guardar los datos. Intente de nuevo. (Ver consola)";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block'; 
        return;
      }

      if (insertData) {
        // Si se usó una referencia y se guardó la respuesta, decrementar el uso
        // idReferenciaParaDecrementar debe estar seteado si llegamos aquí con una referencia válida
        if (idReferenciaParaDecrementar) {
          await decrementarUsoReferencia(idReferenciaParaDecrementar);
        }

        outNombre.textContent = insertData.nombre_completo; 
        outCedula.textContent = formatCedula(insertData.cedula);
        outEdad.textContent = `${insertData.edad} años`;
        outCodigo.textContent = insertData.codigo_secuencial;

        // La referencia usada siempre se mostrará ahora
        outReferencia.textContent = insertData.referencia_usada;
        outReferenciaContenedor.style.display = 'block';
        
        if (codigoQR) codigoQR.textContent = "Código: " + insertData.codigo_secuencial;

        const qrCanvasElement = document.getElementById('qrCanvas');
        let datosQR = `${formDisplayName}\nNombre: ${insertData.nombre_completo}\nCédula: ${insertData.cedula}\nEdad: ${insertData.edad}\nCódigo: ${insertData.codigo_secuencial}`;
        // Siempre habrá referencia_usada en insertData si la lógica es correcta
        if (insertData.referencia_usada) {
            datosQR += `\nRef: ${insertData.referencia_usada}`;
        }


        if (qrCanvasElement) {
          QRCode.toCanvas(qrCanvasElement, datosQR, {
            width: parseInt(qrCanvasElement.style.width) || 70,
            height: parseInt(qrCanvasElement.style.height) || 70,
            margin: 1
          }, error => {
            if (error) console.error("Error generando QR para visualización:", error);
          });
        }
        confirmacionDatos.style.display = 'none';
        entradaGenerada.style.display = 'block';
      } else {
        errorMsg.textContent = "No se pudo confirmar el guardado de los datos.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
      }
    } catch (err) { 
      console.error("Error general guardando en Supabase DB:", err);
      errorMsg.textContent = "Error al guardar los datos (inesperado). Intente de nuevo.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
    }
  });
}

if (btnCorregir) {
  btnCorregir.addEventListener('click', () => {
    confirmacionDatos.style.display = 'none';
    if (formData) {
      if (formId && formId.trim() !== "" && formData.style.display === 'none') {
         formData.style.display = 'block';
      }
    }
    errorMsg.style.display = 'none'; 
  });
}

if (guardarBtn) {
  guardarBtn.addEventListener('click', async () => {
    try {
      const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js')).default;
      const elementToCapture = document.querySelector('#entradaGenerada .ticket-img-wrap');
      if (!elementToCapture) {
        console.error("Elemento '.ticket-img-wrap' no encontrado para captura.");
        alert("Error: No se pudo encontrar el contenido del ticket para guardar.");
        return;
      }
      const clone = elementToCapture.cloneNode(true);
      const targetOutputWidthPx = 2500;
      const targetOutputHeightPx = 960;
      const cloneBaseWidth = elementToCapture.offsetWidth;
      const cloneBaseHeight = elementToCapture.offsetHeight;
      clone.style.width = `${cloneBaseWidth}px`;
      clone.style.height = `${cloneBaseHeight}px`;
      clone.style.boxSizing = 'border-box';
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0px';
      clone.querySelectorAll('*').forEach(el => {
        el.style.boxShadow = 'none';
      });
      clone.style.backgroundColor = '#ffffff';
      const clonedTicketBg = clone.querySelector('#ticketBg');
      if (clonedTicketBg) {
        clonedTicketBg.style.width = '100%';
        clonedTicketBg.style.height = '100%';
        clonedTicketBg.style.objectFit = 'cover';
        if (!clonedTicketBg.src || getComputedStyle(clonedTicketBg).display === 'none') {
          clone.style.backgroundColor = '#ffffff';
        } else {
          clone.style.backgroundColor = 'transparent';
        }
      } else {
        clone.style.backgroundColor = '#ffffff';
      }
      const qrAbsoluteDivInClone = clone.querySelector('.qr-absolute');
      if (qrAbsoluteDivInClone) {
        qrAbsoluteDivInClone.style.position = 'absolute';
        qrAbsoluteDivInClone.style.top = '50%';
        qrAbsoluteDivInClone.style.left = '30px';
        qrAbsoluteDivInClone.style.transform = 'translateY(-50%)';
        qrAbsoluteDivInClone.style.background = '#ffffff';
        qrAbsoluteDivInClone.style.padding = getComputedStyle(elementToCapture.querySelector('.qr-absolute')).padding;
        qrAbsoluteDivInClone.style.borderRadius = getComputedStyle(elementToCapture.querySelector('.qr-absolute')).borderRadius;
        qrAbsoluteDivInClone.style.boxShadow = 'none';
        qrAbsoluteDivInClone.style.display = 'flex';
        qrAbsoluteDivInClone.style.flexDirection = 'column';
        qrAbsoluteDivInClone.style.alignItems = 'center';
        qrAbsoluteDivInClone.style.zIndex = '10';
      }
      const qrCanvasInClone = clone.querySelector('#qrCanvas');
      if (qrCanvasInClone) {
        const originalQrCanvas = document.getElementById('qrCanvas');
        qrCanvasInClone.style.width = originalQrCanvas.style.width || '70px';
        qrCanvasInClone.style.height = originalQrCanvas.style.height || '70px';
        qrCanvasInClone.style.borderRadius = originalQrCanvas.style.borderRadius || '4px';
        qrCanvasInClone.style.boxShadow = 'none';
        qrCanvasInClone.style.display = 'block';
      }
      const qrCodeLabelInClone = clone.querySelector('.qr-code-label');
      if (qrCodeLabelInClone) {
        const originalQrLabel = document.getElementById('codigoQR');
        qrCodeLabelInClone.style.fontSize = getComputedStyle(originalQrLabel).fontSize;
        qrCodeLabelInClone.style.marginTop = getComputedStyle(originalQrLabel).marginTop;
        qrCodeLabelInClone.style.color = getComputedStyle(originalQrLabel).color;
        qrCodeLabelInClone.style.textAlign = getComputedStyle(originalQrLabel).textAlign;
        qrCodeLabelInClone.style.fontWeight = getComputedStyle(originalQrLabel).fontWeight;
        qrCodeLabelInClone.textContent = "Código: " + outCodigo.textContent;
      }
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 250)); 
      
      const scaleFactor = targetOutputWidthPx / cloneBaseWidth;

      html2canvas(clone, {
        useCORS: true,
        scale: scaleFactor,
        backgroundColor: clone.style.backgroundColor === 'transparent' ? null : clone.style.backgroundColor,
        logging: true,
        onclone: (documentCloned, clonedElement) => {
          const clonedCanvasEl = clonedElement.querySelector('#qrCanvas');
          if (clonedCanvasEl) {
            const formDisplayName = (formTitleElement.textContent || "Evento").replace("Formulario: ", "").trim();
            let datosQRClone = `${formDisplayName}\nNombre: ${outNombre.textContent}\nCédula: ${outCedula.textContent}\nEdad: ${outEdad.textContent}\nCódigo: ${outCodigo.textContent}`;
            if (outReferenciaContenedor.style.display !== 'none' && outReferencia.textContent) {
                datosQRClone += `\nRef: ${outReferencia.textContent}`;
            }
            QRCode.toCanvas(clonedCanvasEl, datosQRClone, { width: parseInt(clonedCanvasEl.style.width) || 70, height: parseInt(clonedCanvasEl.style.height) || 70, margin: 1 }, function (error) {
              if (error) console.error('Error re-dibujando QR en clon:', error);
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
        if (clone.style.backgroundColor === 'transparent') { 
            finalCtx.fillStyle = '#ffffff';
            finalCtx.fillRect(0, 0, targetOutputWidthPx, targetOutputHeightPx);
        }
        finalCtx.drawImage(
          canvasFromHtml2Canvas,
          0, 0, canvasFromHtml2Canvas.width, canvasFromHtml2Canvas.height, 
          0, 0, targetOutputWidthPx, targetOutputHeightPx 
        );
        const link = document.createElement('a');
        const nombreArchivo = ${outCodigo.textContent || 'TICKET'}${(outNombre.textContent || 'nombre')}.jpg;
        link.download = nombreArchivo;
        link.href = finalCanvas.toDataURL('image/jpeg', 0.9);
        link.click();
        document.body.removeChild(clone);
      }).catch(err => {
        console.error("Error al generar la imagen con html2canvas:", err);
        alert("Error al generar la imagen. Intente de nuevo.");
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
      });
    } catch (error) {
      console.error("Error al cargar html2canvas o en la lógica de guardado:", error);
      alert("No se pudo cargar la funcionalidad para guardar la imagen o hubo un error. Verifique su conexión o intente más tarde.");
    }
  });
}
console.log("form.js cargado con lógica de referencias obligatorias.");
