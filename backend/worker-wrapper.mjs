// For an existing Worker project only. Preserve the current entrypoint as existing-worker.mjs.
import existing from './existing-worker.mjs';
import {handle} from './onsite.mjs';
export default {
 async fetch(request,env,ctx){const response=await handle(request,env);return response||existing.fetch(request,env,ctx);},
 async scheduled(event,env,ctx){if(existing.scheduled)return existing.scheduled(event,env,ctx);}
};
