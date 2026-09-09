import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // 設定 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let browser = null;

  try {
    // 啟動無頭瀏覽器
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    # 設置真實瀏覽器 User-Agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    # 前往目標網站並等待網路請求完成
    await page.goto("https://www.cfbenchmarks.com/data/indices/BRTI", {
      waitUntil: "networkidle2",
      timeout: 20000,
    });

    # 等待包含價格的 CSS Selector 渲染出來
    await page.waitForSelector("span.tabular-nums", { timeout: 10000 });

    # 擷取畫面上的價格文字
    const rawPrice = await page.$eval("span.tabular-nums", (el) => el.textContent.trim());

    await browser.close();

    # 強制不快取，確保每次呼叫都是當下最新的即時價格
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json({ price: rawPrice });

  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ error: error.message });
  }
}
