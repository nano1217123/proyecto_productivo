import { Router } from "express";

import authRoutes from "./auth.routes.js";
import perfilRoutes from "./perfil.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/perfil", perfilRoutes);

export default router;