import express from "express";
import auth from "../middleware/auth.js";
import {addKeyword, getKeywords, getKeyword, refreshKeyword, deleteKeyword, toggleTracking} from "../controllers/rankController.js";

const rankRouter = express.Router();

rankRouter.post("/add",auth, addKeyword)

rankRouter.get("/list",auth, getKeywords)

rankRouter.get("/:id",auth, getKeyword)

rankRouter.post("/:id/refresh",auth, refreshKeyword)

rankRouter.delete("/:id/delete",auth, deleteKeyword)

rankRouter.put("/:id/toggle",auth, toggleTracking)

export default rankRouter;