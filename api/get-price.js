export default async function handler(req, res) {
  // 設定 CORS 允許 Webflow 呼叫
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    const html = await response.text();

    // 1. 優先嘗試從 HTML 內嵌的 __NEXT_DATA__ JSON 數據中精確解析 BRTI 實時價格
    let price = null;
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);

    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        // 遞迴尋找 JSON 中的 BRTI 價格數值
        const findPrice = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          if ((obj.id === 'BRTI' || obj.ticker === 'BRTI') && (obj.price || obj.value)) {
            return obj.price || obj.value;
          }
          for (const key of Object.keys(obj)) {
            const found = findPrice(obj[key]);
            if (found) return found;
          }
          return null;
        };
        const parsedPrice = findPrice(nextData);
        if (parsedPrice) {
          price = `$${Number(parsedPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      } catch (e) {
        console.error("JSON 解析失敗，改用 DOM 匹配");
      }
    }

    // 2. 若 JSON 沒取到，降級使用正則精確匹配 DOM 上的 price 欄位
    if (!price) {
      const priceMatch = html.match(/class="[^"]*tabular-nums[^"]*"[^>]*>\s*(\$[\d,]+\.\d+)\s*</);
      if (priceMatch && priceMatch[1]) {
        price = priceMatch[1].trim();
      }
    }

    // 防快取 Header，確保每一次請求都是即時資料
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    if (price) {
      return res.status(200).json({ price: price });
    } else {
      return res.status(404).json({ error: "無法解析即時價格" });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
