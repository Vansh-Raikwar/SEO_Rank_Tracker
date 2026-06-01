import {rankTracker} from "./rankTrackerService.js";

export async function keywordTracking(tracking){
    try{
        let result;

        for(let attempt=1; attempt<=2; attempt++){
            result = await rankTracker(tracking.keyword, tracking.domain)

            if(result.success && result.data.totalResultsScanned>0) break;

            if(attempt<2){
                await new Promise((r)=> setTimeout(r, result.success? 3000 : 5000));
            }
        }

        if(result.success){
            const prev = tracking.currentPosition;
            const today = new Date();
            today.setHours(0,0,0,0);

            tracking.currentPosition = result.data.position;
            tracking.currentPage = result.data.page;
            tracking.competitors = result.data.competitors;
            tracking.lastChecked = new Date();
            tracking.status = "completed";

            tracking.positionChange = prev && result.data.position ? prev - result.data.position : 0;

            if (result.data.position !== null && result.data.position !== undefined) {
                if (tracking.bestPosition === null || tracking.bestPosition === undefined || result.data.position < tracking.bestPosition) {
                    tracking.bestPosition = result.data.position;
                }
            }

            const historyEntry = {
                date: new Date(),
                position: result.data.position,
                page: result.data.page,
                title: result.data.title,
                snippet: result.data.snippet
            }

            const lastEntry = tracking.rankHistory.length > 0 ? tracking.rankHistory[tracking.rankHistory.length - 1] : null;
            
            // If position changed or it's a new day, add new entry
            if (!lastEntry || lastEntry.position !== historyEntry.position || lastEntry.date.toDateString() !== historyEntry.date.toDateString()) {
                tracking.rankHistory.push(historyEntry);
            } else {
                // Otherwise update the last one
                tracking.rankHistory[tracking.rankHistory.length - 1] = historyEntry;
            }
            
        }else{
            tracking.status = "failed";
        }
        await tracking.save();

        return result;
    }
    catch(error){
        console.log("Rank Tracking Error : ", error.message);
        if (tracking) {
            tracking.status = "failed";
            await tracking.save().catch(()=>{})
        }

        return{
            success:false,
            error:error.message
        }
    }
}