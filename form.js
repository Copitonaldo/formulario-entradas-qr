// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, runTransaction, get, query, orderByChild, equalTo, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAnjDU-BWTGTmbOrxjFsdNkvp8pNnXJba4",
  authDomain: "entradas-qr-07.firebaseapp.com",
  projectId: "entradas-qr-07",
  storageBucket: "entradas-qr-07.firebasestorage.app",
  messagingSenderId: "543393610176",
  appId: "1:543393610176:web:5f2ac0c66ae80415b47025"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Variables del DOM
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
const formTitleElement = document.getElementById('formTitle');
const formData = document.getElementById('formData');
const inputNombre = document.getElementById('nombre');
const inputCedula = document.getElementById('cedula');
const inputEdad = document.getElementById('edad');
const errorMsg = document.getElementById('errorMsg');
const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confCedula');
const confEdad = document.getElementById('confEdad');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnCorregir = document.getElementById('btnCorregir');
const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outCodigo = document.getElementById('outCodigo');
const codigoQR = document.getElementById('codigoQR'); // Este es el div .qr-code-label
const qrCanvas = document.getElementById('qrCanvas'); // El canvas original para mostrar QR
const entradaGenerada = document.getElementById('entradaGenerada');
const ticketBg = document.getElementById('ticketBg'); 
const guardarBtn = document.getElementById('guardarBtn');

// --- Carga de datos del formulario (incluida imagen de fondo) ---
async function cargarDatosFormulario() {
  if (!formId) return;

  const formQuery = query(ref(database, 'formularios'), orderByChild('codigo'), equalTo(formId));
  
  onValue(formQuery, (snapshot) => {
    if (snapshot.exists()) {
      const formEntries = snapshot.val();
      const formKey = Object.keys(formEntries)[0]; 
      const specificFormData = formEntries[formKey];
      
      if (formTitleElement) {
        formTitleElement.textContent = `Formulario: ${specificFormData.nombre || formId}`;
      }
      if (ticketBg && specificFormData.imagen) {
        ticketBg.src = specificFormData.imagen;
        ticketBg.style.display = 'block'; 
      } else if (ticketBg) {
        ticketBg.style.display = 'none'; 
      }
    } else {
      if (formTitleElement) formTitleElement.textContent = 'Formulario no encontrado';
      if (ticketBg) ticketBg.style.display = 'none';
      console.warn(`Formulario con ID ${formId} no encontrado.`);
      if(formData) formData.style.display = 'none';
      errorMsg.innerHTML = '<b>Error:</b> El formulario especificado no existe. Verifique el enlace o contacte al administrador.';
      errorMsg.style.display = 'block';
    }
  }, (error) => {
    console.error("Error al cargar datos del formulario:", error);
    if (formTitleElement) formTitleElement.textContent = 'Error al cargar formulario';
    if (ticketBg) ticketBg.style.display = 'none';
    if(formData) formData.style.display = 'none';
    errorMsg.innerHTML = '<b>Error:</b> No se pudo cargar la información del formulario. Intente más tarde.';
    errorMsg.style.display = 'block';
  });
}


if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'Error: Formulario no especificado';
  if (errorMsg) {
    errorMsg.innerHTML = '<b>Error Crítico:</b> No se ha especificado un ID de formulario en la URL (parámetro `?id=`).<br>Por favor, contacte al administrador o verifique el enlace.';
    errorMsg.style.display = 'block';
  }
  if (formData) formData.style.display = 'none';
  if (ticketBg) ticketBg.style.display = 'none';
  console.error("formId es nulo o vacío. La aplicación no puede continuar.");
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
    const edad = inputEdad.value.trim();

    if (!nombre || !/^\d{7,8}$/.test(cedulaRaw) || !edad || isNaN(parseInt(edad)) || parseInt(edad) < 0) {
      if (!nombre) errorMsg.textContent = 'Debe ingresar un nombre.';
      else if (!/^\d{7,8}$/.test(cedulaRaw)) errorMsg.textContent = 'La cédula debe tener entre 7 y 8 dígitos.';
      else errorMsg.textContent = 'Edad inválida.';
      errorMsg.style.display = 'block';
      return;
    }

    confNombre.textContent = toTitleCase(nombre);
    confCedula.textContent = formatCedula(cedulaRaw);
    confEdad.textContent = `${edad} años`;
    
    formData.style.display = 'none';
    entradaGenerada.style.display = 'none';
    confirmacionDatos.style.display = 'block';
    window.datosParaConfirmar = { nombre, cedula: cedulaRaw, edad };
  });
}

