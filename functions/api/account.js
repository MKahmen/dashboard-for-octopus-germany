// Cloudflare Pages Function for account info
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

  const url = new URL(request.url);
  const accountNumber = url.searchParams.get('accountNumber');
  if (!accountNumber) {
    return new Response(JSON.stringify({ error: 'accountNumber parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const accountQuery = `
      query getAccount($accountNumber: String!) {
        account(accountNumber: $accountNumber) {
          properties {
            id
            electricityMalos {
              id
              meter { id }
              agreements { id }
            }
          }
        }
      }
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'OctopusDashboard/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: accountQuery,
        variables: { accountNumber }
      })
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.log('Non-JSON response:', response.status, text.substring(0, 500));
      return new Response(JSON.stringify({
        error: `API returned non-JSON response (status ${response.status})`
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();

    if (data.errors) {
      return new Response(JSON.stringify({ error: data.errors[0].message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data.data.account), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
