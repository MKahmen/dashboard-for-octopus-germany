// Cloudflare Pages Function for tariff configuration
export async function onRequestGet(context) {
  const { env } = context;

  const missing = [];
  if (!env.TARIFF_LOW_PRICE) missing.push('TARIFF_LOW_PRICE');
  if (!env.TARIFF_STANDARD_PRICE) missing.push('TARIFF_STANDARD_PRICE');
  if (!env.TARIFF_HIGH_PRICE) missing.push('TARIFF_HIGH_PRICE');

  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: `Missing environment variables: ${missing.join(', ')}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tariff = {
    low: parseFloat(env.TARIFF_LOW_PRICE),
    standard: parseFloat(env.TARIFF_STANDARD_PRICE),
    high: parseFloat(env.TARIFF_HIGH_PRICE)
  };

  return new Response(JSON.stringify({ tariff }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
