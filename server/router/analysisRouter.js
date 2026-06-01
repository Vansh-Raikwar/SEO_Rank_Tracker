import express from "express";
import authMiddleware from "../middleware/auth.js";
import { analyzeUrl,getAnalysis,getAnalyses, deleteAnalysis, sendEmailReport, exportPdf } from "../controllers/analysisController.js";

const  analysisRouter = express.Router();

analysisRouter.post("/analyze",authMiddleware, analyzeUrl);
analysisRouter.get("/list",authMiddleware, getAnalyses);
analysisRouter.get("/:id",authMiddleware, getAnalysis);
analysisRouter.delete("/:id",authMiddleware, deleteAnalysis);   
analysisRouter.post("/:id/email",authMiddleware, sendEmailReport);
analysisRouter.get("/:id/pdf", exportPdf);

export default analysisRouter;
