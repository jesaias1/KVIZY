import { createHmac,timingSafeEqual } from "node:crypto";
export const ADMIN_COOKIE="kvizy_admin";
function secret(){return process.env.ADMIN_SECRET??""}
export function token(){return createHmac("sha256",secret()).update("kvizy-admin-v1").digest("hex")}
export function validPassword(value:string){const s=secret();if(!s||value.length!==s.length)return false;return timingSafeEqual(Buffer.from(value),Buffer.from(s))}
export function validToken(value?:string){const expected=token();if(!secret()||!value||value.length!==expected.length)return false;return timingSafeEqual(Buffer.from(value),Buffer.from(expected))}
export function requestIsAdmin(request:Request){const cookie=request.headers.get("cookie")??"";const found=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(`${ADMIN_COOKIE}=`))?.split("=")[1];return validToken(found)}
