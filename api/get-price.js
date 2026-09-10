export default async function handler(req, res) {
  // 設定 CORS Header 供 Webflow 前端跨域讀取
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 請求 BRTI 頁面原始碼
    const response = await fetch("https://www.cfbenchmarks.com/data/indices/BRTI", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(`網頁請求失敗，HTTP 狀態碼: ${response.status}`);
    }

    const html = await response.text();
    let rawPrice = null;

    // 1. 從 Next.js 頁面注入的 __NEXT_DATA__ JSON 數據中提取實時價格
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        
        // 遞迴尋找 JSON 中的 BRTI 價格數值
        const findPriceInObj = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          if ((obj.id === 'BRTI' || obj.ticker === 'BRTI' || obj.name === 'BRTI') && (obj.price || obj.value)) {
            return obj.price || obj.value;
          }
          for (const key of Object.keys(obj)) {
            const found = findPriceInObj(obj[key]);
            if (found) return found;
          }
          return null;
        };
        
        rawPrice = findPriceInObj(nextData);
      } catch (e) {
        console.error("JSON 解析失敗:", e);
      }
    }

    // 2. 若 Next.js State 中未找尋到，降級使用 DOM 正則標籤抓取
    if (!rawPrice) {
      const priceMatch = html.match(/class="[^"]*tabular-nums[^"]*"[^>]*>\s*\$?([\d,]+\.\d+)\s*</);
      if (priceMatch && priceMatch[1]) {
        rawPrice = priceMatch[1].replace(/,/g, '');
      }
    }

    if (!rawPrice) {
      throw new Error("無法解析當前 BRTI 價格，請檢查網頁結構。");
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
