import cron from "node-cron";
import KeywordRankModel from "../models/keywordTracking.js";
import {keywordTracking} from "../services/keywordTrackingService.js"

// 0 = second
// 0 = minute
// * = hour  
// * = day
// * = month
// * = year

export function startRankTrackingCron() {
    cron.schedule("0 6 * * *", async()=>{  // run everyday 6am
        console.log("started daily rank tracking...")

        try {
            const activeTrackings = await KeywordRankModel.find({
                active:true
            })
            for(const tracking of activeTrackings){
                tracking.status = "checking";
                await tracking.save()

                const result = await keywordTracking(tracking);

                // delay between checks to avoid rate limiting 
                await new Promise(resolve => setTimeout(resolve, 1500+Math.random()*5000));
                
            }
            
        } catch (error) {
            console.error("[CRON] rank tracking cron error : ",error.message)
        }
    })
    console.log("Rank tracking cron service started")
}