if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async function () {
    if (!formId || formId.trim() === "") {
      errorMsg.innerHTML = "<b>Error Crítico:</b> ID de formulario ausente.";
      errorMsg.style.display = 'block';
      return;
    }

    const { nombre, cedula, edad } = window.datosParaConfirmar;

    const respuestasQuery = query(ref(database, `respuestas/${formId}`), orderByChild('cedula'), equalTo(cedula));
    try {
      const snapshot = await get(respuestasQuery);
      if (snapshot.exists()) {
        errorMsg.textContent = "Esta cédula ya ha sido registrada para este formulario.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block'; 
        return;
      }
    } catch (e) {
      console.error("Error detallado verificando cédula duplicada:", e); 
      errorMsg.textContent = "Error al verificar la cédula. Intente de nuevo. (Ver consola para detalles)";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block'; 
      return;
    }

    const contadorRef = ref(database, `contadores/${formId}/ultimoCodigo`);
    let nuevoCodigoSecuencialFormateado;

    try {
      const transactionResult = await runTransaction(contadorRef, (currentData) => {
        if (currentData === null) return 1; 
        return currentData + 1;
      });

      if (transactionResult.committed && transactionResult.snapshot.exists()) {
        nuevoCodigoSecuencialFormateado = formatSequentialCode(transactionResult.snapshot.val());
      } else {
        throw new Error("Transaction not committed or snapshot doesn't exist.");
      }
    } catch (e) {
      console.error("Error en la transacción del contador:", e);
      errorMsg.textContent = "Error crítico al generar el código. Contacte al administrador.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
      return;
    }

    const nuevaRespuesta = {
      codigo: nuevoCodigoSecuencialFormateado,
      nombre: toTitleCase(nombre),
      cedula,
      edad,
      fecha: new Date().toISOString()
    };

    const respuestasRef = ref(database, `respuestas/${formId}`);
    try {
      await push(respuestasRef, nuevaRespuesta);
      outNombre.textContent = toTitleCase(nombre);
      outCedula.textContent = formatCedula(cedula);
      outEdad.textContent = `${edad} años`;
      outCodigo.textContent = nuevaRespuesta.codigo;
      
      // Actualizar la etiqueta del código QR visible en la previsualización
      if(codigoQR) codigoQR.textContent = "Código: " + nuevaRespuesta.codigo;

      const qrCanvasElement = document.getElementById('qrCanvas');
      const datosQR = `Nombre: ${toTitleCase(nombre)}\nCédula: ${cedula}\nEdad: ${edad}\nCódigo: ${nuevaRespuesta.codigo}`;
      
      if (qrCanvasElement) {
        QRCode.toCanvas(qrCanvasElement, datosQR, { 
            width: parseInt(qrCanvasElement.style.width) || 70, // Usar tamaño de CSS o 70
            height: parseInt(qrCanvasElement.style.height) || 70, // Usar tamaño de CSS o 70
            margin: 1 
        }, error => {
          if (error) console.error("Error generando QR para visualización:", error);
        });
      }

      confirmacionDatos.style.display = 'none';
      entradaGenerada.style.display = 'block';
    } catch (err) {
      console.error("Error guardando en Firebase:", err);
      errorMsg.textContent = "Error al guardar los datos. Intente de nuevo.";
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
      
      // CAPTURAR TODO EL DIV #entradaGenerada para incluir los datos de texto.
      const elementToCapture = document.getElementById('entradaGenerada'); 
      if (!elementToCapture) {
        console.error("Elemento '#entradaGenerada' no encontrado para captura.");
        alert("Error: No se pudo encontrar el contenido del ticket para guardar.");
        return;
      }

      // --- Clonar el elemento ---
      const clone = elementToCapture.cloneNode(true);
      
      // --- ESTILOS DEL CLON PARA LA CAPTURA ---
      // 1. Contenedor principal del clon (#entradaGenerada)
      clone.style.width = '600px'; // Ancho fijo para la captura base
      clone.style.maxWidth = '600px';
      clone.style.height = 'auto';   // Altura basada en el contenido
      clone.style.position = 'absolute';
      clone.style.left = '-9999px'; // Fuera de la pantalla
      clone.style.top = '-9999px';
      clone.style.boxSizing = 'border-box';
      clone.style.boxShadow = 'none'; 
      clone.style.borderRadius = '0px'; // Sin bordes redondeados en el contenedor general de captura
      clone.style.padding = '25px';    // Padding general para el ticket
      clone.style.backgroundColor = '#FFFFFF'; // Fondo blanco para el ticket
      clone.style.display = 'block'; // Asegurar display block

      // 2. Contenedor de la imagen y QR (.ticket-img-wrap)
      const clonedTicketImgWrap = clone.querySelector('.ticket-img-wrap');
      const originalTicketImgWrap = elementToCapture.querySelector('.ticket-img-wrap');
      if (clonedTicketImgWrap && originalTicketImgWrap) {
        clonedTicketImgWrap.style.width = '100%'; 
        clonedTicketImgWrap.style.maxWidth = '100%';
        const originalRect = originalTicketImgWrap.getBoundingClientRect();
        // Usar un aspect ratio por defecto si las dimensiones originales no son válidas
        const aspectRatio = originalRect.width > 0 && originalRect.height > 0 ? originalRect.width / originalRect.height : (500/170); // Aspect ratio del CSS original
        
        let availableWidthForImage = 600 - 2 * 25; // 600px (ancho clon) - padding (25px * 2)
        clonedTicketImgWrap.style.height = `${Math.round(availableWidthForImage / aspectRatio)}px`;
        clonedTicketImgWrap.style.position = 'relative';
        clonedTicketImgWrap.style.overflow = 'hidden';
        clonedTicketImgWrap.style.borderRadius = '12px'; // Bordes redondeados para esta sección visual
        clonedTicketImgWrap.style.background = '#EEEEEE'; // Color de fondo si la imagen no carga o no existe
        clonedTicketImgWrap.style.marginBottom = '20px'; // Espacio entre la imagen y los datos de texto
      }
      
      // 3. Imagen de fondo (#ticketBg)
      const originalTicketBg = elementToCapture.querySelector('#ticketBg');
      const clonedTicketBg = clone.querySelector('#ticketBg');
      let imageBackgroundLoaded = false; // Flag para saber si se usará la imagen o color de fondo
      if (clonedTicketBg && originalTicketBg && originalTicketBg.src && getComputedStyle(originalTicketBg).display !== 'none') {
        clonedTicketBg.style.width = '100%';
        clonedTicketBg.style.height = '100%';
        clonedTicketBg.style.objectFit = 'cover'; // Cubrir el área
        clonedTicketBg.style.display = 'block';
        clonedTicketBg.src = originalTicketBg.src; // Asegurar que el clon tenga el src
        imageBackgroundLoaded = true; 
      } else if (clonedTicketBg) {
        clonedTicketBg.style.display = 'none'; // Ocultar si no hay src válido
      }

      // 4. Contenedor del QR (.qr-absolute)
      const qrAbsoluteDivInClone = clone.querySelector('.qr-absolute');
      const originalQrAbsoluteDiv = elementToCapture.querySelector('.qr-absolute');
      if (qrAbsoluteDivInClone && originalQrAbsoluteDiv) {
        // No copiar todos los computedStyles, definir explícitamente para el clon
        qrAbsoluteDivInClone.style.position = 'absolute';
        qrAbsoluteDivInClone.style.top = '50%'; 
        qrAbsoluteDivInClone.style.left = '30px'; // Posición desde la izquierda
        qrAbsoluteDivInClone.style.transform = 'translateY(-50%)';
        qrAbsoluteDivInClone.style.background = 'rgba(255, 255, 255, 0.95)'; // Fondo más opaco y consistente
        qrAbsoluteDivInClone.style.padding = '12px'; // Padding para el QR
        qrAbsoluteDivInClone.style.borderRadius = '10px'; // Bordes redondeados
        qrAbsoluteDivInClone.style.boxShadow = '0 3px 7px rgba(0,0,0,0.2)'; // Sombra consistente
        qrAbsoluteDivInClone.style.display = 'flex';
        qrAbsoluteDivInClone.style.flexDirection = 'column';
        qrAbsoluteDivInClone.style.alignItems = 'center';
        qrAbsoluteDivInClone.style.zIndex = '100'; // Asegurar que esté por encima
      }
      
      // 5. Canvas del QR (#qrCanvas)
      const qrCanvasInClone = clone.querySelector('#qrCanvas');
      if (qrCanvasInClone) {
        qrCanvasInClone.style.width = `110px`; // QR más grande para legibilidad
        qrCanvasInClone.style.height = `110px`;
        qrCanvasInClone.style.borderRadius = '6px'; 
        qrCanvasInClone.style.display = 'block';
      }

      // 6. Etiqueta del código QR (.qr-code-label)
      const qrCodeLabelInClone = clone.querySelector('.qr-code-label');
      if (qrCodeLabelInClone) {
        qrCodeLabelInClone.style.fontSize = '15px'; 
        qrCodeLabelInClone.style.marginTop = '8px'; 
        qrCodeLabelInClone.style.color = '#181818'; // Color oscuro y legible
        qrCodeLabelInClone.style.textAlign = 'center';
        qrCodeLabelInClone.style.fontWeight = '600'; 
        qrCodeLabelInClone.textContent = "Código: " + outCodigo.textContent;
      }

      // 7. Datos de texto (.datos) y sus hijos
      const datosDivInClone = clone.querySelector('.datos');
      if (datosDivInClone) {
        datosDivInClone.style.marginTop = '0'; 
        datosDivInClone.style.fontSize = '17px'; 
        datosDivInClone.style.padding = '0 5px'; 
        datosDivInClone.querySelectorAll('div').forEach(div => {
          div.style.marginBottom = '10px'; 
          div.style.lineHeight = '1.6';
        });
        datosDivInClone.querySelectorAll('b').forEach(b => {
          b.style.display = 'inline-block';
          b.style.width = '90px'; 
          b.style.fontWeight = '600';
        });
        // Actualizar contenido explícitamente
        clone.querySelector('#outNombre').textContent = outNombre.textContent;
        clone.querySelector('#outCedula').textContent = outCedula.textContent;
        clone.querySelector('#outEdad').textContent = outEdad.textContent;
        clone.querySelector('#outCodigo').textContent = outCodigo.textContent;
      }
      
      // 8. Ocultar botón de guardar en el clon
      const guardarBtnInClone = clone.querySelector('#guardarBtn');
      if (guardarBtnInClone) guardarBtnInClone.style.display = 'none';
      
      // 9. Título "Su entrada ha sido generada"
      const h3InClone = clone.querySelector('h3');
      if (h3InClone && h3InClone.textContent.includes("Su entrada ha sido generada")) {
        h3InClone.style.textAlign = 'center';
        h3InClone.style.fontSize = '24px';
        h3InClone.style.fontWeight = '600';
        h3InClone.style.color = '#333333';
        h3InClone.style.marginBottom = '20px';
      }

      document.body.appendChild(clone);

      // --- Precargar imagen de fondo si existe ---
      const preloadTicketImage = async () => {
        if (imageBackgroundLoaded && clonedTicketBg && clonedTicketBg.src) {
          try {
            const img = new Image();
            img.crossOrigin = "anonymous"; 
            await new Promise((resolve, reject) => {
              img.onload = () => {
                console.log("Imagen de fondo precargada para canvas:", clonedTicketBg.src);
                resolve(img);
              };
              img.onerror = (e) => {
                console.warn("Error al cargar imagen de fondo para canvas, se usará color de fondo:", clonedTicketBg.src, e);
                imageBackgroundLoaded = false; 
                resolve(); 
              };
              img.src = clonedTicketBg.src;
            });
          } catch (e) {
            console.warn("Excepción precargando imagen de fondo:", e);
            imageBackgroundLoaded = false;
          }
        }
      };

      await preloadTicketImage();
      // Delay adicional para asegurar que todos los estilos y la imagen (si existe) se apliquen y rendericen
      await new Promise(resolve => setTimeout(resolve, 400)); 


      // --- (Re)Generar QR en el clon con tamaño ajustado ---
      if (qrCanvasInClone) {
        const datosQR = `Nombre: ${outNombre.textContent}\nCédula: ${outCedula.textContent}\nEdad: ${outEdad.textContent}\nCódigo: ${outCodigo.textContent}`;
        const qrSize = parseInt(qrCanvasInClone.style.width);
        try {
          await QRCode.toCanvas(qrCanvasInClone, datosQR, { 
            width: qrSize, 
            height: qrSize, 
            margin: 2, // Margen dentro del QR
            errorCorrectionLevel: 'M' 
          });
          console.log("QR redibujado en clon. Tamaño:", qrSize);
        } catch (error) {
          console.error('Error re-dibujando QR en clon:', error);
        }
      }
      // Asegurar que el texto del código esté actualizado en el clon
      if (qrCodeLabelInClone) { 
         qrCodeLabelInClone.textContent = "Código: " + outCodigo.textContent;
      }

      // --- Captura con html2canvas ---
      const scaleFactor = 2.5; 
      
      html2canvas(clone, { 
        useCORS: true, // Necesario si la imagen de fondo es de otro dominio
        scale: scaleFactor, 
        backgroundColor: imageBackgroundLoaded ? null : clone.style.backgroundColor, // Si la imagen cargó, html2canvas la usa, sino el color de fondo.
        logging: true, // Para depuración
        imageTimeout: 30000, // Timeout más largo para imágenes externas
        removeContainer: true // html2canvas debería eliminar el contenedor que usa para el clon
      }).then(canvas => {
        const link = document.createElement('a');
        const formTitleText = formTitleElement ? formTitleElement.textContent.replace(/Formulario: /i, '').trim() : 'Evento';
        const safeFormTitle = formTitleText.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const nombreArchivo = `Entrada-${safeFormTitle}-${outCodigo.textContent || 'TICKET'}-${outNombre.textContent.replace(/\s/g, '') || ''}.png`;
        link.download = nombreArchivo;
        link.href = canvas.toDataURL('image/png'); 
        link.click();
        console.log("Imagen generada y descarga iniciada:", nombreArchivo);
      }).catch(err => {
        console.error("Error detallado al generar la imagen con html2canvas:", err);
        alert("Error al generar la imagen. Verifique la consola. Si usa una imagen de fondo, asegúrese de que permita el acceso (CORS).");
      }).finally(() => {
        // Asegurarse de que el clon se elimine del body si html2canvas no lo hizo
        if (document.body.contains(clone)) {
            document.body.removeChild(clone);
            console.log("Clon eliminado manualmente del DOM.");
        }
      });

    } catch (error) {
      console.error("Error general en la función guardarBtn click:", error);
      alert("Ocurrió un error al preparar la descarga de la imagen. Revise la consola.");
      // Intentar eliminar el clon si algo falló antes de que se añadiera al body o en medio del proceso
      const tempClone = document.querySelector('body > #entradaGenerada'); 
      if (tempClone && tempClone.style.left === '-9999px') { // Una forma de identificar el clon perdido
          document.body.removeChild(tempClone);
          console.log("Clon perdido eliminado del DOM en catch general.");
      }
    }
  });
}
