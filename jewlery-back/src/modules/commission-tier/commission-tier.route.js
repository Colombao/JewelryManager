import express from "express";

import { create, list, remove, update } from "./commission-tier.controller.js";

const router = express.Router();

router.get("/", list);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
