// Copy to functions/[[path]].js in a Cloudflare Pages project with no existing catch-all.
import {handle} from '../backend/onsite.mjs';
export async function onRequest(context){return (await handle(context.request,context.env))||context.next();}
