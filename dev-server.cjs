'use strict';
// Simple local development server. Vercel uses the /api functions directly.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const card = require('./api/card');
const room = require('./api/room');
const base = __dirname;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async (req,res)=>{
  const url = new URL(req.url,'http://localhost');
  const pathName = url.pathname;
  if (pathName.startsWith('/r/')) { req.query={code:pathName.slice(3)}; return room(req,res); }
  if (pathName.startsWith('/og/')) { req.query={code:pathName.slice(4)}; return card(req,res); }
  const resource = pathName==='/' ? '/index.html' : pathName;
  const allowed = ['/index.html','/style.css','/app.js'];
  if (!allowed.includes(resource)) {res.statusCode=404;return res.end('Not found');}
  const file = path.join(base,resource.replace(/^\//,''));
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>{
  console.log(`RoomLink locally available at http://localhost:${process.env.PORT||3000}`);
});
