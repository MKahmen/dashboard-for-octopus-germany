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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: authQuery,
        variables: { email, password }
      })
    });

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
