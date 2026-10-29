// Node.js 24, no external dependencies. Deploy behind managed HTTPS ingress.
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
export function createGateway({ origin, scriptUrl, secret, enabled=false, fetcher=fetch }) {
  const buckets=new Map();
  const fields=['name','email','supervisorId','sectionId','topic','consent','consentVersion','requestId'];
  return createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Origin');
    const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
    if(req.headers.origin!==origin || !origin) return reply(403,{ok:false,code:'ORIGIN'});
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    if(req.url!=='/applications')return reply(404,{ok:false});
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    if(req.method!=='POST')return reply(405,{ok:false});
    if(!enabled || !secret || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(scriptUrl||''))return reply(503,{ok:false,code:'DISABLED'});
    // Do not trust X-Forwarded-For. For deployments behind a shared proxy,
    // configure per-client IP limiting at that trusted ingress as well.
    const now=Date.now();for(const [key,value] of buckets)if(value.until<=now)buckets.delete(key);
    const key=req.socket.remoteAddress;
    const bucket=buckets.get(key)||{until:now+600000,count:0};
    if(buckets.size>=10000&&!buckets.has(key))return reply(429,{ok:false});
    buckets.set(key,bucket);if(++bucket.count>5)return reply(429,{ok:false,code:'RATE_LIMIT'});
    if(!req.headers['content-type']?.startsWith('application/json'))return reply(415,{ok:false});
    try{
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>12000){reply(413,{ok:false});req.resume();return;}chunks.push(chunk);}
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!input || typeof input!=='object' || Array.isArray(input))return reply(400,{ok:false});
      const data=Object.fromEntries(fields.map(field=>[field,input[field]]));
      if(fields.some(field=>field==='consent'?data[field]!==true:typeof data[field]!=='string'))return reply(400,{ok:false,code:'INVALID'});
      const upstream=await fetcher(scriptUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,gatewaySecret:secret}),signal:AbortSignal.timeout(12000),redirect:'follow'});
      if(!upstream.ok)return reply(503,{ok:false,code:'UPSTREAM'});
      const receipt=await upstream.json();
      if(receipt.ok===true && receipt.status==='saved' && receipt.requestId===data.requestId && typeof receipt.receiptId==='string' && receipt.receiptId)return reply(200,{ok:true,status:'saved',requestId:data.requestId,receiptId:receipt.receiptId});
      const codes={INVALID:400,UNAUTHORIZED:403,DUPLICATE:409,IDEMPOTENCY_CONFLICT:409,RATE_LIMIT:429};
      return reply(codes[receipt.code]||503,{ok:false,code:codes[receipt.code]?receipt.code:'UNAVAILABLE'});
    }catch{return reply(503,{ok:false,code:'UNCONFIRMED'});}
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  createGateway({origin:process.env.SITE_ORIGIN,scriptUrl:process.env.APPS_SCRIPT_URL,secret:process.env.GATEWAY_SECRET,enabled:process.env.COLLECTION_APPROVED==='true'}).listen(Number(process.env.PORT||8080),'127.0.0.1');
}
