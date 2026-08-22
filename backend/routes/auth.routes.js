import { Router } from "express";
import { register } from "../controllers/auth.controller.js";

const router = Router();

// POST /api/auth/register
router.post("/register", register);

export default router;
