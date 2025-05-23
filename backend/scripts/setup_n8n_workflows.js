const axios = require('axios');

// Configuración
const N8N_API_URL = 'http://localhost:5678/api/v1';
const N8N_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0OWRiMDY2Yi01OWY2LTRiZDYtOGY1Zi1hNjYzYTBhMWI3MzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ3MTk3MTM2fQ.E8ovprBqA_ZynNRBvir2GsAM_Aedt0523oDSuL0JDUE';
const WAAPI_TOKEN = 'pIAOM8UufGmEcPHDqhLSfPfkbyahOWb8aB6wdNJ84b38f280';

// Headers para las solicitudes a la API
const headers = {
  'Content-Type': 'application/json',
  'X-N8N-API-KEY': N8N_API_TOKEN // Use the API key directly
};

// 1. Crear flujo para procesar mensajes entrantes de WhatsApp
async function createWhatsappWebhookWorkflow() {
  console.log("Creando flujo 'Procesar Mensajes WhatsApp'...");
  
  const workflowData = {
    name: 'Procesar Mensajes WhatsApp',
    nodes: [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "whatsapp-webhook",
          "responseMode": "responseNode"
        },
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [250, 300]
      },
      {
        "parameters": {
          "functionCode": `
const body = $input.body;

// Verificar si es formato WaAPI
if (body.event && body.event === 'message' && body.data) {
  const { from, body: messageBody, timestamp } = body.data;
  return {
    json: {
      from,
      text: messageBody,
      timestamp,
      source: 'waapi'
    }
  };
} 
// Formato alternativo
else {
  const { from, text, timestamp } = body;
  return {
    json: {
      from,
      text,
      timestamp,
      source: 'direct'
    }
  };
}`
        },
        "name": "Procesar Formato",
        "type": "n8n-nodes-base.function",
        "typeVersion": 1,
        "position": [450, 300]
      },
      {
        "parameters": {
          "url": "http://ccjap_backend:3001/api/webhook/whatsapp",
          "method": "POST",
          "sendBody": true,
          "bodyContent": "={{ $json }}",
          "authentication": "none",
          "responseFormat": "json",
          "options": {}
        },
        "name": "Enviar a Backend",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 3,
        "position": [650, 300]
      },
      {
        "parameters": {
          "content": "={{\n  \"success\": true,\n  \"message\": \"Mensaje procesado con éxito\"\n}}",
          "options": {}
        },
        "name": "Responder al Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [850, 300]
      }
    ],
    "connections": {
      "Webhook": {
        "main": [
          [
            {
              "node": "Procesar Formato",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Procesar Formato": {
        "main": [
          [
            {
              "node": "Enviar a Backend",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Enviar a Backend": {
        "main": [
          [
            {
              "node": "Responder al Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    "settings": {
      "executionOrder": "v1"
    }
  };

  try {
    const response = await axios.post(`${N8N_API_URL}/workflows`, workflowData, { headers });
    console.log("Flujo 'Procesar Mensajes WhatsApp' creado con éxito, ID:", response.data.id);
    return response.data.id;
  } catch (error) {
    console.error("Error creando flujo 'Procesar Mensajes WhatsApp':", error.response?.data?.message || error.message);
    throw error;
  }
}

// 2. Crear flujo para notificar a docentes
async function createNotifyTeacherWorkflow() {
  console.log("Creando flujo 'Notificar a Docentes'...");
  
  const workflowData = {
    name: 'Notificar a Docentes',
    nodes: [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "notificar-maestro",
          "responseMode": "responseNode"
        },
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [250, 300]
      },
      {
        "parameters": {
          "functionCode": `
const { email, nombreMaestro, nombreAlumno, mensaje, tipo } = $input.body;

let asunto, cuerpoMensaje;

if (tipo === 'ausencia') {
  asunto = \`Notificación de Ausencia: \${nombreAlumno}\`;
  cuerpoMensaje = \`
    Estimado/a \${nombreMaestro},
    
    Se ha registrado una ausencia para el/la estudiante \${nombreAlumno}.
    
    Motivo reportado: "\${mensaje}"
    
    Esta es una notificación automática del sistema.
    
    Colegio Cristiano Dr. Juan Allwood Paredes
  \`;
} else {
  asunto = \`Consulta sobre \${nombreAlumno}\`;
  cuerpoMensaje = \`
    Estimado/a \${nombreMaestro},
    
    Ha recibido una consulta relacionada con el/la estudiante \${nombreAlumno}:
    
    "\${mensaje}"
    
    Por favor, responda a la brevedad posible a través de la plataforma.
    
    Esta es una notificación automática del sistema.
    
    Colegio Cristiano Dr. Juan Allwood Paredes
  \`;
}

return {
  json: {
    destinatario: email,
    asunto: asunto,
    mensaje: cuerpoMensaje,
    tipo: tipo
  }
};`
        },
        "name": "Formatear Notificación",
        "type": "n8n-nodes-base.function",
        "typeVersion": 1,
        "position": [450, 300]
      },
      {
        "parameters": {
          "resource": "message",
          "operation": "send",
          "sendTo": "={{ $json.destinatario }}",
          "subject": "={{ $json.asunto }}",
          "text": "={{ $json.mensaje }}",
          "options": {
            "sentFrom": "CCJAP Notificaciones"
          }
        },
        "name": "Enviar Email",
        "type": "n8n-nodes-base.gmail",
        "typeVersion": 1,
        "position": [650, 300],
        "credentials": {
          "googleApi": "Gmail Account"
        }
      },
      {
        "parameters": {
          "content": "={{\n  \"success\": true,\n  \"message\": \"Notificación enviada con éxito\"\n}}",
          "options": {}
        },
        "name": "Responder al Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [850, 300]
      }
    ],
    "connections": {
      "Webhook": {
        "main": [
          [
            {
              "node": "Formatear Notificación",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Formatear Notificación": {
        "main": [
          [
            {
              "node": "Enviar Email",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Enviar Email": {
        "main": [
          [
            {
              "node": "Responder al Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    "active": true,
    "settings": {
      "executionOrder": "v1"
    }
  };

  try {
    const response = await axios.post(`${N8N_API_URL}/workflows`, workflowData, { headers });
    console.log("Flujo 'Notificar a Docentes' creado con éxito, ID:", response.data.id);
    return response.data.id;
  } catch (error) {
    console.error("Error creando flujo 'Notificar a Docentes':", error.response?.data?.message || error.message);
    throw error;
  }
}

// 3. Crear flujo para enviar mensajes WhatsApp
async function createSendWhatsappWorkflow() {
  console.log("Creando flujo 'Enviar Mensajes WhatsApp'...");
  
  const workflowData = {
    name: 'Enviar Mensajes WhatsApp',
    nodes: [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "enviar-whatsapp",
          "responseMode": "responseNode"
        },
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [250, 300]
      },
      {
        "parameters": {
          "functionCode": `
const { telefono, mensaje } = $input.body;

// Formatear el número: asegurarse de formato internacional
let numeroFormateado = telefono;
if (!numeroFormateado.startsWith('+')) {
  if (numeroFormateado.startsWith('503')) {
    numeroFormateado = '+' + numeroFormateado;
  } else {
    numeroFormateado = '+503' + numeroFormateado; // Asumiendo El Salvador
  }
}

return {
  json: {
    numeroFormateado,
    mensaje
  }
};`
        },
        "name": "Formatear Número",
        "type": "n8n-nodes-base.function",
        "typeVersion": 1,
        "position": [450, 300]
      },
      {
        "parameters": {
          "url": "https://api.waapi.net/api/send/text",
          "method": "POST",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "Authorization",
                "value": `Bearer ${WAAPI_TOKEN}`
              }
            ]
          },
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "id",
                "value": "={{ $json.numeroFormateado }}"
              },
              {
                "name": "message",
                "value": "={{ $json.mensaje }}"
              }
            ]
          },
          "responseFormat": "json",
          "options": {}
        },
        "name": "Enviar a WaAPI",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 3,
        "position": [650, 300]
      },
      {
        "parameters": {
          "content": "={{\n  \"success\": true,\n  \"message\": \"Mensaje enviado con éxito\"\n}}",
          "options": {}
        },
        "name": "Responder al Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [850, 300]
      }
    ],
    "connections": {
      "Webhook": {
        "main": [
          [
            {
              "node": "Formatear Número",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Formatear Número": {
        "main": [
          [
            {
              "node": "Enviar a WaAPI",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Enviar a WaAPI": {
        "main": [
          [
            {
              "node": "Responder al Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    "active": true,
    "settings": {
      "executionOrder": "v1"
    }
  };

  try {
    const response = await axios.post(`${N8N_API_URL}/workflows`, workflowData, { headers });
    console.log("Flujo 'Enviar Mensajes WhatsApp' creado con éxito, ID:", response.data.id);
    return response.data.id;
  } catch (error) {
    console.error("Error creando flujo 'Enviar Mensajes WhatsApp':", error.response?.data?.message || error.message);
    throw error;
  }
}

async function activateWorkflow(workflowId) {
  console.log(`Activando flujo de trabajo con ID: ${workflowId}`);
  try {
    const response = await axios.patch(
      `${N8N_API_URL}/workflows/${workflowId}`,
      { active: true },
      { headers }
    );
    console.log(`Flujo de trabajo con ID ${workflowId} activado con éxito.`);
    return response.data;
  } catch (error) {
    console.error(`Error al activar el flujo de trabajo con ID ${workflowId}:`, error.response?.data?.message || error.message);
    throw error;
  }
}

// Función principal para ejecutar la configuración
async function setupN8nWorkflows() {
  try {
    console.log("Comenzando configuración de flujos de trabajo en n8n...");
    
    // Crear los tres flujos de trabajo
    const workflowId1 = await createWhatsappWebhookWorkflow();
    const workflowId2 = await createNotifyTeacherWorkflow();
    const workflowId3 = await createSendWhatsappWorkflow();
    
    console.log("¡Configuración completada con éxito!");
    console.log("IDs de flujos de trabajo:", {
      procesarMensajes: workflowId1,
      notificarDocentes: workflowId2,
      enviarWhatsapp: workflowId3
    });
    
    // Guardar las URLs de webhook
    console.log("\nURLs de Webhook para configurar en servicios externos:");
    console.log(`- Webhook WhatsApp: http://localhost:5678/webhook/whatsapp-webhook`);

    // Activate the workflows
    await activateWorkflow(workflowId1);
    await activateWorkflow(workflowId2);
    await activateWorkflow(workflowId3);
    
    return {
      procesarMensajes: workflowId1,
      notificarDocentes: workflowId2,
      enviarWhatsapp: workflowId3
    };
  } catch (error) {
    console.error("Error en la configuración:", error);
    throw error;
  }
}

// Ejecutar la configuración
setupN8nWorkflows()
  .then(() => {
    console.log("Configuración de n8n completada exitosamente");
  })
  .catch((error) => {
    console.error("Error general en la configuración:", error);
    process.exit(1);
  });