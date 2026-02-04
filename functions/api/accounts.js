// Cloudflare Pages Function to get user's accounts
const API_URL = 'https://api.oeg-kraken.energy/v1/graphql/';

export async function onRequestGet(context) {
  const { request } = context;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const accountsQuery = `
      query {
        viewer {
          accounts {
            number
            status
          }
        }
      }
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ query: accountsQuery })
    });

    const data = await response.json();

    if (data.errors) {
      return new Response(JSON.stringify({ error: data.errors[0].message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const accounts = data.data?.viewer?.accounts || [];

    return new Response(JSON.stringify({ accounts }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
