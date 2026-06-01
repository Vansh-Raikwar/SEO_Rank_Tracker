import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
})


const seoAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.INTEGER },
        categories: {
            type: Type.OBJECT,
            properties: {
                seo: { type: Type.INTEGER },
                performance: { type: Type.INTEGER },
                accessibility: { type: Type.INTEGER },
                bestPractices: { type: Type.INTEGER },
            },
            required: ["seo", "performance", "accessibility", "bestPractices"],
        },
        keywords: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    count: { type: Type.INTEGER },
                    density: { type: Type.NUMBER },
                },
                required: ["word", "count", "density"],
            },
        },
        issues: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    severity: {
                        type: Type.STRING,
                        format: "enum",
                        enum: ["critical", "warning", "info"],
                    },

                    category: { type: Type.STRING },
                    message: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                },
                required: ["severity", "category", "message", "recommendation"],
            },
        },
    },
    required: ["overallScore", "categories", "keywords", "issues"],
};


export async function analyzeSeoData(scrapedData) {
    try {
        const prompt = `You are an expert SEO analyst. Analyze the following website data and provide a comprehensive SEO audit.

        Website URL: ${scrapedData.url}
        Load Time: ${scrapedData.loadTime}ms
        Status Code: ${scrapedData.statusCode}
        Page Size: ${Math.round(scrapedData.pageSize / 1024)}KB
        Word Count: ${scrapedData.wordCount}

        META DATA:
        - Title: "${scrapedData.metaData?.title || ""}" (${(scrapedData.metaData?.title || "").length} chars)
        - Description: "${scrapedData.metaData?.description || ""}" (${(scrapedData.metaData?.description || "").length} chars)
        - Canonical: "${scrapedData.metaData?.canonical || ""}"
        - Robots: "${scrapedData.metaData?.robots || ""}"
        - OG Title: "${scrapedData.metaData?.ogTitle || ""}"
        - OG Description: "${scrapedData.metaData?.ogDescription || ""}"
        - OG Image: "${scrapedData.metaData?.ogImage || ""}"
        - Twitter Card: "${scrapedData.metaData?.twitterCard || ""}"
        - Viewport: "${scrapedData.metaData?.viewport || ""}"
        - Charset: "${scrapedData.metaData?.charset || ""}"

        HEADINGS:
        - H1: ${scrapedData.headings?.h1 || 0} (texts: ${JSON.stringify(scrapedData.headings?.h1Texts || [])})
        - H2: ${scrapedData.headings?.h2 || 0}
        - H3: ${scrapedData.headings?.h3 || 0}
        - H4: ${scrapedData.headings?.h4 || 0}
        - H5: ${scrapedData.headings?.h5 || 0}
        - H6: ${scrapedData.headings?.h6 || 0}

        LINKS:
        - Internal: ${scrapedData.links?.internal || 0}
        - External: ${scrapedData.links?.external || 0}
        - Total: ${scrapedData.links?.total || 0}

        IMAGES:
        - Total: ${scrapedData.images?.total || 0}
        - Missing Alt Text: ${scrapedData.images?.missingAlt || 0}
        - With Alt Text: ${scrapedData.images?.withAlt || 0}

        PAGE CONTENT (first 3000 chars):
        ${scrapedData.bodyText || ""}

        Scoring guidelines:
        - Title: 50-60 chars optimal, must exist
        - Description: 150-160 chars optimal, must exist
        - H1: exactly 1 is ideal
        - Images: all should have alt text
        - Load time: <3s good, <5s ok, >5s poor
        - Page size: <3MB good
        - Must have viewport meta, charset, canonical
        - OG tags and Twitter cards are important
        - Internal linking is good for SEO
        - Word count: >300 words for content pages
        - Check heading hierarchy

        You MUST respond with ONLY a JSON object in this exact structure:
        {
            "overallScore": <number 0-100>,
            "categories": {
                "seo": <number 0-100>,
                "performance": <number 0-100>,
                "accessibility": <number 0-100>,
                "bestPractices": <number 0-100>
            },
            "keywords": [
                { "word": "<string>", "count": <number>, "density": <number> }
            ],
            "issues": [
                { "severity": "critical"|"warning"|"info", "category": "<string>", "message": "<string>", "recommendation": "<string>" }
            ]
        }

        Rules:
        - overallScore: weighted average of all category scores
        - categories: each score 0-100 based on the data above
        - keywords: top 10 keywords from page content sorted by frequency
        - issues: 5-15 issues sorted by severity (critical first), be specific and actionable
        - severity must be exactly one of: "critical", "warning", "info"`;

        console.log("[GEMINI] Sending analysis request...");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: seoAnalysisSchema,
            }
        });

        const text = response.text;
        console.log("[GEMINI] Raw response length:", text?.length);

        // Clean up markdown code blocks if AI included them
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        let analysis;
        try {
            analysis = JSON.parse(cleanedText);
        } catch (parseError) {
            console.warn("[GEMINI] JSON parsing failed. Attempting robust string repairs...", parseError.message);
            try {
                // Strip comments if present, replace single quotes with double quotes, and clean trailing commas
                const repairedText = cleanedText
                    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1') // remove comments
                    .replace(/'/g, '"')                                  // fix quotes
                    .replace(/,\s*([\]}])/g, '$1');                     // fix trailing commas
                analysis = JSON.parse(repairedText);
            } catch (fallbackError) {
                console.error("[GEMINI] Repaired JSON parsing also failed. Raw response:", text);
                throw new Error("AI returned malformed JSON: " + fallbackError.message);
            }
        }

        // Validate required fields exist
        if (typeof analysis.overallScore !== "number" || !analysis.categories) {
            console.error("[GEMINI] Invalid response structure:", JSON.stringify(analysis).substring(0, 200));
            return { success: false, error: "AI returned invalid data structure" };
        }

        console.log("[GEMINI] Analysis complete. Score:", analysis.overallScore);
        return { success: true, data: analysis }

    } catch (error) {
        console.error("Error in SEO analysis : ", error.message);
        return { success: false, error: error.message }
    }
}