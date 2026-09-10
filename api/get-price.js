export default async function handler(req, res) {
  // 1. 設定 CORS 允許 Webflow 存取
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 呼叫該網站真實存在的內部數據 JSON 端點
    const response = await fetch("https://www.cfbenchmarks.com/data/indices/index.json", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.cfbenchmarks.com/data/indices/BRTI"
      }
    });

    if (!response.ok) {
      throw new Error(`CF 數據請求失敗，HTTP 狀態碼: ${response.status}`);
    }

    const data = await response.json();
    
    // 陣列或物件解析：尋找 id 或 ticker 為 BRTI 的項目
    let rawPrice = null;

    if (Array.isArray(data)) {
      const brtiItem = data.find(item => item.id === "BRTI" || item.ticker === "BRTI" || item.name === "BRTI");
      if (brtiItem) {
        rawPrice = brtiItem.price || brtiItem.value || brtiItem.last;
      }
    } else if (typeof data === "object") {
      rawPrice = data.BRTI?.price || data.BRTI?.value || data.price || data.value;
    }

    if (!rawPrice) {
      throw new Error("無法從 JSON 中解析出 BRTI 價格數值");
    }

    const numericPrice = Number(rawPrice);

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
