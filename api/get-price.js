export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
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

    // 1. 從 Next.js __NEXT_DATA__ 抓取價格
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
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

    // 2. DOM 正則降級解析
    if (!rawPrice) {
      const priceMatch = html.match(/class="[^"]*tabular-nums[^"]*"[^>]*>\s*\$?([\d,]+\.\d+)\s*</);
      if (priceMatch && priceMatch[1]) {
        rawPrice = priceMatch[1].replace(/,/g, '');
      }
    }

    if (!rawPrice) {
      throw new Error("無法解析當前 BRTI 價格");
    }

    const numericPrice = Number(rawPrice);
    const now = new Date();

    // 強制指定時區為台灣時間 (Asia/Taipei)
    const formattedTime = now.toLocaleTimeString('zh-TW', {
      timeZone: 'Asia/Taipei',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 完整日期格式 (例: 2026/09/10)
    const formattedDate = now.toLocaleDateString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    return res.status(200).json({
      symbol: "BRTI",
      price: numericPrice,
      formatted_price: `$${numericPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      formatted_time: formattedTime,                           // 例: "14:35:08"
      formatted_datetime: `${formattedDate} ${formattedTime}`, // 例: "2026/09/10 14:35:08"
      timestamp: now.toISOString()
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
