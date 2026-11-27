import assert from "node:assert/strict";
import { once } from "node:events";
import { after, mock, test } from "node:test";
import express from "express";
import { parse } from "csv-parse/sync";

const admin = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const superAdmin = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const cliente = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const roles = new Map([[admin,"admin"],[superAdmin,"super_admin"],[cliente,"cliente"]]);
const consulta = mock.fn(async (sql: {text: string; values: unknown[]}) => {
  const [actor, , sede, alcance] = sql.values;
  assert.match(sql.text, /FROM public.admin_sedes/);
  assert.match(sql.text, /WHERE p.autorizado AND m.gym_slug = ANY/);
  assert.match(sql.text, /LEFT JOIN candidatas c ON r.estado = 'ok'/);
  if (actor && sede !== "jj-poblado") return [{estado:"prohibido",sede:null,alta:null,nombre:null}];
  if ((alcance as string[]).includes("jj-poblado")) {
    return [{estado:"ok",sede:"jj-poblado",alta:new Date("2026-11-27T05:00:00Z"),nombre:"=1+1"}];
  }
  return [{estado:"ok",sede:null,alta:null,nombre:null}];
});
mock.module(new URL("../src/lib/prisma.ts",import.meta.url).href,{
  namedExports:{prisma:{$queryRaw:consulta,usuario:{findUnique:async ({where}: {where:{idusuario:string}}) =>
    ({tipoUsuario:roles.get(where.idusuario)})}}},
});
mock.module(new URL("../src/middleware/auth.middleware.ts",import.meta.url).href,{
  namedExports:{requireAuth: (req:express.Request,res:express.Response,next:express.NextFunction)=>{
    const id=req.get("x-fixture");
    if(!id) return res.sendStatus(401);
    req.userId=id;
    next();
  }},
});
const {default:router}=await import("../src/routes/reportesMembresias.routes.js");
const {errorHandler}=await import("../src/middleware/error.middleware.js");
const server=express().use(router).use(errorHandler).listen(0,"127.0.0.1");
after(()=>server.close());
await once(server,"listening");
const addr=server.address();
assert.ok(addr && typeof addr!=="string");
const get=(ruta:string,usuario?:string)=>fetch(`http://127.0.0.1:${addr.port}/${ruta}`,{
  headers:usuario?{"x-fixture":usuario}:{},
});

test("autoriza al administrador solo en su sede y reserva el consolidado",async()=>{
  for(const [ruta,usuario,status] of [
    ["sede/jj-poblado.csv",undefined,401],["sede/jj-poblado.pdf",cliente,403],
    ["sede/power-laureles.csv",admin,403],["consolidado.pdf",admin,403],
    ["sede/jj-poblado.csv?usuarioId=otro",admin,400],
    ["sede/jj-poblado.pdf?desde=2026-11-28&hasta=2026-11-27",admin,400],
  ] as const){
    const r=await get(ruta,usuario);
    assert.equal(r.status,status);
    assert.equal(r.headers.get("content-disposition"),null);
    await r.text();
  }
  const r=await get("sede/jj-poblado.csv?desde=2026-11-27&hasta=2026-11-27",admin);
  assert.equal(r.status,200);
  assert.equal(r.headers.get("cache-control"),"private, no-store");
  const bytes=Buffer.from(await r.arrayBuffer());
  assert.equal(bytes.subarray(0,3).toString("hex"),"efbbbf");
  assert.deepEqual(parse(bytes,{bom:true})[1],["jj-poblado","2026-11-27T05:00:00.000Z","[texto] =1+1","vínculo actual"]);
  const sql=consulta.mock.calls.at(-1)!.arguments[0];
  assert.deepEqual(sql.values.slice(0,4),[admin,admin,"jj-poblado",["jj-poblado"]]);
  assert.match(sql.text,/America\/Bogota/);
});

test("el superadministrador recibe PDF y un CSV consolidado con sedes vacías",async()=>{
  const csv=await get("consolidado.csv",superAdmin);
  assert.equal(csv.status,200);
  const filas=parse(await csv.text(),{columns:true});
  assert.equal(filas.length,3);
  assert.ok(filas.some((f: {sede:string; miembro:string})=>f.sede==="fit-belen"&&f.miembro===""));
  for(const path of ["consolidado.pdf","sede/fit-belen.pdf"]){
    const pdf=await get(path,superAdmin);
    assert.equal(pdf.status,200);
    assert.equal(pdf.headers.get("content-type"),"application/pdf");
    const bytes=Buffer.from(await pdf.arrayBuffer());
    assert.equal(bytes.subarray(0,5).toString(),"%PDF-");
    assert.match(bytes.subarray(-32).toString(),/%%EOF/);
  }
});
