exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items, payer, shipment } = JSON.parse(event.body);
    const accessToken = process.env.MP_ACCESS_TOKEN;

    const preference = {
      items,
      payer,
      shipments: shipment ? {
        receiver_address: {
          street_name: shipment.direccion,
          city_name: shipment.ciudad,
          state_name: shipment.provincia,
          zip_code: shipment.cp
        }
      } : undefined,
      back_urls: {
        success: 'https://latidosteens.netlify.app/?pago=exitoso',
        failure: 'https://latidosteens.netlify.app/?pago=fallido',
        pending: 'https://latidosteens.netlify.app/?pago=pendiente'
      },
      auto_return: 'approved',
      statement_descriptor: 'LATIDOS TIENDA',
      external_reference: 'LAT-' + Date.now().toString().slice(-6)
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.message || 'Error al crear preferencia' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        id: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
