import express from "express";

import {
  create,
  importBulk,
  list,
  remove,
  update,
} from "../products/products.controller.js";

const router = express.Router();

router.get("/", list);
router.post("/import", importBulk);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
