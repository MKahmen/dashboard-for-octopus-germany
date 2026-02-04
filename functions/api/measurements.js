// Cloudflare Pages Function for smart meter measurements
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
  const propertyId = url.searchParams.get('propertyId');
  const date = url.searchParams.get('date');
  const frequencyType = url.searchParams.get('frequencyType') || 'RAW_INTERVAL';
  const first = parseInt(url.searchParams.get('first') || '96');

  if (!accountNumber || !propertyId || !date) {
    return new Response(JSON.stringify({ error: 'accountNumber, propertyId and date required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const consumptionQuery = `
      query getSmartMeterUsage($accountNumber: String!, $propertyId: ID!, $date: Date!, $first: Int!) {
        account(accountNumber: $accountNumber) {
          property(id: $propertyId) {
            measurements(
              utilityFilters: {electricityFilters: {readingFrequencyType: ${frequencyType}, readingQuality: COMBINED}}
              startOn: $date
              first: $first
            ) {
              edges {
                node {
                  ... on IntervalMeasurementType {
                    startAt
                    endAt
                    value
                    unit
                  }
                }
              }
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
        query: consumptionQuery,
        variables: { accountNumber, propertyId, date, first }
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

    const edges = data.data?.account?.property?.measurements?.edges || [];
    const readings = edges.map(e => ({
      startAt: e.node.startAt,
      endAt: e.node.endAt,
      value: e.node.value,
      unit: e.node.unit
    }));

    return new Response(JSON.stringify({ readings }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
