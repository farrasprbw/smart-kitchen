// Vercel Serverless Function
// Menyediakan konfigurasi GEMINI_API_KEY dari Vercel Environment Variables secara aman

export default function handler(req, res) {
  // Allow CORS from Capacitor app (localhost) and web origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set no-cache header
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const apiKey = process.env.GEMINI_API_KEY || '';

  return res.status(200).json({
    geminiApiKey: apiKey
  });
}
