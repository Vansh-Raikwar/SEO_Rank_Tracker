import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

// ---- Cheerio-based extraction (works on raw HTML string) ----
function extractFromHtml(html, url) {
    const $ = cheerio.load(html);
    const pageSize = Buffer.byteLength(html, "utf8");

    const getMeta = (name) => {
        return $(`meta[name="${name}"]`).attr("content") || $(`meta[property="${name}"]`).attr("content") || "";
    };

    const metaData = {
        title: $("title").text().trim() || "",
        description: getMeta("description"),
        canonical: $('link[rel="canonical"]').attr("href") || "",
        robots: getMeta("robots"),
        ogTitle: getMeta("og:title"),
        ogDescription: getMeta("og:description"),
        ogImage: getMeta("og:image"),
        twitterCard: getMeta("twitter:card"),
        viewport: getMeta("viewport"),
        charset: $("meta[charset]").attr("charset") || "",
    };

    const h1Elements = $("h1");
    const h1Texts = [];
    h1Elements.each((_, el) => h1Texts.push($(el).text().trim()));

    const headings = {
        h1: h1Elements.length,
        h2: $("h2").length,
        h3: $("h3").length,
        h4: $("h4").length,
        h5: $("h5").length,
        h6: $("h6").length,
        h1Texts,
    };

    const currentHost = new URL(url).hostname;
    let internalLinks = 0;
    let externalLinks = 0;

    $("a[href]").each((_, el) => {
        try {
            const href = $(el).attr("href");
            if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;
            const linkUrl = new URL(href, url);
            if (linkUrl.hostname === currentHost) internalLinks++;
            else externalLinks++;
        } catch { }
    });

    const allImages = $("img");
    let missingAlt = 0;
    allImages.each((_, el) => {
        const alt = $(el).attr("alt");
        if (!alt || alt.trim() === "") missingAlt++;
    });

    $("script, style, noscript").remove();
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

    return {
        metaData,
        headings,
        links: { internal: internalLinks, external: externalLinks, total: internalLinks + externalLinks },
        images: { total: allImages.length, missingAlt, withAlt: allImages.length - missingAlt },
        pageSize,
        wordCount,
        bodyText: bodyText.substring(0, 3000),
    };
}

// ---- Detect if the page is a bot-check / captcha ----
function isBotBlocked(extracted) {
    const title = (extracted.metaData.title || "").toLowerCase();
    const blocked = ["captcha", "checking your browser", "just a moment", "access denied", "attention required", "cloudflare"];
    return extracted.wordCount < 50 && blocked.some((kw) => title.includes(kw));
}

// ---- Fast scrape via axios + cheerio ----
async function scrapeWithAxios(url) {
    console.log("[SCRAPER] Trying fast fetch...");
    const startTime = Date.now();

    const response = await axios.get(url, {
        timeout: 30000,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
        maxRedirects: 5,
    });

    const loadTime = Date.now() - startTime;
    const html = response.data;
    const extracted = extractFromHtml(html, url);

    return { ...extracted, loadTime, statusCode: response.status, url };
}

// ---- Fallback scrape via Puppeteer (local headless browser) ----
async function scrapeWithPuppeteer(url) {
    console.log("[SCRAPER] Falling back to stealth headless browser...");
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--window-size=1920,1080",
            ],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        const startTime = Date.now();
        const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

        // Wait for potential captcha/cloudflare checks to resolve
        // Check every 2s up to 15s if we're still on a captcha page
        for (let i = 0; i < 5; i++) {
            const title = await page.title();
            const titleLower = title.toLowerCase();
            const isBlocked = ["captcha", "checking your browser", "just a moment", "attention required"].some(kw => titleLower.includes(kw));
            if (!isBlocked) break;
            console.log(`[SCRAPER] Still on check page ("${title}"), waiting...`);
            await new Promise(r => setTimeout(r, 3000));
        }

        const loadTime = Date.now() - startTime;
        const html = await page.content();
        const statusCode = response ? response.status() : 0;

        await browser.close();
        browser = null;

        const extracted = extractFromHtml(html, url);
        console.log("[SCRAPER] Browser extracted:", {
            title: extracted.metaData.title.substring(0, 50),
            headings: `H1:${extracted.headings.h1} H2:${extracted.headings.h2} H3:${extracted.headings.h3}`,
            words: extracted.wordCount,
        });

        return { ...extracted, loadTime, statusCode, url };
    } catch (err) {
        if (browser) await browser.close().catch(() => { });
        throw err;
    }
}

// ---- Main export ----
export async function scrapeUrl(url) {
    try {
        // Try fast axios first
        const axiosResult = await scrapeWithAxios(url);

        // Check if we got a real page or a bot-check
        if (isBotBlocked(axiosResult)) {
            console.log("[SCRAPER] Bot-check detected, switching to browser...");
            const browserResult = await scrapeWithPuppeteer(url);
            console.log("[SCRAPER] Done via browser in", browserResult.loadTime, "ms");
            return { success: true, data: browserResult };
        }

        console.log("[SCRAPER] Done via fast fetch in", axiosResult.loadTime, "ms,", axiosResult.wordCount, "words");
        return { success: true, data: axiosResult };

    } catch (err) {
        // If axios fails entirely (e.g. connection refused), try puppeteer
        console.log("[SCRAPER] Fast fetch failed:", err.message, "— trying browser...");
        try {
            const browserResult = await scrapeWithPuppeteer(url);
            console.log("[SCRAPER] Done via browser fallback in", browserResult.loadTime, "ms");
            return { success: true, data: browserResult };
        } catch (browserErr) {
            console.error("[SCRAPER] Both methods failed:", browserErr.message);
            return { success: false, message: browserErr.message };
        }
    }
}
