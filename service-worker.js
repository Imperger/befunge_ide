if(!self.define){let e,i={};const n=(n,o)=>(n=new URL(n+".js",o).href,i[n]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=i,document.head.appendChild(e)}else e=n,importScripts(n),i()})).then((()=>{let e=i[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e})));self.define=(o,f)=>{const s=e||("document"in self?document.currentScript.src:"")||location.href;if(i[s])return;let r={};const u=e=>n(e,s),d={module:{uri:s},exports:r,require:u};i[s]=Promise.all(o.map((e=>d[e]||u(e)))).then((e=>(f(...e),r)))}}define(["./workbox-5b385ed2"],(function(e){"use strict";e.setCacheNameDetails({prefix:"befunge"}),self.addEventListener("message",(e=>{e.data&&"SKIP_WAITING"===e.data.type&&self.skipWaiting()})),e.precacheAndRoute([{url:"/befunge_ide/css/app.0be4e203.css",revision:null},{url:"/befunge_ide/fonts/roboto-cyrillic-500-normal.6e4060e5.woff",revision:null},{url:"/befunge_ide/fonts/roboto-cyrillic-500-normal.aa68ea54.woff2",revision:null},{url:"/befunge_ide/fonts/roboto-cyrillic-ext-500-normal.a05054d8.woff",revision:null},{url:"/befunge_ide/fonts/roboto-cyrillic-ext-500-normal.a1b5c90d.woff2",revision:null},{url:"/befunge_ide/fonts/roboto-latin-500-normal.3170fd9a.woff2",revision:null},{url:"/befunge_ide/fonts/roboto-latin-500-normal.cdad2023.woff",revision:null},{url:"/befunge_ide/fonts/roboto-latin-ext-500-normal.41845160.woff",revision:null},{url:"/befunge_ide/fonts/roboto-latin-ext-500-normal.85ebfb55.woff2",revision:null},{url:"/befunge_ide/index.html",revision:"1330c485084b83ce7d672c4c179bad5a"},{url:"/befunge_ide/js/app.9584cc7c.js",revision:null},{url:"/befunge_ide/js/chunk-vendors.ff754771.js",revision:null},{url:"/befunge_ide/manifest.json",revision:"f47feef958e44c6214b1831ed8570c52"},{url:"/befunge_ide/robots.txt",revision:"b6216d61c03e6ce0c9aea6ca7808f7ca"},{url:"/befunge_ide/ui_icons/arrow_down.svg",revision:"2426c36e8d8130482d5a8093f69345e1"},{url:"/befunge_ide/ui_icons/arrow_right.svg",revision:"95dedda50f2235f860baaecae42b7fbd"},{url:"/befunge_ide/ui_icons/arrow_thin_all.svg",revision:"d7ed3efa004b00f08290dea688027e45"},{url:"/befunge_ide/ui_icons/arrow_thin_right.svg",revision:"fd2a393110d8f00cb4161f9d56001bda"},{url:"/befunge_ide/ui_icons/arrow_thin_up.svg",revision:"88f4d50e23bbf2be76f53a957ea86f71"},{url:"/befunge_ide/ui_icons/breakpoint.svg",revision:"9dd1e392a6130f53f754c5b323e096f0"},{url:"/befunge_ide/ui_icons/bug.svg",revision:"b768f2bff96871930ed8b4ecded809ca"},{url:"/befunge_ide/ui_icons/check_circle.svg",revision:"f9f4ec12557a1f5b9c46482e8aa150f4"},{url:"/befunge_ide/ui_icons/copy.svg",revision:"4fe1bea17affd70552420ea8fa8e5200"},{url:"/befunge_ide/ui_icons/cut.svg",revision:"2749985e7fcb77c6996e93348b8b1d28"},{url:"/befunge_ide/ui_icons/edit_delete.svg",revision:"683f20cd3d6bb0f69e069f03513397d4"},{url:"/befunge_ide/ui_icons/exclamation_circle.svg",revision:"8953c4b0cf655321c397ddb6bd6e5ff5"},{url:"/befunge_ide/ui_icons/exclamation_triangle.svg",revision:"1d4dc53df2ef1221326ddb7454666f6c"},{url:"/befunge_ide/ui_icons/heatmap.svg",revision:"067debb0c99765dd9979ce3b6c91f741"},{url:"/befunge_ide/ui_icons/input.svg",revision:"a9bef65c0529354474f7b8a11f9d3960"},{url:"/befunge_ide/ui_icons/open.svg",revision:"8280580e8c1ce08c0e27bd7d123a69d9"},{url:"/befunge_ide/ui_icons/output.svg",revision:"198913b874378714956f5e68d9d26cf5"},{url:"/befunge_ide/ui_icons/paste.svg",revision:"8f1500815aa3f217241362c1d90f1597"},{url:"/befunge_ide/ui_icons/play.svg",revision:"7375c9de99ccf22092ad36e058ff7ddb"},{url:"/befunge_ide/ui_icons/play_debug.svg",revision:"e3dd8dcb122766d1c02883accda9eeef"},{url:"/befunge_ide/ui_icons/redo.svg",revision:"8e16956c3c0889f7f2bddf927720d20d"},{url:"/befunge_ide/ui_icons/save.svg",revision:"8b1c34f8f851c3efd0e8bca84ef02405"},{url:"/befunge_ide/ui_icons/select.svg",revision:"c2c373214de3248c373426a8d8fac095"},{url:"/befunge_ide/ui_icons/settings.svg",revision:"47c636132ad817e8debcd21f4539d337"},{url:"/befunge_ide/ui_icons/share.svg",revision:"1ee5afe07a53b766c04d3cdd92d32291"},{url:"/befunge_ide/ui_icons/stop.svg",revision:"d1bebc65cf33f5136a7f25e6fdd6676c"},{url:"/befunge_ide/ui_icons/trash_can.svg",revision:"65a7f1193a46fbef07b92a624adece95"}],{})}));
//# sourceMappingURL=service-worker.js.map