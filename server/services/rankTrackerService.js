export async function rankTracker(keyword, targetDomain) {
    try {
        if (!keyword || !targetDomain) {
            throw new Error("Keyword and targetDomain are required");
        }

        // The user saved the Serper API key in the BROWSERBASE_API_KEY environment variable
        const apiKey = process.env.BROWSERBASE_API_KEY; 
        if (!apiKey) {
            throw new Error("Serper.dev API key is missing from environment variables");
        }

        const cleanTarget = targetDomain.replace("www.", "").toLowerCase();
        
        console.log(`Searching for "${keyword}" using Serper API...`);




        // fetchserper
        


        let found = null;
        let competitors = [];
        let totalOrganicResults = [];
        const maxResults = 500; // Search up to 500 results (50 pages)
        const resultsPerPage = 100;

        for (let page = 1; page <= Math.ceil(maxResults / resultsPerPage); page++) {
            const currentStart = ((page - 1) * resultsPerPage) + 1;
            const currentEnd = page * resultsPerPage;
            console.log(`>>> Initiating Scan: Results ${currentStart} to ${currentEnd} <<<`);
            
            const response = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: keyword,
                    gl: "in",
                    hl: "en",
                    num: resultsPerPage,
                    page: page
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Serper API error on page ${page}: ${errorText}`);
                break;
            }

            const data = await response.json();
            const pageResults = data.organic || [];
            console.log(`Serper returned ${pageResults.length} organic results for this batch.`);

            for (const r of pageResults) {
                try {
                    if (!r.link) continue;
                    
                    const urlObj = new URL(r.link);
                    const resultDomain = urlObj.hostname.replace("www.", "").toLowerCase();
                    
                    console.log(`[Pos ${r.position}] Checking: ${resultDomain}`);
                    
                    const isMatch = resultDomain === cleanTarget || resultDomain.endsWith("." + cleanTarget);
                    
                    if (!found && isMatch) {
                        found = {
                            position: r.position,
                            page: Math.ceil(r.position / 10),
                            title: r.title || "",
                            snippet: r.snippet || "",
                        };
                        console.log(`✅ MATCH FOUND: ${targetDomain} at Position ${r.position}`);
                    }

                    // Collect competitors from the scan
                    if (!isMatch && competitors.length < 10 && !cleanTarget.includes(resultDomain)) {
                        competitors.push({
                            domain: resultDomain,
                            title: r.title || "",
                            snippet: r.snippet || "",
                            url: r.link,
                            position: r.position
                        });
                    }
                } catch (e) {
                    continue;
                }
            }

            totalOrganicResults = totalOrganicResults.concat(pageResults);
            
            if (found) break;
        }

        if (!found) {
            console.log(`❌ Done scanning. ${targetDomain} NOT FOUND in top ${totalOrganicResults.length} results.`);
        }

        return {
            success: true,
            data: {
                keyword,
                targetDomain,
                position: found?.position || null,
                page: found?.page || null,
                title: found?.title || "",
                snippet: found?.snippet || "",
                competitors,
                totalResultsScanned: totalOrganicResults.length
            }
        };

    } catch (error) {
        console.log("Rank Tracking API Error:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}
