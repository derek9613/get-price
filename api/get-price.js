export default async function handler(req, res) {
  // 設定 CORS，允許 Webflow 存取
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const targetUrl = "https://www.cfbenchmarks.com/data/indices/BRTI";

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      }
    });

    const html = await response.text();

    // 解析 HTML 中的價格欄位 (tabular-nums)
    const priceMatch = html.match(/<span[^>]*class="[^"]*tabular-nums[^"]*"[^>]*>([^<]+)<\/span>/);

    let price = "$ --,--";
    if (priceMatch && priceMatch[1]) {
      price = priceMatch[1].trim();
    }

    return res.status(200).json({ price: price });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}