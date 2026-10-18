import { Router } from "express";

import authRoutes from "./auth.routes.js";
import ejerciciosRoutes from "./ejercicios.routes.js";
import entrenamientosRoutes from "./entrenamientos.routes.js";
import perfilRoutes from "./perfil.routes.js";
import rolRoutes from "./rol.routes.js";
import rutinasRoutes from "./rutinas.routes.js";
import imagenesRoutes from "./imagenes.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/perfil", perfilRoutes);
router.use("/rol", rolRoutes);
router.use("/rutinas", rutinasRoutes);
router.use("/ejercicios", ejerciciosRoutes);
router.use("/entrenamientos", entrenamientosRoutes);
router.use("/imagenes", imagenesRoutes);

export default router;