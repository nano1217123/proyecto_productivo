import { Router } from "express";

import authRoutes from "./auth.routes.js";
import nutritionRoutes from "./nutrition.routes.js";
import ejerciciosRoutes from "./ejercicios.routes.js";
import entrenamientosRoutes from "./entrenamientos.routes.js";
import perfilRoutes from "./perfil.routes.js";
import rolRoutes from "./rol.routes.js";
import rutinasRoutes from "./rutinas.routes.js";
import imagenesRoutes from "./imagenes.routes.js";
import resenasRoutes from "./resenas.routes.js";
import reportesPersonalesRoutes from "./reportesPersonales.routes.js";
import reportesMembresiasRoutes from "./reportesMembresias.routes.js";

import progresoRoutes from "./progreso.routes.js";
import particularRoutes from "./particular.routes.js"; 
import pagosRoutes from "./pagos.routes.js";
import { gestionRouter, sedesRouter } from "./gestion.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/perfil", perfilRoutes);
router.use("/nutricion", nutritionRoutes);
router.use("/rol", rolRoutes);
router.use("/rutinas", rutinasRoutes);
router.use("/ejercicios", ejerciciosRoutes);
router.use("/entrenamientos", entrenamientosRoutes);
router.use("/imagenes", imagenesRoutes);
router.use("/resenas", resenasRoutes);
router.use("/reportes/personales", reportesPersonalesRoutes);
router.use("/reportes/membresias", reportesMembresiasRoutes);

router.use("/progreso", progresoRoutes);
router.use("/particular", particularRoutes);
router.use("/pagos", pagosRoutes);
router.use("/sedes", sedesRouter);
router.use("/gestion", gestionRouter);

export default router;
