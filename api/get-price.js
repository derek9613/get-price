export default async function handler(req, res) {
  // 1. 設定 CORS 允許 Webflow 前端跨域呼叫
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // 2. 禁用快取，保證每次請求都是當下最新價格
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 直連 CF Benchmarks 前端內部數據 API
    const response = await fetch("https://www.cfbenchmarks.com/api/indices/BRTI", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.cfbenchmarks.com/data/indices/BRTI"
      }
    });

    if (!response.ok) {
      throw new Error(`CF 內部 API 請求失敗，狀態碼: ${response.status}`);
    }

    const data = await response.json();
    
    // 取得即時 BRTI 數值
    const rawValue = data.value || data.price || (data.payload && data.payload.value);

    if (!rawValue) {
      throw new Error("未能讀取到 BRTI 價格");
    }

    const numericPrice = Number(rawValue);

    // 回傳與官網完全一致的價格與格式
    return res.status(200).json({
      symbol: "BRTI",
      price: numericPrice,
      formatted_price: `$${numericPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
