exports.handler = async (event, context) => {
  const params = event.queryStringParameters || {};
  const { id, estado } = params;

  if (!id || !estado) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: '<h2>Error: faltan parámetros</h2>'
    };
  }

  if (!['calificado', 'descartado'].includes(estado.toLowerCase())) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: '<h2>Error: estado inválido</h2>'
    };
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = 'Candidatos';

  try {
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=LOWER({Nombre})=LOWER("${id}")&maxRecords=1`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const searchData = await searchRes.json();

    if (!searchData.records || searchData.records.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: '<h2>Candidato no encontrado</h2>'
      };
    }

    const recordId = searchData.records[0].id;
    const estadoCapitalized = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();

    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${recordId}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: { Estado: estadoCapitalized } })
    });

    if (!updateRes.ok) throw new Error(`Airtable update failed: ${updateRes.status}`);

    const color = estado === 'calificado' ? '#005A62' : '#dc2626';
    const emoji = estado === 'calificado' ? '✅' : '❌';
    const texto = estado === 'calificado' ? 'Calificado' : 'Descartado';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Recluta UY</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f4f6f5; }
            .card { background: white; border-radius: 16px; padding: 48px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.1); max-width: 400px; }
            .icon { font-size: 3rem; margin-bottom: 16px; }
            h2 { color: ${color}; margin-bottom: 8px; }
            p { color: #6b7280; font-size: .95rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">${emoji}</div>
            <h2>${texto}</h2>
            <p>El candidato <strong>${id}</strong> fue marcado como <strong>${texto}</strong> en Airtable.</p>
          </div>
        </body>
        </html>
      `
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<h2>Error: ${err.message}</h2>`
    };
  }
};
