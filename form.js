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
const codigoQR = document.getElementById('codigoQR');
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

    // Verificar Cédula duplicada
    const respuestasQuery = query(ref(database, `respuestas/${formId}`), orderByChild('cedula'), equalTo(cedula));
    try {
      const snapshot = await get(respuestasQuery);
      if (snapshot.exists()) {
        errorMsg.textContent = "Esta cédula ya ha sido registrada para este formulario.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block'; // Mostrar formulario para corregir
        return;
      }
    } catch (e) {
      console.error("Error detallado verificando cédula duplicada:", e); // Log más detallado
      errorMsg.textContent = "Error al verificar la cédula. Intente de nuevo. (Ver consola para detalles)";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block'; // Mostrar formulario para corregir
      return;
    }

    const contadorRef = ref(database, `contadores/${formId}/ultimoCodigo`);
    let nuevoCodigoSecuencialFormateado;

    try {
      const transactionResult = await runTransaction(contadorRef, (currentData) => {
        if (currentData === null) {
          return 1; 
        }
        return currentData + 1;
      });

      if (transactionResult.committed && transactionResult.snapshot.exists()) {
        const nuevoContador = transactionResult.snapshot.val();
        nuevoCodigoSecuencialFormateado = formatSequentialCode(nuevoContador);
      } else {
        console.error("Transacción para el contador no fue committed o el snapshot no existe.");
        errorMsg.textContent = "Error al generar el código secuencial (transacción fallida). Intente de nuevo.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        return;
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
      codigoQR.textContent = "Código: " + nuevaRespuesta.codigo; // Etiqueta debajo del QR visible

      const qrCanvasElement = document.getElementById('qrCanvas');
      const datosQR = `Nombre: ${toTitleCase(nombre)}\nCédula: ${cedula}\nEdad: ${edad}\nCódigo: ${nuevaRespuesta.codigo}`;
      
      QRCode.toCanvas(qrCanvasElement, datosQR, { width: parseInt(qrCanvasElement.style.width) || 70, height: parseInt(qrCanvasElement.style.height) || 70, margin: 1 }, error => {
        if (error) console.error("Error generando QR para visualización:", error);
      });

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
      
      const elementToCapture = document.querySelector('#entradaGenerada .ticket-img-wrap'); 
      if (!elementToCapture) {
        console.error("Elemento '.ticket-img-wrap' no encontrado para captura.");
        alert("Error: No se pudo encontrar el contenido del ticket para guardar.");
        return;
      }

      // Clonar el elemento para modificarlo antes de la captura sin afectar la visualización
      const clone = elementToCapture.cloneNode(true);

      // Forzar dimensiones para la captura de 2000x750px (o lo más cercano posible)
      // El elemento original '.ticket-img-wrap' podría tener un aspect-ratio diferente.
      // Para mantener el contenido visible, podríamos necesitar ajustar el 'scale'
      // o aceptar que el aspect ratio de la imagen final será el del clon.
      const targetWidth = 2000;
      const targetHeight = 750;

      // Mantener el aspect ratio del elemento original si es posible, escalando a targetWidth
      const originalRect = elementToCapture.getBoundingClientRect();
      const originalAspectRatio = originalRect.width / originalRect.height;
      
      let cloneWidth = targetWidth;
      let cloneHeight = targetWidth / originalAspectRatio;

      // Si la altura calculada es mucho mayor que targetHeight, podríamos necesitar
      // ajustar el width para que la altura se acerque más a targetHeight,
      // o simplemente dejar que el contenido se escale dentro de targetWidth x targetHeight.
      // Por simplicidad, vamos a fijar el ancho y dejar que el alto se ajuste,
      // luego html2canvas escalará esto. O podemos fijar ambos y ver el resultado.

      clone.style.width = `${targetWidth / 4}px`; // Usamos un tamaño base menor para el DOM
      clone.style.height = `${targetHeight / 4}px`; // y luego escalamos con html2canvas
      clone.style.boxSizing = 'border-box'; // Importante para que padding no altere el tamaño final
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0px'; // Quitar bordes redondeados
      clone.style.position = 'relative'; 

      const clonedTicketBg = clone.querySelector('#ticketBg');
      if (clonedTicketBg) {
        clonedTicketBg.style.width = '100%';
        clonedTicketBg.style.height = '100%';
        clonedTicketBg.style.objectFit = 'cover'; // o 'contain' según se prefiera
         if (!clonedTicketBg.src || clonedTicketBg.style.display === 'none' || getComputedStyle(clonedTicketBg).display === 'none') {
            clone.style.backgroundColor = '#ffffff'; 
        } else {
            clone.style.backgroundColor = 'transparent';
        }
      } else {
        clone.style.backgroundColor = '#ffffff';
      }
      
      // Ajustar el QR y el texto del código dentro del clon
      const qrAbsoluteDivInClone = clone.querySelector('.qr-absolute');
      if (qrAbsoluteDivInClone) {
        qrAbsoluteDivInClone.style.position = 'absolute';
        qrAbsoluteDivInClone.style.bottom = '20px'; 
        qrAbsoluteDivInClone.style.right = '20px';  
        qrAbsoluteDivInClone.style.display = 'flex !important'; 
        qrAbsoluteDivInClone.style.flexDirection = 'column';
        qrAbsoluteDivInClone.style.alignItems = 'center';
        qrAbsoluteDivInClone.style.justifyContent = 'center';
        qrAbsoluteDivInClone.style.opacity = '1 !important';
        qrAbsoluteDivInClone.style.visibility = 'visible !important';
      }

      const qrCanvasInClone = clone.querySelector('#qrCanvas');
      if (qrCanvasInClone) {
        qrCanvasInClone.style.width = '100px'; 
        qrCanvasInClone.style.height = '100px';
        qrCanvasInClone.style.display = 'block !important'; 
        qrCanvasInClone.style.opacity = '1 !important';
        qrCanvasInClone.style.visibility = 'visible !important';
      }

      const qrCodeLabelInClone = clone.querySelector('.qr-code-label');
      if (qrCodeLabelInClone) {
        qrCodeLabelInClone.style.display = 'block !important'; 
        qrCodeLabelInClone.style.color = '#000000 !important'; 
        qrCodeLabelInClone.style.textAlign = 'center';
        qrCodeLabelInClone.style.marginTop = '5px'; 
        qrCodeLabelInClone.textContent = "Código: " + outCodigo.textContent; 
        qrCodeLabelInClone.style.opacity = '1 !important';
        qrCodeLabelInClone.style.visibility = 'visible !important';
      }
      
      clone.style.position = 'absolute';
      clone.style.left = '-9999px'; 
      document.body.appendChild(clone);

      html2canvas(clone, { 
        useCORS: true, 
        scale: 4, 
        backgroundColor: clone.style.backgroundColor || '#ffffff', 
        width: parseInt(clone.style.width), 
        height: parseInt(clone.style.height),
        onclone: (documentCloned) => {
          const containerInClonedDoc = documentCloned.querySelector('.qr-absolute');
          if (containerInClonedDoc) {
            containerInClonedDoc.style.display = 'flex !important';
            containerInClonedDoc.style.opacity = '1 !important';
            containerInClonedDoc.style.visibility = 'visible !important';
          }

          const clonedCanvasEl = documentCloned.querySelector('#qrCanvas');
          if (clonedCanvasEl) {
            clonedCanvasEl.style.display = 'block !important';
            clonedCanvasEl.style.opacity = '1 !important';
            clonedCanvasEl.style.visibility = 'visible !important';
            const datosQR = `Nombre: ${outNombre.textContent}\nCédula: ${outCedula.textContent}\nEdad: ${outEdad.textContent}\nCódigo: ${outCodigo.textContent}`;
            QRCode.toCanvas(clonedCanvasEl, datosQR, { width: 100, height: 100, margin: 1 }, function (error) {
              if (error) console.error('Error re-dibujando QR en clon:', error);
            });
          }
          
          const clonedQrLabel = documentCloned.querySelector('.qr-code-label');
          if (clonedQrLabel) {
            clonedQrLabel.style.display = 'block !important';
            clonedQrLabel.style.opacity = '1 !important';
            clonedQrLabel.style.visibility = 'visible !important';
            clonedQrLabel.style.color = '#000000 !important'; 
            clonedQrLabel.textContent = "Código: " + outCodigo.textContent; 
          }
        }
      }).then(canvas => {
        const link = document.createElement('a');
        const nombreArchivo = `${outCodigo.textContent || 'TICKET'}${outNombre.textContent.replace(/\s/g, '') || ''}.png`;
        link.download = nombreArchivo;
        link.href = canvas.toDataURL('image/png');
        link.click();
        document.body.removeChild(clone); 
      }).catch(err => {
        console.error("Error al generar la imagen con html2canvas:", err);
        alert("Error al generar la imagen. Intente de nuevo.");
        if (document.body.contains(clone)) { // Solo remover si aún está en el body
            document.body.removeChild(clone); 
        }
      });

    } catch (error) {
      console.error("Error al cargar html2canvas:", error);
      alert("No se pudo cargar la funcionalidad para guardar la imagen. Verifique su conexión o intente más tarde.");
    }
  });
}
