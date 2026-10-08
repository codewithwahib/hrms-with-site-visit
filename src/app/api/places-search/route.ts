// app/api/places-search/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const FOURSQUARE_KEY = 'V1VU2UDXBV1IKHSSFSXXOX4VTKGVUNTIN2V1UO4J0XFS35FW';

// ✅ Karachi center + radius
const KARACHI_LAT = 24.8607;
const KARACHI_LNG = 67.0011;

// ✅ Karachi bounding rectangle for Photon fallback
const KARACHI_BBOX = '66.75,24.65,67.45,25.15';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    console.log('🔵 Places search:', query);

    // ✅ Foursquare Places API call (server-side, no CORS)
    const fsqUrl =
      `https://api.foursquare.com/v3/places/search?` +
      `query=${encodeURIComponent(query)}` +
      `&ll=${KARACHI_LAT},${KARACHI_LNG}` +
      `&radius=50000` +  // 50km radius around Karachi
      `&limit=15` +
      `&sort=RELEVANCE`;

    let foursquareResults: any[] = [];

    try {
      const fsqRes = await fetch(fsqUrl, {
        headers: {
          Accept: 'application/json',
          Authorization: FOURSQUARE_KEY,
        },
      });

      console.log('🟢 Foursquare status:', fsqRes.status);

      if (fsqRes.ok) {
        const fsqData = await fsqRes.json();
        foursquareResults = (fsqData.results || []).map((r: any) => ({
          id: `fsq-${r.fsq_id}`,
          name: r.name || 'Unknown',
          address:
            r.location?.formatted_address ||
            [
              r.location?.address,
              r.location?.locality,
              r.location?.region,
              r.location?.country,
            ]
              .filter(Boolean)
              .join(', ') ||
            '',
          lat: r.geocodes?.main?.latitude,
          lng: r.geocodes?.main?.longitude,
          category: r.categories?.[0]?.name,
          source: 'foursquare',
        }));
        console.log('🟢 Foursquare results:', foursquareResults.length);
      } else {
        const errText = await fsqRes.text();
        console.error('🔴 Foursquare error:', fsqRes.status, errText);
      }
    } catch (err) {
      console.error('🔴 Foursquare fetch failed:', err);
    }

    // ✅ Photon fallback (parallel/bonus results)
    let photonResults: any[] = [];

    try {
      const photonUrl =
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
        `&limit=10` +
        `&lat=${KARACHI_LAT}&lon=${KARACHI_LNG}` +
        `&bbox=${KARACHI_BBOX}` +
        `&lang=en`;

      const photonRes = await fetch(photonUrl);

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        const [minLon, minLat, maxLon, maxLat] = KARACHI_BBOX.split(',').map(
          Number
        );

        photonResults = (photonData.features || [])
          .map((f: any, idx: number) => {
            const p = f.properties || {};
            const [lng, lat] = f.geometry?.coordinates || [0, 0];

            const name =
              p.name ||
              p.street ||
              p.city ||
              p.district ||
              p.county ||
              p.state ||
              'Unknown place';

            const addressParts = [
              p.street && p.housenumber
                ? `${p.housenumber} ${p.street}`
                : p.street,
              p.district,
              p.city,
              p.state,
              p.country,
            ].filter(Boolean);

            return {
              id: `photon-${p.osm_id || idx}`,
              name,
              address: addressParts.join(', '),
              lat,
              lng,
              category: p.osm_value,
              source: 'photon',
            };
          })
          .filter((r: any) => {
            if (!r.lat || !r.lng) return false;
            return (
              r.lng >= minLon &&
              r.lng <= maxLon &&
              r.lat >= minLat &&
              r.lat <= maxLat
            );
          });
        console.log('🟢 Photon results:', photonResults.length);
      }
    } catch (err) {
      console.error('🔴 Photon fetch failed:', err);
    }

    // ✅ Merge + dedupe
    const seen = new Set<string>();
    const merged: any[] = [];

    // Foursquare first (better business data)
    [...foursquareResults, ...photonResults].forEach((r) => {
      if (!r.lat || !r.lng) return;
      const key = `${r.name.toLowerCase().trim()}-${Number(r.lat).toFixed(
        4
      )}-${Number(r.lng).toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    });

    return NextResponse.json(
      { results: merged.slice(0, 15) },
      { status: 200 }
    );
  } catch (err) {
    console.error('🔴 /api/places-search error:', err);
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    );
  }
}