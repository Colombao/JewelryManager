import express from "express";

import {
  create,
  importBulk,
  kitsUsage,
  list,
  remove,
  update,
} from "../products/products.controller.js";

const router = express.Router();

router.get("/kits-usage", kitsUsage);
router.get("/", list);
router.post("/import", importBulk);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
