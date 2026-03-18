const VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY')!;

// Labels from Google Vision that suggest a traffic warden or parking enforcement officer
const WARDEN_LABELS = [
  'traffic warden',
  'parking enforcement',
  'parking officer',
  'traffic officer',
  'traffic police',
  'police officer',
  'police',
  'security guard',
  'security officer',
  'enforcement officer',
  'officer',
  'warden',
  'uniform',
  'high-visibility clothing',
  'reflective clothing',
  'personal protective equipment',
];

Deno.serve(async (req) => {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
    }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 20 },
            ],
          }],
        }),
      }
    );

    const visionData = await visionRes.json();
    const labels: { description: string; score: number }[] =
      visionData.responses?.[0]?.labelAnnotations ?? [];

    console.log('Vision labels:', JSON.stringify(labels.map(l => `${l.description} (${l.score.toFixed(2)})`)));

    let verified = false;
    let topConfidence = 0;
    let matchedLabel = '';

    for (const label of labels) {
      const desc = label.description.toLowerCase();
      const score = label.score;
      const isWarden = WARDEN_LABELS.some((kw) => desc.includes(kw));
      if (isWarden && score > 0.65) {
        if (score > topConfidence) {
          topConfidence = score;
          matchedLabel = label.description;
        }
        verified = true;
      }
    }

    console.log(`Result: verified=${verified}, confidence=${topConfidence}, label="${matchedLabel}"`);

    return new Response(
      JSON.stringify({ verified, confidence: topConfidence, matchedLabel }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.log('ERROR:', String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
