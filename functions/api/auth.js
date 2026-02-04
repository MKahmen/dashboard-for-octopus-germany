// Cloudflare Pages Function for authentication
const API_URL = 'https://api.oeg-kraken.energy/v1/graphql/';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const authQuery = `
      mutation krakenTokenAuthentication($email: String!, $password: String!) {
        obtainKrakenToken(input: {email: $email, password: $password}) {
          token
        }
      }
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OctopusDashboard/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: authQuery,
        variables: { email, password }
      })
    });

    // Check if response is OK and JSON
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
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      token: data.data.obtainKrakenToken.token
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
