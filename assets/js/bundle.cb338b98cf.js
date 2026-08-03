window.lastVisibleUrl=window.location.href;window.alertOpen=!1;window.queue=[];setTimeout(()=>{window.addEventListener("popstate",()=>{if(typeof zigry!=="undefined")zigry.load(window.location.href);})},100);const zigry=(window.zigry={hooks:{beforeMount:[],afterMount:[],beforeNavigate:[],afterNavigate:[],beforeFormSubmit:[],onFormSubmit:[],onAssetsLoaded:[],},escapeHtml(str){if(!str)return"";const map={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;",};return str.replace(/[&<>"']/g,(m)=>map[m])},use(name,callback){if(!zigry.hooks[name])zigry.hooks[name]=[];zigry.hooks[name].push(callback)},runHooks(name,payload){(zigry.hooks[name]||[]).forEach((fn)=>fn(payload))},audioCache:{},playSound(filename){const soundUrls={"message_send.mp3":"https://cdn.jsdelivr.net/npm/whatsapp-notification-sound@1.0.0/notification.mp3","story_share.mp3":"https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3","feed_share.mp3":"https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3","link_copy.mp3":"https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3","external_share.mp3":"https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3",};const soundUrl=soundUrls[filename];if(!soundUrl){console.warn(`Sound file not found: ${filename}`);return}
if(!this.audioCache[filename]){const audio=new Audio();audio.preload="auto";audio.src=soundUrl;this.audioCache[filename]=audio}
this.audioCache[filename].play().catch((e)=>console.warn(`Sound play failed for ${filename}:`,e))},mount(html,props={}){const app=document.getElementById("zigry-app");let root;if(html){root=document.createElement("div");root.innerHTML=html}else{root=app||document}
for(let[k,v]of Object.entries(props)){root.querySelectorAll(`[data-prop="${k}"]`).forEach((el)=>{if(typeof v==="object"&&v!==null){if(v.href&&el.tagName==="BUTTON"){const anchor=document.createElement("a");for(let attr of el.attributes){anchor.setAttribute(attr.name,attr.value)}
el.replaceWith(anchor);el=anchor}
if(v.label)el.innerHTML=v.label;if(v.action)el.setAttribute("data-action",v.action);if(v.href)el.setAttribute("href",v.href);if(v.class)el.className=v.class;if(typeof replaceZigryIcons==="function"){replaceZigryIcons(el)}}else{el.textContent=v}})}
if(html&&app){app.innerHTML="";app.appendChild(root)}(async()=>{const scripts=Array.from(root.querySelectorAll("script"));for(const oldScript of scripts){const src=oldScript.src||null;const type=oldScript.type||null;oldScript.remove();if(src){await new Promise((resolve)=>{const s=document.createElement("script");if(type)s.type=type;s.src=src+(src.includes("?")?"&":"?")+"v="+Date.now();s.async=!1;s.onload=resolve;s.onerror=resolve;document.body.appendChild(s)});continue}
const code=oldScript.textContent.trim();if(!code)continue;try{const s=document.createElement("script");s.text=code;document.body.appendChild(s);s.remove()}catch(err){console.warn("Script execution failed",err)}}
try{zigry.bindForms()}catch(e){}})()},navigate(href){zigry.runHooks("beforeNavigate",{href});const target=new URL(href,location.href);const current=new URL(location.href);if(target.hostname!==current.hostname){window.location.href=target.href;return}
if(target.hash&&target.pathname===current.pathname&&target.search===current.search&&target.hash!==current.hash){history.pushState({},"",target.href);return}
history.pushState({},"",target.href);zigry.load(target.href);zigry.runHooks("afterNavigate",{href})},load(href){const currentReferrer=lastVisibleUrl;lastVisibleUrl=href;zigry.loader(!0);zigry.prefetchUserLocation();const geo=window.zigryGeo??{};fetch(href,{headers:{"X-Requested-With":"Zigry-Ajax",location:encodeURIComponent(JSON.stringify(geo)),"X-Referer":currentReferrer,},}).then((r)=>{if(r.redirected){zigry.navigate(r.url);zigry.loader(!1);return}
return r.json()}).then((p)=>{currentPage=0;hasMore=!0;if(p.html)zigry.mount(p.html,p.props);const scroller=document.querySelector(".zigry-scroll");if(scroller)scroller.scrollTop=0;if(p.title)zigry.updateHead(p.title,p.meta);zigry.updateCanonical(p.canonical??window.location.href);zigry.setActiveLink(href);if(p.assets)zigry.loadAssets(p.assets);if(p?.alert)
zigry.alert({message:p.alert,type:p.type??"error",position:p.position??"top-right",});setupObserver();zigry.loader(!1);if(p.redirect!==null&&p.redirect!==undefined){setTimeout(()=>zigry.reload(p.redirect),500)}
zvalid();const appRoot=document.getElementById("zigry-app");initApp(appRoot);zScroll();initEmoji();reverse_counter();initTabs();zigry.runHooks("afterMount",{html:p.html,props:p.props})}).catch((e)=>{console.log(e);zigry.loader(!1);if(!navigator.onLine){zigry.offline();zigry.updateHead("Offline");return}
if(typeof zigry.error==="function"){zigry.error({title:"Unable to Load Page",message:"We couldn't load the content you requested. Please check your connection and try again.",retry:href,})}else{window.location.href=href}});document.querySelectorAll(".encrypted").forEach(decryptAndSetProtectedMedia)},reload(url){window.location.replace(url)},error({title,message,retry}){const app=document.getElementById("zigry-app");if(!app)return;const retryHtml=retry?`<button onclick="zigry.load('${retry}')" class="btn btn-primary px-4 rounded-pill">Try Again</button>`:`<button onclick="window.location.reload()" class="btn btn-primary px-4 rounded-pill">Refresh Page</button>`;app.innerHTML=`
            <div class="d-flex flex-column align-items-center justify-content-center min-vh-50 py-5 text-center">
                <div class="mb-4 text-muted opacity-50">
                    <svg class="zigry" style="width: 64px; height: 64px;">
                        <use href="#z-alert-circle" xlink:href="#z-alert-circle"></use>
                    </svg>
                </div>
                <h4 class="fw-bold mb-2">${title || "Something went wrong"}</h4>
                <p class="text-muted mb-4" style="max-width: 400px;">${message || "An unexpected error occurred."}</p>
                ${retryHtml}
                <div class="mt-4">
                    <a href="/" zigry-link class="text-decoration-none small text-muted">Back to Home</a>
                </div>
            </div>
        `;zigry.loader(!1)},generateVideoThumbnail(file){return new Promise((resolve)=>{if(!file.type.startsWith("video/")){return resolve(null)}
const video=document.createElement("video");video.preload="metadata";video.src=URL.createObjectURL(file);video.muted=!0;video.playsInline=!0;video.onloadeddata=()=>{video.currentTime=1};video.onseeked=()=>{const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext("2d");ctx.drawImage(video,0,0,canvas.width,canvas.height);URL.revokeObjectURL(video.src);canvas.toBlob((blob)=>{resolve(new File([blob],"thumbnail.jpg",{type:"image/jpeg"}))},"image/jpeg",0.8,)}})},bindForms(){document.querySelectorAll("form[zigry-form]").forEach((f)=>{if(f.dataset.zigryBound)return;f.dataset.zigryBound="1";f.addEventListener("submit",async(e)=>{e.preventDefault();const confirmMsg=f.getAttribute("data-zigry-confirm");if(confirmMsg){const confirmed=await zigry.alert({title:"Confirm Action",message:confirmMsg,type:"warning",duration:0,buttons:[{label:"Yes, Proceed",class:"btn-primary",value:!0},{label:"Cancel",class:"btn-secondary",value:!1},],});if(!confirmed)return}
const csrfInput=document.querySelector('input[name="_token"]');const csrfMeta=document.querySelector('meta[name="csrf-token"]');const csrf=csrfInput?.value??csrfMeta?.content??"";const action=f.getAttribute("action")||location.href;const d=new FormData(f);zigry.loader(!0);const videoInput=f.querySelector('input[type="file"][accept^="video/"]',);if(videoInput&&videoInput.files&&videoInput.files.length>0){for(let i=0;i<videoInput.files.length;i++){const file=videoInput.files[i];const thumbnailFile=await zigry.generateVideoThumbnail(file);if(thumbnailFile){d.append("video_thumbnails[]",thumbnailFile)}else{d.append("video_thumbnails[]",new Blob([],{type:"application/octet-stream"}),"empty.bin",)}}}
const geo=window.zigryGeo;let method=(f.getAttribute("method")||"POST").toUpperCase();const hiddenMethod=f.querySelector('input[name="_method"]');if(hiddenMethod){method=hiddenMethod.value.toUpperCase()}
const canHaveBody=!["GET","HEAD"].includes(method);fetch(action,{method:method,credentials:"include",headers:{"X-Requested-With":"Zigry-Ajax","X-CSRF-Token":csrf,location:encodeURIComponent(JSON.stringify(geo)),},body:canHaveBody?d:undefined,}).then((r)=>{if(r.redirected){zigry.navigate(r.url);zigry.loader(!1);return}
return r.json()}).then((p)=>{if(p?.toast)zigry.toast(p.toast,p.type??"");if(p?.alert)
zigry.alert({message:p.alert,type:p.type??"error",position:p.position??"top-right",});if(p?.notify)zigry.notify(p.notify,p.type??"");if(p?.html||p?.props)zigry.mount(p.html,p.props||{});if(p?.title)zigry.updateHead(p.title,p.meta||{});zigry.loader(!1);zigry.runHooks("afterFormSubmit",p);if(p.redirect!==null&&p.redirect!==undefined){setTimeout(()=>zigry.reload(p.redirect),500)}
const onSuccess=f.getAttribute("data-zigry-onsuccess");if(onSuccess&&typeof window[onSuccess]==="function"){window[onSuccess](p,f)}}).catch((e)=>{zigry.alert({message:"Somthing went wrong",type:"error",position:"center",duration:0,buttons:[{label:"Ok",class:"btn-danger"}],});zigry.loader(!1)})})})},async prefetchUserLocation(){const getCanonicalTimezone=(tz)=>tz==="Asia/Calcutta"?"Asia/Kolkata":tz;const CACHE_KEY="zigry-ip-location";const CACHE_TTL=60*60*1000;let usedCache=!1;async function getIpLocationFallback(){const cached=localStorage.getItem(CACHE_KEY);if(cached){const{data,timestamp}=JSON.parse(cached);if(Date.now()-timestamp<CACHE_TTL){usedCache=!0;return data}}
const sources=[async()=>{const res=await fetch("//ipapi.co/json");const json=await res.json();if(json.ip&&json.latitude&&json.longitude&&json.city&&json.region&&json.country_name){return{country:json.country_name,countryCode:json.country,region:json.region_code||json.region,regionName:json.region,city:json.city,latitude:parseFloat(json.latitude),longitude:parseFloat(json.longitude),timezone:getCanonicalTimezone(json.timezone),isp:json.org||"",ip:json.ip,accuracy:50000,}}},async()=>{const res=await fetch("//ipwho.is");const json=await res.json();if(json.success&&json.ip&&json.latitude&&json.longitude){return{country:json.country,countryCode:json.country_code,region:json.region,regionName:json.region,city:json.city,latitude:json.latitude,longitude:json.longitude,timezone:getCanonicalTimezone(json.timezone?.id||""),isp:json.connection?.isp||"",ip:json.ip,accuracy:50000,}}},async()=>{const res=await fetch("//freeipapi.com/api/json");const json=await res.json();if(json.IPv4&&json.latitude&&json.longitude){return{country:json.countryName,countryCode:json.countryCode,region:json.regionName,regionName:json.regionName,city:json.cityName,latitude:parseFloat(json.latitude),longitude:parseFloat(json.longitude),timezone:getCanonicalTimezone(json.time_zone||""),isp:json.isp||"",ip:json.IPv4,accuracy:50000,}}},];for(const trySource of sources){try{const data=await trySource();if(data?.latitude&&data?.longitude){localStorage.setItem(CACHE_KEY,JSON.stringify({data,timestamp:Date.now()}),);return data}}catch(e){console.warn("IP fallback source failed:",e.message)}}
return null}
const ipData=await getIpLocationFallback();const timezone=getCanonicalTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone,);let geoData={...ipData,timezone,};try{document.addEventListener("click",async()=>{const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:!0,timeout:5000,maximumAge:60000,}),);const{latitude,longitude,accuracy}=position.coords;geoData.latitude=latitude;geoData.longitude=longitude;geoData.accuracy=accuracy;geoData.source="gps"})}catch(e){console.warn("Geolocation failed:",e.message);geoData.source="ip"}
localStorage.setItem(CACHE_KEY,JSON.stringify({data:geoData,timestamp:Date.now()}),);window.zigryGeo=geoData},updateCanonical(url=window.location.href){let tag=document.querySelector('link[rel="canonical"]');if(!tag){tag=document.createElement("link");tag.rel="canonical";document.head.appendChild(tag)}
tag.href=url},updateHead(title,meta={},separator=" - "){const titleElement=document.querySelector("title");if(!titleElement.dataset.baseTitle){const sepRegex=/\s[-|>]{1,2}\s/;const parts=document.title.split(sepRegex);titleElement.dataset.baseTitle=parts[0].trim()}
const baseTitle=titleElement.dataset.baseTitle;document.title=title?`${baseTitle}${separator}${title}`:baseTitle;Object.entries(meta).forEach(([key,content])=>{let attribute="name";if(key.startsWith("og:")){attribute="property"}else if(key.startsWith("twitter:")){attribute="name"}
let tag=document.querySelector(`meta[${attribute}="${key}"]`);if(!tag){tag=document.createElement("meta");tag.setAttribute(attribute,key);document.head.appendChild(tag)}
tag.setAttribute("content",content)})},toast(msg,type="success"){const box=document.getElementById("zigry-toast");const t=document.createElement("div");t.className=`toast align-items-center text-white bg-${type} border-0 show mb-2 p-2`;t.textContent=msg;box.appendChild(t);setTimeout(()=>t.remove(),3000)},notify(notify=null,type="success"){for(let[k,v]of Object.entries(notify)){const input=document.querySelector(`[name="${k}"]`);let errorMessageElement=document.createElement("div");errorMessageElement.className=`notify-wrapper w-100 text-left mt-1 ${
        type === "danger" ? "text-danger" : "text-success"
      }`;errorMessageElement.style.position="absolute";errorMessageElement.style.top=`${
        input.offsetTop + input.offsetHeight
      }px`;errorMessageElement.style.left=`0`;errorMessageElement.style.zIndex="1000";errorMessageElement.innerHTML=`<div class="notify-text small p-1 opacity-50">${v}</div>`;input.parentNode.appendChild(errorMessageElement);setTimeout(()=>errorMessageElement.remove(),10000)}},alert({title,message,type=null,position="center",buttons=[],duration=3000,multiple=!1,anchor=null,width=360,height=null,}){return new Promise((resolve)=>{if(typeof alertOpen==="undefined")window.alertOpen=!1;if(typeof queue==="undefined")window.queue=[];if(alertOpen&&!multiple){queue.push(()=>zigry.alert({title,message,type,buttons,duration,multiple,anchor,width,height,position,}).then(resolve),);return}
alertOpen=!0;const isDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;const bgColor=isDark?"#2b2b2b":"#ffffff";const textColor=isDark?"#ffffff":"#333333";const borderColor=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)";const overlayColor=isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.12)";let zone=document.getElementById("toastZone");if(!zone){zone=document.createElement("div");zone.id="toastZone";document.body.appendChild(zone)}
Object.assign(zone.style,{display:"flex",alignItems:position.includes("top")?"flex-start":position.includes("bottom")?"flex-end":"center",justifyContent:position.includes("left")?"flex-start":position.includes("right")?"flex-end":"center",pointerEvents:"auto",position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh",zIndex:"9999",background:overlayColor,padding:"1rem",});const icons={success:`<div class="zigry-icon zigry-success"><div class="zigry-success-line-tip"></div><div class="zigry-success-line-long"></div></div>`,error:`<div class="zigry-icon zigry-error"><div class="zigry-error-line zigry-error-left"></div><div class="zigry-error-line zigry-error-right"></div></div>`,danger:`<div class="zigry-icon zigry-error"><div class="zigry-error-line zigry-error-left"></div><div class="zigry-error-line zigry-error-right"></div></div>`,warning:`<div class="zigry-icon zigry-warning">!</div>`,info:`<div class="zigry-icon zigry-info"><span>i</span></div>`,question:`<div class="zigry-icon zigry-question"><span>?</span></div>`,};const toast=document.createElement("div");toast.className="zigry-toast";toast.style.minWidth=typeof width==="number"?width+"px":width;toast.style.width=typeof width==="number"?width+"px":width;if(height)
toast.style.maxHeight=typeof height==="number"?height+"px":height;toast.tabIndex=-1;toast.style.setProperty("--zigry-bg",bgColor);toast.style.setProperty("--zigry-color",textColor);toast.style.setProperty("--zigry-border-color",borderColor);const iconHtml=type&&icons[type]?icons[type]:"";toast.innerHTML=`
                  <div class="zigry-body">
                    ${iconHtml}
                    <div class="zigry-text">
                      <div class="zigry-title">${title || ""}</div>
                      <div class="zigry-message">${message || ""}</div>
                    </div>
                  </div>
              `;let settled=!1;if(buttons&&buttons.length){const footer=document.createElement("div");footer.className="zigry-toastfooter";buttons.forEach((btn,idx)=>{const b=document.createElement("button");b.className=`btn btn-sm ${btn.class || "btn-primary"}`;b.textContent=btn.label||"Button "+(idx+1);b.onclick=()=>{if(settled)return;settled=!0;toast.remove();zone.style.display="none";alertOpen=!1;const retVal=btn.value!==undefined?btn.value:idx===0?!0:!1;resolve(retVal);if(queue.length)queue.shift()();if(typeof btn.onClick==="function")setTimeout(btn.onClick,0);};footer.appendChild(b)});toast.appendChild(footer)}
zone.appendChild(toast);if(anchor){let rect;if(anchor instanceof HTMLElement)
rect=anchor.getBoundingClientRect();else if(anchor&&anchor.clientX!==undefined)
rect={left:anchor.clientX,top:anchor.clientY,width:0,height:0,};if(rect){toast.style.position="absolute";toast.style.top=rect.top+rect.height+12+window.scrollY+"px";toast.style.left=rect.left+rect.width/2+window.scrollX+"px";toast.style.transform="translate(-50%,0)"}}
if(duration&&(!buttons||!buttons.length)){setTimeout(()=>{if(!settled){settled=!0;toast.remove();zone.style.display="none";alertOpen=!1;resolve();if(queue.length)queue.shift()();}},duration)}})},async confirm(message=null,title=null,type="info"){return await zigry.alert({title:title??"Confirm?",message:message??"Are you sure?",type:type,duration:0,buttons:[{label:"Yes",class:"btn-danger",value:!0,},{label:"Cancel",class:"btn-secondary",value:!1,},],}).then((result)=>{return result})},async prompt(message=null,title=null,defaultValue="",type="question",){return new Promise((resolve)=>{const isDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;const bgColor=isDark?"#2b2b2b":"#ffffff";const textColor=isDark?"#ffffff":"#333333";const borderColor=isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)";const overlayColor=isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.12)";let zone=document.getElementById("toastZone");if(!zone){zone=document.createElement("div");zone.id="toastZone";document.body.appendChild(zone)}
Object.assign(zone.style,{display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"auto",position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh",zIndex:"9999",background:overlayColor,padding:"1rem",});const icons={question:`<div class="zigry-icon zigry-question"><span>?</span></div>`,info:`<div class="zigry-icon zigry-info"><span>i</span></div>`,warning:`<div class="zigry-icon zigry-warning">!</div>`,};const toast=document.createElement("div");toast.className="zigry-toast";toast.style.minWidth="360px";toast.style.width="360px";toast.tabIndex=-1;toast.style.setProperty("--zigry-bg",bgColor);toast.style.setProperty("--zigry-color",textColor);toast.style.setProperty("--zigry-border-color",borderColor);const iconHtml=type&&icons[type]?icons[type]:icons.question;const inputId="zigry-prompt-input-"+Date.now();toast.innerHTML=`
        <div class="zigry-body">
          ${iconHtml}
          <div class="zigry-text">
            <div class="zigry-title">${title || "Input required"}</div>
            <div class="zigry-message">${message || "Please enter a value:"}</div>
            <div class="mt-3">
              <input type="text" id="${inputId}" class="form-control" 
                     value="${zigry.escapeHtml(defaultValue || "")}" 
                     style="background:${isDark ? "#1a1a1a" : "#f8f9fa"};border-color:${borderColor};color:${textColor};">
            </div>
          </div>
        </div>
      `;const footer=document.createElement("div");footer.className="zigry-toastfooter";const okBtn=document.createElement("button");okBtn.className="btn btn-sm btn-primary";okBtn.textContent="OK";const cancelBtn=document.createElement("button");cancelBtn.className="btn btn-sm btn-secondary";cancelBtn.textContent="Cancel";let settled=!1;const closePrompt=(value)=>{if(settled)return;settled=!0;toast.remove();zone.style.display="none";resolve(value)};okBtn.onclick=()=>{const input=document.getElementById(inputId);closePrompt(input?input.value:null)};cancelBtn.onclick=()=>closePrompt(null);footer.appendChild(okBtn);footer.appendChild(cancelBtn);toast.appendChild(footer);zone.appendChild(toast);setTimeout(()=>{const input=document.getElementById(inputId);if(input){input.focus();input.select();input.addEventListener("keydown",(e)=>{if(e.key==="Enter"){e.preventDefault();closePrompt(input.value)}else if(e.key==="Escape"){e.preventDefault();closePrompt(null)}})}},50)})},loader(show){const el=document.getElementById("zigry-loader");if(!el)return;if(show){el.classList.remove("d-none","fade");void el.offsetWidth;el.classList.add("show")}else{el.classList.remove("show");el.classList.add("fade");setTimeout(()=>{el.classList.add("d-none")},150)}},setActiveLink(href){document.querySelectorAll(".zigry-link").forEach((link)=>{const linkHref=link.getAttribute("href");if(linkHref===href||location.pathname===linkHref){link.classList.add("active")}else{link.classList.remove("active")}})},loadAssets(assets={}){const loaded=new Set([...document.querySelectorAll('link[rel="stylesheet"], script[src]')].map((el)=>el.href||el.src,),);if(Array.isArray(assets)){assets.forEach((url)=>this._injectAsset(url,loaded))}else{Object.values(assets).flat().forEach((url)=>this._injectAsset(url,loaded))}},_injectAsset(url,loadedSet){if(loadedSet.has(url))return;if(url.endsWith(".css")){const link=document.createElement("link");link.rel="stylesheet";link.href=url;document.head.appendChild(link)}else if(url.endsWith(".js")){const script=document.createElement("script");script.src=url;script.defer=!0;document.body.appendChild(script)}},async share(data,inputFiles){currentUrl=window.location.href;const fileItems=Array.isArray(inputFiles)?inputFiles:[inputFiles];let processedFiles=[];for(const item of fileItems){try{let blob,filename,type;if(typeof item==="string"){const response=await fetch(item);blob=await response.blob();type=blob.type;filename=item.substring(item.lastIndexOf("/")+1);if(!filename.includes(".")){const ext=type.split("/")[1]||"dat";filename+="."+ext}}else if(item instanceof Blob&&!(item instanceof File)){blob=item;type=blob.type||"application/octet-stream";const ext=type.split("/")[1]||"dat";filename="file_"+Date.now()+"."+ext}else if(item instanceof File){processedFiles.push(item);continue}else{console.warn("Unsupported file type:",item);continue}
processedFiles.push(new File([blob],filename,{type}))}catch(e){console.error(`Failed to process file:`,item,e)}}
const shareData={title:`Zigry.in`,text:data||"",files:processedFiles,};if(navigator.canShare&&!navigator.canShare(shareData)){zalert("Your browser does not support sharing these files together.","warning",);return}
if(navigator.share){try{await navigator.share(shareData)}catch(error){if(error.name!=="AbortError"){const isMobile=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent,);if(isMobile){zalert("Sharing failed. Please try your browser's share feature or copy the link manually.","warning",)}else{zalert("Sharing not fully supported in this browser. Try copying the link manually.","warning",)}}}}else{try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(currentUrl);zalert("Link copied to clipboard!","info")}else{zalert("Sharing not supported. Copy link manually: "+currentUrl,"error","center",0,)}}catch{zalert("Sharing not supported. Copy link manually: "+currentUrl,"error","center",0,)}}},});window.zigry=zigry;zigry.setActiveLink(location.href);document.addEventListener("DOMContentLoaded",()=>{document.body.addEventListener("click",async(e)=>{const a=e.target.closest(".zigry-link");const za=a?.getAttribute("href");const href=e.target.closest("a[href]");if(a){e.preventDefault();if(za&&za.startsWith("#")){history.pushState({},"",za);const el=document.getElementById(za.slice(1));zigry.setActiveLink(za);if(el)el.scrollIntoView({behavior:"smooth"});return}else{zigry.navigate(za)}
return}else if(href){const hrefVal=href.getAttribute("href");history.pushState({},"",hrefVal);const hash=new URL(hrefVal,location.href).hash;if(hrefVal.startsWith("#")){e.preventDefault();const el=document.getElementById(hash.slice(1));if(el)el.scrollIntoView({behavior:"smooth"})}}
const btn=e.target.closest("[data-action]");if(!btn)return;const card=btn.closest("[data-post-id]");if(!card)return;const postId=card.dataset.postId;const action=btn.dataset.action;if(action==="like"){likePost(postId,card,btn)}else if(action==="comment"){await commentPost(postId,card,btn)}else if(action==="share"){await sharePost(postId,card,btn)}else if(action==="edit"){editPost(postId,card)}else if(action==="delete"){deletePost(postId,card)}else if(action==="report"){reportPost(postId,card)}});async function likePost(postId,card,button){try{const res=await fetch(`/api/post/${postId}/like`,{method:"POST"});const result=await res.json();if(result.success){const likeText=button.querySelector(".like-text");const likeIcon=button.querySelector(".like-icon");likeIcon.innerHTML=result.like_icon;replaceZigryIcons(likeIcon);likeText.textContent=result.like_text;const countEl=card.querySelector(".like_count");if(countEl){const count=result.like_count;countEl.textContent=count+" "+(parseInt(count)===1?"like":"likes");countEl.dataset.count=count}}else{if(result.redirect!==null&&result.redirect!==undefined){setTimeout(()=>zigry.reload(result.redirect),500)}else{zigry.toast(result.message||"Failed to like","danger")}}}catch(e){zigry.alert({title:"Error",message:"Server error!",type:"danger",duration:0,buttons:[{label:"Ok",class:"btn-danger"}],})}}
async function commentPost(postId,card,button){let commentsSection=card.querySelector(".comments-section");if(!commentsSection){commentsSection=document.createElement("div");commentsSection.className="comments-section px-3 py-2 border-top";commentsSection.innerHTML=`
        <div class="comments-container mb-2 z-scroll" style="max-height: 300px; overflow-y: auto;"></div>
        <div class="input-group comment-input-group d-flex gap-2 align-items-end">
          <input type="text" class="form-control bg-transparent comment-input" placeholder="Write a comment..." data-post-id="${postId}" style="border-color: rgba(127, 34, 241, 0.3) !important;">
            <div class="input-group-append">

    <button class="btn btn-sm border-primary comment-submit-btn py-1 input-group-text" data-post-id="${postId}">Post</button>

    </div>
        </div>
      `;const cardFooter=card.querySelector(".card-footer");if(cardFooter){cardFooter.parentNode.insertBefore(commentsSection,cardFooter.nextSibling,)}
await loadComments(postId,commentsSection.querySelector(".comments-container"),);if(typeof zigry.applyScroll==="function"){zigry.applyScroll(commentsSection.querySelector(".comments-container"))}
const submitBtn=commentsSection.querySelector(".comment-submit-btn");const commentInput=commentsSection.querySelector(".comment-input");const handleCommentSubmit=async()=>{const content=commentInput.value.trim();if(!content){zigry.toast("Please enter a comment","info");return}
try{const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";const formData=new FormData();let contentToSend=content;if(commentInput.dataset.parentId&&content.startsWith("@")){const parts=content.split(" ");if(parts.length>1){contentToSend=parts.slice(1).join(" ").trim()}}
if(!contentToSend){zigry.toast("Please enter a comment","info");return}
formData.append("content",contentToSend);if(commentInput.dataset.parentId){formData.append("parent_id",commentInput.dataset.parentId)}
const res=await fetch(`/api/posts/${postId}/comment`,{method:"POST",headers:{"X-CSRF-TOKEN":csrf,},body:formData,});const result=await res.json();if(result.success){commentInput.value="";delete commentInput.dataset.parentId;delete commentInput.dataset.postId;const countEl=card.querySelector(".comments_count");if(countEl){const count=result.comment_count||0;countEl.textContent=count+" "+(parseInt(count)===1?"comment":"comments");countEl.dataset.count=count}
if(result.comment){const container=commentsSection.querySelector(".comments-container",);if(container){if(container.innerHTML.includes("No comments yet")){container.innerHTML=""}
const c=result.comment;const isReply=!!c.parent_id;const fallbackAvatar=`/assets/images/default/${c.gender || "756e6b6e6f776e"}.png`;const avatarSrc=c.avatar||fallbackAvatar;const commentHtml=`
                  <div class="comment-item ${isReply ? "ms-4" : ""} mb-2" data-comment-id="${c.id}">
                    <div class="d-flex gap-2">
                      <a href="/${c.username}">
                        <img class="rounded-circle comment-avatar" src="${avatarSrc}" 
                             onerror="this.src='${fallbackAvatar}'" 
                             style="width:32px;height:32px;object-fit:cover;" />
                      </a>
                      <div class="flex-grow-1">
                        <div class="rounded p-2">
                          <a href="/${c.username}" class="fw-bold text-decoration-none comment-author">${c.name || "User"}</a>
                          <div class="comment-text">${zigry.escapeHtml(c.content)}</div>
                        </div>
                        <div class="d-flex gap-3 mt-1 small text-muted">
                          <span class="comment-time">Just now</span>
                          <span class="comment-like-btn text-muted" role="button" data-post-id="${postId}" data-comment-id="${c.id}" style="cursor:pointer;">
                            <i class="zigry z-like zigry-xs stroke-red-700"></i> <span class="like-count">0</span>
                          </span>
                          ${!isReply ? `<span class="comment-reply-btn text-primary" role="button" data-post-id="${postId}" data-comment-id="${c.id}" style="cursor:pointer;">Reply</span>` : ""}
                          <span class="comment-delete-btn text-danger" role="button" data-post-id="${postId}" data-comment-id="${c.id}" style="cursor:pointer;">Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `;if(isReply){const parentItem=container.querySelector(`[data-comment-id="${c.parent_id}"]`,);if(parentItem){parentItem.insertAdjacentHTML("afterend",commentHtml)}else{container.insertAdjacentHTML("afterbegin",commentHtml)}}else{container.insertAdjacentHTML("afterbegin",commentHtml)}
const newEl=container.querySelector(`[data-comment-id="${c.id}"]`,);if(newEl){bindCommentActions(newEl);if(typeof replaceZigryIcons==="function"){replaceZigryIcons(newEl)}}
if(typeof zigry.applyScroll==="function"){zigry.applyScroll(container)}}}
zigry.toast("Comment added successfully!","success")}else{if(result.redirect!==null&&result.redirect!==undefined){setTimeout(()=>zigry.reload(result.redirect),500)}else{zigry.toast(result.message||"Failed to add comment","danger")}}}catch(err){zigry.toast("Server error!","danger")}};submitBtn.addEventListener("click",handleCommentSubmit);commentInput.addEventListener("keypress",(e)=>{if(e.key==="Enter"){handleCommentSubmit()}})}else{commentsSection.style.display=commentsSection.style.display==="none"?"block":"none"}}
async function loadComments(postId,container){if(!container)return;try{const res=await fetch(`/api/posts/${postId}/comments`);const result=await res.json();if(result.success&&result.comments){const comments=result.comments;if(comments.length===0){container.innerHTML='<div class="text-muted text-center small p-2">No comments yet</div>';return}
const topLevel=comments.filter((c)=>!c.parent_id);const replies=comments.filter((c)=>c.parent_id);const replyMap={};replies.forEach((r)=>{if(!replyMap[r.parent_id])replyMap[r.parent_id]=[];replyMap[r.parent_id].push(r)});const renderComment=(c,isReply=!1)=>{const fallbackAvatar=`/assets/images/default/${
            c.gender || "756e6b6e6f776e"
          }.png`;const avatarSrc=c.avatar||fallbackAvatar;const likedClass=c.is_liked?"text-danger":"text-muted";const likeIcon=c.is_liked?"<i class='zigry z-like zigry-xs fill-red-700'></i>":"<i class='zigry z-like zigry-xs stroke-red-700'></i>";let html=`
            <div class="comment-item ${
              isReply ? "ms-4" : ""
            } mb-2" data-comment-id="${c.id}">
              <div class="d-flex gap-2">
                <a href="/${c.username}">
                  <img class="rounded-circle comment-avatar" src="${avatarSrc}" 
                       onerror="this.src='${fallbackAvatar}'" 
                       style="width:32px;height:32px;object-fit:cover;" />
                </a>
                <div class="flex-grow-1">
                  <div class="rounded p-2">
                    <a href="/${
                      c.username
                    }" class="fw-bold text-decoration-none comment-author">${
                      c.name || "User"
                    }</a>
                    <div class="comment-text">${zigry.escapeHtml(c.content)}</div>
                  </div>
                  <div class="d-flex gap-3 mt-1 small text-muted">
                    <span class="comment-time">${
                      c.time_ago || c.created_at
                    }</span>
                    <span class="comment-like-btn ${likedClass}" role="button" data-post-id="${postId}" data-comment-id="${
                      c.id
                    }" style="cursor:pointer;">
                      ${likeIcon} <span class="like-count">${
                        c.like_count || 0
                      }</span>
                    </span>
                    ${
                      !isReply
                        ? `<span class="comment-reply-btn text-primary" role="button" data-post-id="${postId}" data-comment-id="${c.id}" style="cursor:pointer;">Reply</span>`
                        : ""
                    }
                    ${
                      c.is_owner
                        ? `<span class="comment-delete-btn text-danger" role="button" data-post-id="${postId}" data-comment-id="${c.id}" style="cursor:pointer;">Delete</span>`
                        : ""
                    }
                  </div>
                </div>
              </div>
            </div>
          `;return html};let html="";topLevel.forEach((c)=>{html+=renderComment(c);if(replyMap[c.id]){replyMap[c.id].forEach((r)=>{html+=renderComment(r,!0)})}});container.innerHTML=html;bindCommentActions(container);replaceZigryIcons();if(typeof zigry.applyScroll==="function"){zigry.applyScroll(container)}}}catch(err){console.error("Load comments error:",err)}}
function bindCommentActions(container){const commentInput=document.querySelector(".comment-input");container.querySelectorAll(".comment-like-btn").forEach((btn)=>{if(btn.dataset.boundAction)return;btn.dataset.boundAction="true";btn.addEventListener("click",async()=>{const pId=btn.dataset.postId;const cId=btn.dataset.commentId;try{const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";const res=await fetch(`/api/posts/${pId}/comments/${cId}/like`,{method:"POST",headers:{"X-CSRF-TOKEN":csrf},});const result=await res.json();if(result.success){btn.classList.toggle("text-danger",result.is_liked);btn.classList.toggle("text-muted",!result.is_liked);btn.innerHTML=`${result.is_liked ? "<i class='zigry z-like zigry-xs fill-red-700'></i>" : "<i class='zigry z-like zigry-xs stroke-red-700'></i>"} <span class="like-count">${result.like_count}</span>`;if(typeof replaceZigryIcons==="function"){replaceZigryIcons(btn)}}}catch(e){console.error("Like error:",e)}})});container.querySelectorAll(".comment-reply-btn").forEach((btn)=>{if(btn.dataset.boundAction)return;btn.dataset.boundAction="true";btn.addEventListener("click",()=>{const parentId=btn.dataset.commentId;const postId=btn.dataset.postId;const commentItem=btn.closest(".comment-item");const commentAuthor=commentItem.querySelector(".comment-author")?.textContent||"User";const authorLink=commentItem.querySelector(".comment-author");const username=authorLink?.closest("a")?.href?.split("/").pop()||commentAuthor.replace(/\s/g,"")||"user";if(!commentInput)return;commentInput.dataset.parentId=parentId;commentInput.dataset.postId=postId;commentInput.value=`@${username} `;commentInput.focus();commentInput.setSelectionRange(commentInput.value.length,commentInput.value.length,)})});container.querySelectorAll(".comment-delete-btn").forEach((btn)=>{if(btn.dataset.boundAction)return;btn.dataset.boundAction="true";btn.addEventListener("click",async()=>{const postId=btn.dataset.postId;const commentId=btn.dataset.commentId;const confirmed=await zigry.confirm("Are you sure you want to delete this comment? This action cannot be undone.","Delete Comment","warning",);if(!confirmed)return;try{const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";const res=await fetch(`/api/posts/${postId}/comments/${commentId}`,{method:"DELETE",headers:{"X-CSRF-TOKEN":csrf},},);const result=await res.json();if(result.success){const commentItem=btn.closest(".comment-item");const commentId=commentItem?.dataset?.commentId;if(commentItem){const allComments=container.querySelectorAll(".comment-item");const repliesToRemove=[];allComments.forEach((c)=>{const replyBtn=c.querySelector(".comment-reply-btn");if(replyBtn&&replyBtn.dataset.commentId===commentId){let nextSibling=commentItem.nextElementSibling;while(nextSibling&&nextSibling.classList.contains("comment-item")&&nextSibling.classList.contains("ms-4")){repliesToRemove.push(nextSibling);nextSibling=nextSibling.nextElementSibling}}});repliesToRemove.forEach((r)=>r.remove());commentItem.remove();const card=container.closest("[data-post-id]");if(card){const countEl=card.querySelector(".comments_count");if(countEl&&result.comment_counts!==undefined){const count=result.comment_counts;countEl.textContent=count+" "+(parseInt(count)===1?"comment":"comments");countEl.dataset.count=count}}}
zigry.toast("Comment deleted successfully!","success")}else{if(result.redirect){setTimeout(()=>zigry.reload(result.redirect),500)}else{zigry.toast(result.message||"Failed to delete comment","danger",)}}}catch(e){console.error("Delete error:",e);zigry.toast("Server error!","danger")}})})}
zigry.sharePost=sharePost;async function sharePost(postId,card,button,type="post"){const contentUrl=type==="reel"?`${window.location.origin}/reels/${postId}`:`${window.location.origin}/post/${postId}`;const modal=document.createElement("div");modal.className="modal fade custom-share-modal";modal.style.zIndex="20005";const auth=window.me==undefined?!1:!0;modal.innerHTML=`
      <style>
        .custom-share-modal-backdrop { z-index: 20004 !important; }
        .custom-share-modal { z-index: 20005 !important; }
      </style>
      <div class="modal-dialog modal-dialog-centered" style="z-index: 20006;">
        <div class="modal-content" style="background: #1a1a1a; color: #fff; border-radius: 16px;">
          <div class="modal-header border-0 pb-2">
            <h6 class="modal-title">Share</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body px-3 pb-2">
          ${
            auth
              ? `<!-- Search Bar --><div class="mb-3"><div class="input-group"><span class="input-group-text bg-dark border-0"><i class="zigry z-search"></i></span><input type="text" class="form-control bg-dark border-0 text-white friends-search-input"
placeholder="Search" style="box-shadow: none;"></div></div><!-- Friends Grid(Instagram Style)--><div class="friends-grid-container" style="max-height: 350px; overflow-y: auto; margin: 0 -8px; scrollbar-width: none; -ms-overflow-style: none;"><style>.friends-grid-container::-webkit-scrollbar{display:none}</style><div class="friends-loading text-center py-4"><div class="spinner-border spinner-border-sm text-light" role="status"><span class="visually-hidden">Loading...</span></div><div class="small text-muted mt-2">Loading friends...</div></div></div></div><!-- Message Input --><div class="px-3 pb-3" style="background: #1a1a1a;"><textarea
class="form-control bg-dark border-0 text-white share-message-input"
placeholder="Write a message..."
rows="2"
autofocus
style="resize: none; box-shadow: none; border-radius: 12px;"></textarea></div>`
              : ``
          }
            

          <!-- Bottom Action Buttons -->
          <div class="modal-footer border-0 justify-content-around p-3" style="background: #0a0a0a; border-radius: 0 0 16px 16px;">
          ${
            auth
              ? `<button class="btn btn-link text-white text-decoration-none d-flex flex-column align-items-center share-to-story-btn" style="font-size: 11px;"><div class="mb-1" style="width: 44px; height: 44px; border-radius: 50%; background: #262626; display: flex; align-items: center; justify-content: center;"><i class="zigry z-add-square" style="font-size: 20px;"></i></div><span>Add to story</span></button><button class="btn btn-link text-white text-decoration-none d-flex flex-column align-items-center share-to-feed-btn" style="font-size: 11px;"><div class="mb-1" style="width: 44px; height: 44px; border-radius: 50%; background: #262626; display: flex; align-items: center; justify-content: center;"><i class="zigry z-add-rounded" style="font-size: 20px;"></i></div><span>Share as post</span></button><button class="btn btn-link text-white text-decoration-none d-flex flex-column align-items-center send-message-btn" style="font-size: 11px;" disabled><div class="mb-1" style="width: 44px; height: 44px; border-radius: 50%; background: #262626; display: flex; align-items: center; justify-content: center;"><i class="zigry z-chat" style="font-size: 20px;"></i></div><span>Send</span></button>`
              : ``
          }  
          
            <button class="btn btn-link text-white text-decoration-none d-flex flex-column align-items-center copy-link-btn" style="font-size: 11px;">
              <div class="mb-1" style="width: 44px; height: 44px; border-radius: 50%; background: #262626; display: flex; align-items: center; justify-content: center;">
                <i class="zigry z-link" style="font-size: 20px;"></i>
              </div>
              <span>Copy link</span>
            </button>
            <button class="btn btn-link text-white text-decoration-none d-flex flex-column align-items-center share-external-btn" style="font-size: 11px;">
              <div class="mb-1" style="width: 44px; height: 44px; border-radius: 50%; background: #262626; display: flex; align-items: center; justify-content: center;">
                <i class="zigry z-share" style="font-size: 20px;"></i>
              </div>
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    `;document.body.appendChild(modal);const bsModal=new bootstrap.Modal(modal,{backdrop:!0,});modal.addEventListener("show.bs.modal",function(){setTimeout(()=>{const backdrop=document.querySelector(".modal-backdrop");if(backdrop){backdrop.classList.add("custom-share-modal-backdrop")}},0)});let allFriends=[];let selectedFriends=new Set();let currentPage=1;let isLoading=!1;let hasMore=!0;const loadFriends=async(page=1)=>{if(isLoading||!hasMore)return;isLoading=!0;try{const response=await fetch(`/api/friends/share?page=${page}`);const data=await response.json();if(data.success&&data.friends){const newFriends=data.friends;if(newFriends.length===0){hasMore=!1;return}
allFriends=[...allFriends,...newFriends];renderFriendsGrid(allFriends);if(newFriends.length<20){hasMore=!1}}else{if(page===1){modal.querySelector(".friends-grid-container").innerHTML='<div class="text-center text-muted py-4">No friends found</div>'}}}catch(error){if(page===1){modal.querySelector(".friends-grid-container").innerHTML='<div class="text-center text-danger py-4">Failed to load friends</div>'}}finally{isLoading=!1}};const renderFriendsGrid=(friends)=>{const container=modal.querySelector(".friends-grid-container");if(friends.length===0){container.innerHTML='<div class="text-center text-muted py-4">No friends match your search</div>';return}
const gridHTML=`
        <div class="row g-3 px-2">
          ${friends
            .map(
              (friend) => `<div class="col-4 text-center friend-grid-item" data-friend-id="${friend.id}" style="cursor: pointer;"><div class="position-relative d-inline-block"><img src="${friend.avatar}"
class="friend-avatar rounded-circle"
style="width: 70px; height: 70px; object-fit: cover; border: 2px solid transparent;"
alt="${friend.name}"><div class="friend-check-overlay position-absolute top-0 end-0"
style="width: 24px; height: 24px; background: #0095f6; border-radius: 50%; 
                            display: none; align-items: center; justify-content: center; border: 2px solid #1a1a1a;"><i class="zigry z-tick text-white" style="font-size: 12px;"></i></div></div><div class="small mt-2 text-truncate" style="max-width: 90px; margin: 0 auto; color: #fff;">${zigry.escapeHtml(friend.name)}</div></div>`,
            )
            .join("")}
        </div>
      `;container.innerHTML=gridHTML;container.querySelectorAll(".friend-grid-item").forEach((item)=>{item.addEventListener("click",()=>{const friendId=parseInt(item.dataset.friendId);const avatar=item.querySelector(".friend-avatar");const checkOverlay=item.querySelector(".friend-check-overlay");if(selectedFriends.has(friendId)){selectedFriends.delete(friendId);avatar.style.border="2px solid transparent";checkOverlay.style.display="none"}else{selectedFriends.add(friendId);avatar.style.border="2px solid #0095f6";checkOverlay.style.display="flex"}
updateSendButton()})})};const updateSendButton=()=>{const sendBtn=modal.querySelector(".send-message-btn");const count=selectedFriends.size;sendBtn.disabled=count===0;sendBtn.style.opacity=count===0?"0.5":"1"};if(auth){modal.querySelector(".friends-search-input").addEventListener("input",(e)=>{const searchTerm=e.target.value.toLowerCase();const filtered=allFriends.filter((f)=>f.name.toLowerCase().includes(searchTerm)||(f.username&&f.username.toLowerCase().includes(searchTerm)),);renderFriendsGrid(filtered);setTimeout(()=>{selectedFriends.forEach((friendId)=>{const item=modal.querySelector(`[data-friend-id="${friendId}"]`,);if(item){const avatar=item.querySelector(".friend-avatar");const checkOverlay=item.querySelector(".friend-check-overlay",);avatar.style.border="2px solid #0095f6";checkOverlay.style.display="flex"}})},0)});modal.querySelector(".send-message-btn").addEventListener("click",async()=>{if(selectedFriends.size===0)return;const sendBtn=modal.querySelector(".send-message-btn");const originalHTML=sendBtn.innerHTML;sendBtn.disabled=!0;sendBtn.innerHTML='<div class="spinner-border spinner-border-sm"></div><span class="d-block mt-1" style="font-size: 11px;">Sending...</span>';try{const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";const customMessage=modal.querySelector(".share-message-input")?.value?.trim()||"";let previewText=customMessage||(card?card.querySelector(".content")?.innerText?.substring(0,100):null)||(type==="reel"?"Shared a reel":"Shared a post");if(previewText.length>60){previewText=previewText.substring(0,60)+"..."}
const lastMessageText=`📤 ${previewText}`;const response=await fetch(`/api/posts/${postId}/share-inbox`,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":csrf,},body:JSON.stringify({recipient_ids:Array.from(selectedFriends),message:customMessage,last_message:lastMessageText,type:type,}),});const result=await response.json();if(result.success){const successCount=result.successCount||selectedFriends.size;const failedCount=result.failedCount||0;zigry.playSound("message_send.mp3");zigry.toast(`Sent to ${successCount} ${successCount === 1 ? "person" : "people"}`,"success",);if(failedCount>0){setTimeout(()=>{zigry.toast(`Failed to send to ${failedCount} ${failedCount === 1 ? "recipient" : "recipients"}`,"danger",)},500)}
const countEl=card?card.querySelector(".share_count"):null;if(countEl&&result.share_count){countEl.textContent=pluralize(result.share_count,"share")}
bsModal.hide()}else{zigry.toast(result.message||"Failed to share post","danger");sendBtn.innerHTML=originalHTML;updateSendButton()}}catch(error){zigry.toast("Failed to share post","danger");sendBtn.innerHTML=originalHTML;updateSendButton()}});modal.querySelector(".share-to-story-btn").addEventListener("click",async()=>{try{const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";const response=await fetch("/api/story/add",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":csrf,},body:JSON.stringify(type==="reel"?{reel_id:postId}:{post_id:postId},),});const result=await response.json();if(result.success){zigry.playSound("story_share.mp3");zigry.toast("Added to your story!","success");bsModal.hide()}else{zigry.toast(result.message||"Failed to add to story","danger")}}catch(error){zigry.toast("Failed to add to story","danger")}});modal.querySelector(".share-to-feed-btn").addEventListener("click",async()=>{try{const customMessage=modal.querySelector(".share-message-input")?.value?.trim()||"";const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";const response=await fetch(`/api/posts/${postId}/share-to-feed`,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":csrf,},body:JSON.stringify({comment:customMessage,}),});const result=await response.json();if(result.success){zigry.playSound("feed_share.mp3");zigry.toast("Shared to your feed!","success");const countEl=card?card.querySelector(".share_count"):null;if(countEl&&result.share_count){countEl.textContent=pluralize(result.share_count,"share")}
bsModal.hide()}else{zigry.toast(result.message||"Failed to share post","danger")}}catch(error){zigry.toast("Failed to share post","danger")}})}
modal.querySelector(".share-external-btn").addEventListener("click",async()=>{if(navigator.share){try{await navigator.share({title:type==="reel"?"Check out this reel on Zigry":"Check out this post on Zigry",url:contentUrl,});bsModal.hide();const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";await fetch(`/api/posts/${postId}/share`,{method:"POST",headers:{"X-CSRF-TOKEN":csrf},});const countEl=card?card.querySelector(".share_count"):null;if(countEl)
countEl.textContent=pluralize(parseInt(countEl.textContent||0)+1,"share",);zigry.playSound("external_share.mp3");zigry.toast(type==="reel"?"Reel shared!":"Post shared!","success",)}catch(e){if(e.name!=="AbortError"){console.error("Share failed:",e)}}}else{modal.querySelector(".copy-link-btn").click()}});modal.querySelector(".copy-link-btn").addEventListener("click",async()=>{try{zigry.playSound("link_copy.mp3");zigry.toast("Link copied to clipboard!","success");bsModal.hide()}catch(e){const ta=document.createElement("textarea");ta.value=contentUrl;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();zigry.playSound("link_copy.mp3");zigry.toast("Link copied!","success");bsModal.hide()}});modal.addEventListener("hidden.bs.modal",()=>modal.remove());bsModal.show();if(auth){const container=modal.querySelector(".friends-grid-container");container.addEventListener("scroll",()=>{const{scrollTop,scrollHeight,clientHeight}=container;if(scrollHeight-scrollTop-clientHeight<50&&!isLoading&&hasMore){currentPage++;loadFriends(currentPage)}});loadFriends(1)}}
async function editPost(postId,card){try{const contentEl=card.querySelector(".content");const currentContent=contentEl?contentEl.innerHTML:"";const privacy=card?.dataset?.privacy||"public";if(typeof window.openEditComposer==="function"){window.openEditComposer(postId,currentContent,privacy);return}
const newContent=prompt("Edit your post:",currentContent.replace(/<[^>]*>/g,""),);if(newContent===null)return;const formData=new FormData();formData.append("content",newContent);formData.append("_method","PUT");const res=await fetch(`/api/posts/${postId}/edit`,{method:"POST",headers:{"X-CSRF-TOKEN":document.querySelector('meta[name="csrf-token"]').content,},body:formData,});const data=await res.json();if(data.success){if(contentEl)contentEl.innerHTML=newContent}else{}}catch(err){console.error(err);zigry.toast("Something went wrong","error")}}
async function deletePost(postId,card){const confirmed=await zigry.confirm("Are you sure you want to delete this post?","Delete Post","warning",);if(!confirmed)return;try{const res=await fetch(`/api/posts/${postId}/delete`,{method:"DELETE",headers:{"X-CSRF-TOKEN":document.querySelector('meta[name="csrf-token"]').content,},});const data=await res.json();if(data.success){zigry.toast(data.message,"success");card.remove()}else{zigry.toast(data.message||"Failed to delete post","error")}}catch(err){console.error(err);zigry.toast("Something went wrong","error")}}
async function reportPost(postId,card){const reason=await zigry.alert({title:"Report Post",message:"Why are you reporting this post?",type:"warning",duration:0,buttons:[{label:"Spam",class:"btn-warning",value:"spam"},{label:"Inappropriate",class:"btn-danger",value:"inappropriate"},{label:"Harassment",class:"btn-danger",value:"harassment"},{label:"Other",class:"btn-secondary",value:"other"},{label:"Cancel",class:"btn-outline-secondary",value:!1},],});if(!reason)return;try{const formData=new FormData();formData.append("reason",reason);const res=await fetch(`/api/posts/${postId}/report`,{method:"POST",headers:{"X-CSRF-TOKEN":document.querySelector('meta[name="csrf-token"]').content,},body:formData,});const data=await res.json();if(data.success){zigry.toast(data.message,"success")}else{zigry.toast(data.message||"Failed to report post","error")}}catch(err){console.error(err);zigry.toast("Something went wrong","error")}}
window.addEventListener("popstate",()=>{zigry.load(location.href);lastVisibleUrl=window.location.href;window.scrollTo(0,0)});window.addEventListener("online",()=>checkOnline(location.pathname));window.addEventListener("offline",(event)=>checkOffline(event));window.addEventListener("beforeunload",()=>{});zigry.bindForms();currentPage=0;hasMore=!0;setupObserver();zigry.prefetchUserLocation()});function checkOnline(path){if(localStorage.getItem("offline")){zigry.navigate(path);zigry.toast("✅ Back online","gray text-center position-fixed bottom-0 start-50 translate-middle-x p-3",);localStorage.removeItem("offline")}}
function checkOffline(event){zigry.loader(!1);zigry.toast("❌ Internet connection not availble","gray text-center position-fixed bottom-0 start-50 translate-middle-x p-3",);localStorage.setItem("offline",!0)}
function showToast(title,message,onConfirm=null,args=[],resultType="success",showWarningIcon=!1,){const zone=document.getElementById("toastZone");const isDark=window.matchMedia("(prefers-color-scheme: dark)").matches;const icons={success:`<svg class="toast-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#28a745"/><path d="M7 13l3 3 7-7" stroke="white" stroke-width="2"/></svg>`,error:`<svg class="toast-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#dc3545"/><path d="M15 9l-6 6M9 9l6 6" stroke="white" stroke-width="2"/></svg>`,warning:`<svg class="toast-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#ffc107"/><path d="M12 7v5m0 4h.01" stroke="black" stroke-width="2"/></svg>`,};const toast=document.createElement("div");toast.className=`toast show text-bg-${
    isDark ? "dark" : "light"
  } border-0 mb-2`;toast.innerHTML=`
      <div class="toast-header">
        <strong class="me-auto">${title}</strong>
      </div>
      <div class="toast-body">
        ${
          showWarningIcon
            ? `<div class="text-center mb-2">${icons.warning}</div>`
            : ""
        }
        ${message}
      </div>
      <div class="d-flex justify-content-end gap-2 px-3 pb-2">
        <button class="btn btn-sm btn-secondary">Cancel</button>
        <button class="btn btn-sm btn-danger">Confirm</button>
      </div>
    `;const[cancelBtn,confirmBtn]=toast.querySelectorAll("button");cancelBtn.onclick=()=>toast.remove();confirmBtn.onclick=()=>{if(typeof onConfirm==="function")onConfirm(...args);toast.querySelector(".toast-body").innerHTML=`
        <div class="text-center">
          ${icons[resultType]}
          <div class="mt-2">${
            resultType === "success"
              ? "Success!"
              : resultType === "error"
                ? "Failed!"
                : "Warning!"
          }</div>
        </div>
      `;toast.querySelector(".toast-header strong").textContent=resultType[0].toUpperCase()+resultType.slice(1);toast.querySelector(".d-flex").remove();setTimeout(()=>toast.remove(),2000)};zone.appendChild(toast)}
function zalert(message,type="info",position="center",duration=3000,buttons=!1,){zigry.alert({title:type.charAt(0).toUpperCase()+type.slice(1),message:message,type:type,duration:duration,position:position,buttons:buttons,})}
function zdelete(message="Delete this file?"){zigry.alert({title:"Confirm?",message:message,type:"warning",duration:0,buttons:[{label:"Yes",class:"btn-danger",onClick:()=>zigry.alert({title:"Alert",message:"Deleted successfully!",type:"info",}),},{label:"Cancel",class:"btn-secondary"},],})}
document.addEventListener("DOMContentLoaded",()=>{let currentIndex=0;let scale=1;let lastTouchDistance=null;let isDragging=!1;let dragStartX=0;function toggleFullscreen(enter){if(!document.fullscreenEnabled)return;const el=document.documentElement;if(enter){if(!document.fullscreenElement){el.requestFullscreen?.()}}else{if(document.fullscreenElement){document.exitFullscreen?.()}}}
async function openZigryLightbox(index,elements){elements||=[...document.querySelectorAll(".zigry-images img, .zigry-gallery img, video.zigry-video",),];elements=Array.from(new Set(elements));if(!elements.length||!elements[index])return;let current=index,scale=1,dragging=!1;const lightbox=Object.assign(document.createElement("div"),{id:"zigryLightbox",className:"zigry-lightbox",});document.body.append(lightbox);document.body.style.overflow="hidden";let media=createMedia(elements[current]);lightbox.append(media);loadMedia(media,elements[current]);const prevBtn=makeBtn("⟨","prev",()=>current>0&&switchMedia(current-1),);const nextBtn=makeBtn("⟩","next",()=>current<elements.length-1&&switchMedia(current+1),);const closeBtn=Object.assign(document.createElement("button"),{type:"button",className:"btn-close position-absolute top-0 end-0 m-3",onclick:closeLightbox,});lightbox.append(prevBtn,nextBtn,closeBtn);updateNav();document.addEventListener("keydown",(e)=>{if(e.key==="Escape")closeLightbox();if(e.key==="ArrowLeft")prevBtn.click();if(e.key==="ArrowRight")nextBtn.click();});lightbox.onclick=(e)=>e.target===lightbox&&!dragging&&closeLightbox();function createMedia(el){const v=el.tagName==="VIDEO";const m=document.createElement(v?"video":"img");Object.assign(m.style,{maxWidth:"90vw",maxHeight:"90vh",transition:"transform .4s ease, opacity .4s ease",position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",});if(v)Object.assign(m,{controls:!0,autoplay:!0});m.draggable=!1;return m}
function loadMedia(m,el){const src=el.dataset.decryptedSrc||el.dataset.full||el.dataset.url||el.src;if(el.tagName==="VIDEO")((m.src=src),m.load());else m.src=src}
function switchMedia(newIndex){const dir=newIndex>current?1:-1;const old=media;const next=createMedia(elements[newIndex]);loadMedia(next,elements[newIndex]);next.style.transform=`translate(calc(-5% + ${dir * 250}%), -100%)`;next.style.opacity="0";next.style.position="absolute";lightbox.append(next);requestAnimationFrame(()=>{old.style.transform=`translate(calc(-5% - ${dir * 250}%), -100%)`;old.style.opacity="0";next.style.transform="translate(-50%, -50%)";next.style.opacity="1"});setTimeout(()=>{old.remove();media=next;current=newIndex;scale=1;updateNav();attachDrag();addZoomEvents()},400)}
function makeBtn(txt,cls,fn){const b=document.createElement("button");b.className=`nav-btn btn btn-light rounded-circle shadow ${cls}`;b.textContent=txt;b.onclick=fn;return b}
function updateNav(){prevBtn.style.opacity=current===0?".2":".6";nextBtn.style.opacity=current===elements.length-1?".2":".6"}
function closeLightbox(){document.body.style.overflow="";lightbox.remove()}
function attachDrag(){let startX=0,startY=0;let deltaX=0,deltaY=0;let isSwiping=!1;let direction=null;media.addEventListener("mousedown",(e)=>{if(scale!==1)return;isSwiping=!0;startX=e.clientX;startY=e.clientY;direction=null;deltaX=deltaY=0;media.style.transition="none"});window.addEventListener("mousemove",(e)=>{if(!isSwiping||scale!==1)return;deltaX=e.clientX-startX;deltaY=e.clientY-startY;if(!direction&&Math.abs(deltaY)>20)direction="vertical";if(!direction&&Math.abs(deltaX)>20)direction="horizontal";if(direction==="horizontal"){media.style.transform=`translate(calc(-50% + ${deltaX}px), -50%) scale(${scale})`}else if(direction==="vertical"){media.style.transform=`translate(-50%, calc(-50% + ${deltaY}px)) scale(${scale})`;media.style.opacity=`${1 - Math.min(Math.abs(deltaY) / 300, 0.7)}`}});window.addEventListener("mouseup",(e)=>{if(!isSwiping)return;isSwiping=!1;media.style.transition="transform .25s ease, opacity .25s ease";if(direction==="horizontal"&&Math.abs(deltaX)>80){if(deltaX>0&&current>0)switchMedia(current-1);else if(deltaX<0&&current<elements.length-1)
switchMedia(current+1);else reset()}else if(direction==="vertical"&&deltaY<-100){closeLightbox()}else{reset()}});media.addEventListener("touchstart",(e)=>{if(e.touches.length===1&&scale===1){isSwiping=!0;startX=e.touches[0].clientX;startY=e.touches[0].clientY;direction=null;deltaX=deltaY=0;media.style.transition="none"}});media.addEventListener("touchmove",(e)=>{if(!isSwiping||scale!==1)return;deltaX=e.touches[0].clientX-startX;deltaY=e.touches[0].clientY-startY;if(!direction&&Math.abs(deltaY)>40)direction="vertical";if(!direction&&Math.abs(deltaX)>10)direction="horizontal";if(direction==="horizontal"){media.style.transform=`translate(calc(-50% + ${deltaX}px), -50%) scale(${scale})`}else if(direction==="vertical"){media.style.transform=`translate(-50%, calc(-50% + ${deltaY}px)) scale(${scale})`;media.style.opacity=`${
              1 - Math.min(Math.abs(deltaY) / 300, 0.7)
            }`}},{passive:!0},);media.addEventListener("touchend",()=>{if(!isSwiping)return;isSwiping=!1;media.style.transition="transform .25s ease, opacity .25s ease";if(direction==="horizontal"&&Math.abs(deltaX)>50){if(deltaX>0&&current>0)switchMedia(current-1);else if(deltaX<0&&current<elements.length-1)
switchMedia(current+1);else reset()}else if(direction==="vertical"&&deltaY<-100){closeLightbox()}else{reset()}});function reset(){media.style.transform=`translate(-50%, -50%) scale(${scale})`;media.style.opacity="1"}}
function addZoomEvents(){let lastTap=0;media.addEventListener("touchstart",(e)=>{if(e.touches.length===1){const now=Date.now();if(now-lastTap<300){e.preventDefault();const r=media.getBoundingClientRect();const ox=((e.touches[0].clientX-r.left)/r.width)*100;const oy=((e.touches[0].clientY-r.top)/r.height)*100;if(scale===1){scale=2;media.style.transformOrigin=`${ox}% ${oy}%`}else{scale=1;media.style.transformOrigin="center center"}
media.style.transform=`translate(-50%, -50%) scale(${scale})`;lastTap=0}else{lastTap=now}}});media.onwheel=(e)=>{e.preventDefault();const r=media.getBoundingClientRect();const ox=((e.clientX-r.left)/r.width)*100;const oy=((e.clientY-r.top)/r.height)*100;const prev=scale;scale=e.deltaY<0?Math.min(scale*1.1,3):Math.max(scale/1.1,1);media.style.transformOrigin=`${ox}% ${oy}%`;media.style.transform=`translate(-50%, -50%) scale(${scale})`};let pinchDist=0,pinchStart=scale;media.ontouchstart=(e)=>{if(e.touches.length===2){const[a,b]=e.touches;pinchDist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);pinchStart=scale}};media.ontouchmove=(e)=>{if(e.touches.length===2){e.preventDefault();const[a,b]=e.touches;const newDist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY,);const factor=newDist/pinchDist;scale=Math.min(Math.max(pinchStart*factor,1),3);const cx=(a.clientX+b.clientX)/2;const cy=(a.clientY+b.clientY)/2;const r=media.getBoundingClientRect();const ox=((cx-r.left)/r.width)*100;const oy=((cy-r.top)/r.height)*100;media.style.transformOrigin=`${ox}% ${oy}%`;media.style.transform=`translate(-50%, -50%) scale(${scale})`}};media.ontouchend=(e)=>{if(e.touches.length===0&&scale<=1.01){scale=1;media.style.transform=`translate(-50%, -50%) scale(1)`}};let isPanning=!1;let panStartX=0,panStartY=0;let currentX=0,currentY=0;media.addEventListener("touchstart",(e)=>{if(e.touches.length===1&&scale>1){isPanning=!0;panStartX=e.touches[0].clientX-currentX;panStartY=e.touches[0].clientY-currentY;media.style.transition="none"}},{passive:!0},);media.addEventListener("touchmove",(e)=>{if(!isPanning||e.touches.length!==1||scale<=1)return;e.preventDefault();currentX=e.touches[0].clientX-panStartX;currentY=e.touches[0].clientY-panStartY;media.style.transform=`translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) scale(${scale})`},{passive:!1},);media.addEventListener("touchend",()=>{isPanning=!1;if(scale<=1.01){currentX=currentY=0;media.style.transform=`translate(-50%, -50%) scale(1)`}})}
attachDrag();addZoomEvents()}
window.openZigryLightbox=openZigryLightbox});async function decryptGroup(container){if(!container)return;if(container.classList&&container.classList.contains("encrypted")){await decryptAndSetProtectedMedia(container);return}
const scope=container.querySelectorAll?container:document;const elements=Array.from(scope.querySelectorAll(".encrypted"));await Promise.all(elements.map((el)=>decryptAndSetProtectedMedia(el)))}
window.decryptGroup=decryptGroup;function bindZigryLightbox(root=document){const scope=root||document;let groups=[];if(scope.closest){const parentGroup=scope.closest(".media-files.media.zigry-images");if(parentGroup){groups=[parentGroup]}}
if(!groups.length&&scope.querySelectorAll){groups=Array.from(scope.querySelectorAll(".media-files.media.zigry-images"),)}
if(!groups.length&&scope.matches&&scope.matches(".media-files.media.zigry-images")){groups=[scope]}
groups.forEach((groupEl)=>{const allMedia=Array.from(groupEl.querySelectorAll("img, video.zigry-video"),);const imgs=allMedia.filter((el)=>el.tagName==="IMG");const videos=allMedia.filter((el)=>el.tagName==="VIDEO");imgs.forEach((img)=>{const idxInGroup=imgs.indexOf(img);img.style.cursor="pointer";img.removeEventListener("click",img._zigryHandler);img._zigryHandler=async(e)=>{if(e){e.preventDefault();e.stopPropagation()}
await decryptGroup(groupEl);const updatedMedia=Array.from(groupEl.querySelectorAll("img, video.zigry-video"),);const updatedImgs=updatedMedia.filter((el)=>el.tagName==="IMG");const currentIdx=updatedImgs.indexOf(img)!==-1?updatedImgs.indexOf(img):idxInGroup;openZigryLightbox(currentIdx>=0?currentIdx:0,updatedImgs.length?updatedImgs:imgs,)};img.addEventListener("click",img._zigryHandler)});videos.forEach((video)=>{video.style.cursor="pointer";video.removeAttribute("controls");video.removeEventListener("click",video._zigryVideoHandler);video._zigryVideoHandler=(()=>{let clickTimer=null;return(e)=>{e.preventDefault();if(clickTimer&&e.detail===2){clearTimeout(clickTimer);clickTimer=null;openZigryVideoPlayer(video);return}
if(clickTimer)clearTimeout(clickTimer);clickTimer=setTimeout(()=>{try{if(video.paused){document.querySelectorAll("video.zigry-video").forEach((v)=>{if(v!==video&&!v.paused)v.pause();});video.play()}else{video.pause()}}catch(err){}
clickTimer=null},220)}})();video.addEventListener("click",video._zigryVideoHandler);if(!video.parentElement.querySelector(".zigry-play-overlay")){const playOverlay=document.createElement("div");playOverlay.className="zigry-play-overlay";playOverlay.innerHTML=`<svg viewBox="0 0 24 24" width="60" height="60"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.6)"/><path d="M9.5 7.5v9l7-4.5-7-4.5z" fill="white"/></svg>`;playOverlay.style.cssText="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);cursor:pointer;z-index:5;pointer-events:auto;display:flex;align-items:center;justify-content:center;";video.parentElement.style.position="relative";video.parentElement.appendChild(playOverlay);if(!video.parentElement.querySelector(".zigry-inline-fullscreen")){const fsBtn=document.createElement("button");fsBtn.className="zigry-inline-fullscreen";fsBtn.innerHTML="⛶";fsBtn.title="Fullscreen";fsBtn.style.cssText="position:absolute;right:8px;bottom:8px;z-index:6;background: rgba(0,0,0,0.6); color:white;border:none;border-radius:4px;padding:6px;cursor:pointer;";fsBtn.addEventListener("click",(ev)=>{ev.preventDefault();ev.stopPropagation();try{openZigryVideoPlayer(video)}catch(e){}});video.parentElement.appendChild(fsBtn)}
const playOverlayEl=video.parentElement.querySelector(".zigry-play-overlay",);const updateOverlay=()=>{try{if(video.paused||video.ended){playOverlayEl.style.display="flex"}else{playOverlayEl.style.display="none"}}catch(e){}};try{playOverlayEl.addEventListener("click",(ev)=>{ev.preventDefault();ev.stopPropagation();if(video.paused)video.play();else video.pause()})}catch(e){}
video.addEventListener("play",updateOverlay);video.addEventListener("playing",updateOverlay);video.addEventListener("pause",updateOverlay);video.addEventListener("ended",updateOverlay);updateOverlay()}})})}
class VideoTracker{constructor(videoPath,postId){this.videoPath=videoPath;this.postId=postId;this.sessionId=null;this.watchTime=0;this.lastUpdateTime=0;this.progressInterval=null;this.isTracking=!1}
async startTracking(duration){if(this.isTracking)return;this.isTracking=!0;try{const res=await fetch("/api/video/track/play",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":document.querySelector('meta[name="csrf-token"]')?.content||"",},body:JSON.stringify({path:this.videoPath,post_id:this.postId,duration:Math.floor(duration),}),});const data=await res.json();if(data.success){this.sessionId=data.session_id;this.startProgressTracking()}}catch(e){console.error("[VideoTracker] Start error:",e)}}
startProgressTracking(){this.progressInterval=setInterval(()=>this.sendProgress(),10000)}
updateWatchTime(currentTime){if(currentTime>this.lastUpdateTime){this.watchTime+=currentTime-this.lastUpdateTime}
this.lastUpdateTime=currentTime}
async sendProgress(completed=!1){if(!this.sessionId)return;try{await fetch("/api/video/track/progress",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":document.querySelector('meta[name="csrf-token"]')?.content||"",},body:JSON.stringify({session_id:this.sessionId,watch_time:Math.floor(this.watchTime),duration:Math.floor(this.duration||0),completed,}),})}catch(e){console.error("[VideoTracker] Progress error:",e)}}
async endTracking(){if(!this.sessionId)return;clearInterval(this.progressInterval);try{await fetch("/api/video/track/end",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":document.querySelector('meta[name="csrf-token"]')?.content||"",},body:JSON.stringify({session_id:this.sessionId,watch_time:Math.floor(this.watchTime),}),})}catch(e){console.error("[VideoTracker] End error:",e)}
this.isTracking=!1;this.sessionId=null}}
async function fetchNextVideo(currentPostId,currentVideoPath){try{const response=await fetch("/api/video/next",{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"Zigry-Ajax",},body:JSON.stringify({current_post_id:currentPostId,current_video_path:currentVideoPath,}),});if(!response.ok)return null;const data=await response.json();if(data.success&&data.next_post_id){const nextVideo=document.querySelector(`[data-post-id="${data.next_post_id}"] video.zigry-video`,);return nextVideo||null}
return null}catch(e){console.warn("Failed to fetch next video from backend:",e);return null}}
function openZigryVideoPlayer(videoEl){const src=videoEl.src||videoEl.dataset.src;const poster=videoEl.poster||"";const postCard=videoEl.closest("[data-post-id]");const allVideos=postCard?Array.from(postCard.querySelectorAll("video.zigry-video")):[videoEl];let currentIndex=allVideos.indexOf(videoEl);if(currentIndex===-1)currentIndex=0;const urlParams=new URLSearchParams(src.split("?")[1]||"");const videoPath=urlParams.get("path")||"";const postId=postCard?.dataset?.postId||null;let startTime=0;try{const hash=window.location.hash;if(hash&&hash.includes("t=")){const timeMatch=hash.match(/[#&]t=(\d+)/);if(timeMatch&&timeMatch[1]){startTime=parseInt(timeMatch[1],10)}}}catch(e){}
try{document.querySelectorAll("video.zigry-video").forEach((v)=>{if(v!==videoEl&&!v.paused)v.pause();})}catch(e){}
const tracker=new VideoTracker(videoPath,postId);const lightbox=document.createElement("div");lightbox.className="zigry-lightbox zigry-video-lightbox";lightbox.style.cssText=`
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.95); z-index: 99999;
    display: flex; align-items: center; justify-content: center;
  `;const videoContainer=document.createElement("div");videoContainer.className="zigry-video-container";videoContainer.style.cssText=`
    position: relative; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    padding: 20px; box-sizing: border-box;
  `;const origVideo=videoEl;const wasPlaying=!!(origVideo&&!origVideo.paused&&!origVideo.ended);const currentTime=origVideo&&origVideo.currentTime?origVideo.currentTime:0;const originalParent=origVideo.parentElement;const originalNext=origVideo.nextSibling;const placeholder=document.createElement("div");placeholder.className="zigry-video-placeholder";try{originalParent.replaceChild(placeholder,origVideo)}catch(e){}
const video=origVideo;try{video.autoplay=!1;video.playsInline=!0;video.preload="auto";video.crossOrigin="anonymous";video.style.cssText="width: 100%; max-height: 100vh; height: auto; object-fit: contain; outline: none;";const seekTime=startTime>0?startTime:currentTime;if(!isNaN(seekTime)&&seekTime>0){video.currentTime=seekTime}
if(startTime>0||wasPlaying){video.autoplay=!0;setTimeout(()=>{try{video.play()}catch(e){}},100)}}catch(e){}
const controls=document.createElement("div");controls.className="zigry-video-controls";const progressWrapper=document.createElement("div");progressWrapper.style.cssText="position: relative; width: 100%; padding: 14px 0;";const progressContainer=document.createElement("div");progressContainer.style.cssText="width: 100%; height: 12px; background: transparent; border-radius: 3px; cursor: pointer; position: relative;";const preloadBar=document.createElement("div");preloadBar.style.cssText="position:absolute; top:50%; left:0; transform:translateY(-50%); height:6px; background: rgba(255,255,255,0.15); border-radius:3px; width:0%; pointer-events:none;";const hoverBar=document.createElement("div");hoverBar.style.cssText="position:absolute; top:50%; left:0; transform:translateY(-50%); height:6px; background: rgba(255,255,255,0.22); border-radius:3px; width: 0%; pointer-events: none;";const progressBar=document.createElement("div");progressBar.style.cssText="position:absolute; top:50%; left:0; transform:translateY(-50%); height:6px; background: #7f22f1; border-radius: 3px; width: 0%; transition: width 0.1s;";progressContainer.appendChild(preloadBar);progressContainer.appendChild(hoverBar);progressContainer.appendChild(progressBar);const thumbnailPreview=document.createElement("div");thumbnailPreview.style.cssText=`
    position: absolute; bottom: 20px; transform: translateX(-50%);
    display: none; flex-direction: column; align-items: center; pointer-events: none;
  `;const PREVIEW_MAX_W=220;const PREVIEW_MAX_H=124;const thumbnailCanvas=document.createElement("canvas");thumbnailCanvas.width=PREVIEW_MAX_W;thumbnailCanvas.height=PREVIEW_MAX_H;thumbnailCanvas.style.cssText="border-radius: 4px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.5);";const thumbnailTime=document.createElement("span");thumbnailTime.style.cssText="color: white; font-size: 12px; font-family: monospace; margin-top: 4px; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 3px;";thumbnailPreview.appendChild(thumbnailCanvas);thumbnailPreview.appendChild(thumbnailTime);progressWrapper.appendChild(thumbnailPreview);progressWrapper.appendChild(progressContainer);const timeDisplay=document.createElement("span");timeDisplay.className="zigry-time-display";timeDisplay.textContent="0:00 / 0:00";const controlRow=document.createElement("div");controlRow.className="zigry-controls-row";const leftControls=document.createElement("div");leftControls.className="zigry-controls-left";const rightControls=document.createElement("div");rightControls.className="zigry-controls-right";const playBtn=document.createElement("button");playBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';playBtn.className="zigry-control-btn";playBtn.title="Play";const qualityBtn=document.createElement("button");qualityBtn.innerHTML="Quality";qualityBtn.className="zigry-control-btn";qualityBtn.style.fontSize="13px";qualityBtn.style.width="auto";qualityBtn.style.borderRadius="4px";qualityBtn.style.padding="0 8px";const volumeContainer=document.createElement("div");volumeContainer.className="zigry-volume-container";const volumeBtn=document.createElement("button");volumeBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';volumeBtn.className="zigry-control-btn";volumeBtn.title="Mute/Unmute";const volumeSlider=document.createElement("input");volumeSlider.type="range";volumeSlider.min="0";volumeSlider.max="1";volumeSlider.step="0.1";volumeSlider.value="1";volumeSlider.className="zigry-volume-slider";const fullscreenBtn=document.createElement("button");fullscreenBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';fullscreenBtn.className="zigry-control-btn";fullscreenBtn.title="Fullscreen";const shareBtn=document.createElement("button");shareBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>';shareBtn.className="zigry-control-btn";shareBtn.title="Share";const prevBtn=document.createElement("button");prevBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>';prevBtn.title="Previous Video";prevBtn.className="zigry-control-btn";if(currentIndex<=0)prevBtn.style.opacity="0.3";const nextBtn=document.createElement("button");nextBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';nextBtn.title="Next Video";nextBtn.className="zigry-control-btn";if(currentIndex>=allVideos.length-1)nextBtn.style.opacity="0.3";const closeBtn=document.createElement("button");closeBtn.innerHTML="×";closeBtn.style.cssText=`
    position: absolute; top: 15px; right: 15px;
    background: rgba(0,0,0,0.5); border: none; color: white;
    font-size: 30px; cursor: pointer; width: 45px; height: 45px;
    border-radius: 50%; z-index: 10;
  `;volumeContainer.append(volumeBtn,volumeSlider);leftControls.append(prevBtn,playBtn,nextBtn,volumeContainer);rightControls.append(shareBtn,qualityBtn,fullscreenBtn);controlRow.append(leftControls,rightControls);controls.append(timeDisplay,progressWrapper,controlRow);videoContainer.append(video,controls);const qualityPanel=document.createElement("div");qualityPanel.className="zigry-quality-panel";qualityPanel.style.cssText="display:flex;flex-direction:column;gap:4px;pointer-events:auto;background:#fff;border:1px solid rgba(0,0,0,0.08);box-shadow:0 6px 24px rgba(0,0,0,0.12);padding:8px;border-radius:6px;max-height:320px;overflow-y:auto;min-width:120px;";lightbox.append(closeBtn,videoContainer);const setActiveQualityLabel=(label)=>{try{const normalized=String(label).toLowerCase().replace(/\s+/g,"");Array.from(qualityPanel.children).forEach((ch)=>{const txt=String(ch.textContent||ch.innerText||"").toLowerCase().replace(/\s+/g,"");if(txt===normalized||txt===normalized+"p"||(normalized.endsWith("p")&&txt===normalized)){ch.style.background="#7f22f1";ch.style.color="#fff"}else{ch.style.background="rgba(0,0,0,0.45)";ch.style.color="#fff"}});try{qualityBtn.innerText=label}catch(e){}}catch(e){}};const formatTime=(s)=>{const m=Math.floor(s/60);const sec=Math.floor(s%60);return `${m}:${sec.toString().padStart(2, "0")}`};let previewVideo=null;const ctx=thumbnailCanvas.getContext("2d");const generateThumbnail=(time)=>{if(!previewVideo){previewVideo=document.createElement("video");previewVideo.src=src;previewVideo.muted=!0;previewVideo.preload="auto";previewVideo.crossOrigin="anonymous";previewVideo.playsInline=!0}
const seekAndDraw=()=>{try{const vw=previewVideo.videoWidth||video.videoWidth||PREVIEW_MAX_W;const vh=previewVideo.videoHeight||video.videoHeight||PREVIEW_MAX_H;const ratio=vw&&vh?vw/vh:16/9;let w=PREVIEW_MAX_W;let h=Math.round(w/ratio);if(h>PREVIEW_MAX_H){h=PREVIEW_MAX_H;w=Math.round(h*ratio)}
thumbnailCanvas.width=w;thumbnailCanvas.height=h;previewVideo.currentTime=time}catch(e){}};previewVideo.onseeked=()=>{try{ctx.clearRect(0,0,thumbnailCanvas.width,thumbnailCanvas.height);const sw=previewVideo.videoWidth;const sh=previewVideo.videoHeight;if(sw&&sh){const canvasRatio=thumbnailCanvas.width/thumbnailCanvas.height;const videoRatio=sw/sh;let dw=thumbnailCanvas.width;let dh=thumbnailCanvas.height;if(videoRatio>canvasRatio){dh=Math.round(thumbnailCanvas.width/videoRatio)}else{dw=Math.round(thumbnailCanvas.height*videoRatio)}
const dx=Math.round((thumbnailCanvas.width-dw)/2);const dy=Math.round((thumbnailCanvas.height-dh)/2);ctx.drawImage(previewVideo,0,0,sw,sh,dx,dy,dw,dh)}else{ctx.drawImage(previewVideo,0,0,thumbnailCanvas.width,thumbnailCanvas.height,)}}catch(e){}};if(previewVideo.readyState>=1){seekAndDraw()}else{previewVideo.addEventListener("loadedmetadata",seekAndDraw,{once:!0,})}};progressWrapper.addEventListener("mousemove",(e)=>{const rect=progressContainer.getBoundingClientRect();const x=Math.max(0,Math.min(rect.width,e.clientX-rect.left));const pct=rect.width>0?Math.max(0,Math.min(1,x/rect.width)):0;const previewTime=pct*(video.duration||0);thumbnailPreview.style.display="flex";const pageX=e.clientX;const halfW=thumbnailCanvas.width/2;let leftPos=pageX;if(pageX-halfW<8)leftPos=8+halfW;if(pageX+halfW>window.innerWidth-8)
leftPos=window.innerWidth-8-halfW;thumbnailPreview.style.left=`${leftPos - rect.left}px`;thumbnailTime.textContent=formatTime(previewTime);hoverBar.style.width=pct*100+"%";if(video.duration&&!isNaN(previewTime))generateThumbnail(previewTime);});progressWrapper.addEventListener("mouseleave",()=>{thumbnailPreview.style.display="none";hoverBar.style.width="0%"});video.addEventListener("timeupdate",()=>{const pct=(video.currentTime/video.duration)*100;progressBar.style.width=pct+"%";timeDisplay.textContent=`${formatTime(video.currentTime)} / ${formatTime(
      video.duration || 0,
    )}`;try{if(video.buffered&&video.buffered.length){const end=video.buffered.end(video.buffered.length-1);const bufPct=(end/video.duration)*100;preloadBar.style.width=Math.max(bufPct,0)+"%"}else{preloadBar.style.width="0%"}}catch(e){preloadBar.style.width="0%"}});video.addEventListener("loadedmetadata",()=>{tracker.startTracking(video.duration);try{const seekTime=startTime>0?startTime:0;if(seekTime>0&&seekTime<video.duration){video.currentTime=seekTime}}catch(e){}
try{if(video.videoWidth&&video.videoHeight){video.setAttribute("data-video-quality",`${video.videoWidth}x${video.videoHeight}`,);try{setActiveQualityLabel(video.videoHeight?video.videoHeight+"p":video.videoWidth+"x",)}catch(e){}}}catch(e){}});const buildQualityPanel=()=>{let qualities=null;try{const raw=video.dataset.qualitySources||video.dataset.qualities||video.dataset.sources||video.dataset.qualitySrc||null;if(raw)qualities=JSON.parse(raw);}catch(e){qualities=null}
const normalizeQualityLabel=(raw)=>{if(raw===null||raw===undefined)return"Auto";let s=String(raw).toLowerCase().trim();const mx=s.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})/);if(mx)return mx[2]?mx[2]+"p":s;const n=parseInt(s.replace(/[^0-9]/g,""),10);if(!isNaN(n)&&n>0){if(n>=4320)return"8k";if(n>=2160)return"4k";return n+"p"}
return s};const entries=[];if(qualities&&typeof qualities==="object"&&!Array.isArray(qualities)){Object.keys(qualities).sort((a,b)=>parseInt(b)-parseInt(a)).forEach((k)=>entries.push({label:normalizeQualityLabel(k),src:qualities[k],raw:k,}),)}else if(qualities&&Array.isArray(qualities)){qualities.forEach((q)=>{if(q&&q.src)
entries.push({label:normalizeQualityLabel(q.label||q.label),src:q.src,raw:q.label||q.src,})})}
if(!entries.length){const baseUrl=video.currentSrc||video.src||"";const maxHeight=video.videoHeight||1080;const standardQualities=[{label:"240p",height:240},{label:"360p",height:360},{label:"480p",height:480},{label:"720p",height:720},{label:"1080p",height:1080},{label:"2k",height:1440},{label:"4k",height:2160},];standardQualities.forEach((q)=>{if(q.height<=maxHeight*1.1){try{const url=new URL(baseUrl,window.location.origin);url.searchParams.set("quality",q.height);entries.push({label:q.label,src:url.toString(),raw:q.height,active:Math.abs(q.height-maxHeight)<50,})}catch(e){entries.push({label:q.label,src:baseUrl+(baseUrl.includes("?")?"&":"?")+"quality="+q.height,raw:q.height,active:Math.abs(q.height-maxHeight)<50,})}}});if(!entries.length){const rawLabel=video.getAttribute("data-video-quality")||(video.videoWidth&&video.videoHeight?`${video.videoWidth}x${video.videoHeight}`:"Auto");const label=normalizeQualityLabel(rawLabel);entries.push({label,src:baseUrl,raw:rawLabel,active:!0})}}
qualityPanel.innerHTML="";entries.forEach((item)=>{const btn=document.createElement("button");btn.className="zigry-quality-item";btn.textContent=item.label;btn.style.cssText="background:transparent;color:#222;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;font-size:13px;text-align:left;width:100%;transition:background 0.15s;";btn.addEventListener("mouseenter",()=>(btn.style.background="#f0f0f0"),);btn.addEventListener("mouseleave",()=>(btn.style.background="transparent"),);btn.addEventListener("click",(e)=>{e.stopPropagation();qualityPanel.remove();if(video.src===item.src){return}
const wasPlaying=!video.paused&&!video.ended;const ct=video.currentTime;try{video.pause()}catch(e){}
try{video.src=item.src;video.load()}catch(e){}
video.addEventListener("loadedmetadata",function onMeta(){try{if(!isNaN(ct)&&video.duration)
video.currentTime=Math.min(ct,video.duration);}catch(e){}
try{if(wasPlaying)video.play().catch(()=>{})}catch(e){}
try{qualityBtn.innerHTML=item.label}catch(e){}
video.removeEventListener("loadedmetadata",onMeta)})});qualityPanel.appendChild(btn)});try{const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;let downlink=conn&&conn.downlink?conn.downlink:null;let effective=conn&&conn.effectiveType?conn.effectiveType:null;let pickIndex=0;if(entries.length===1)pickIndex=0;else if(downlink!==null){if(downlink>=5)
pickIndex=0;else if(downlink>=2)pickIndex=Math.floor(entries.length/2);else pickIndex=entries.length-1}else if(effective){if(effective.includes("4g"))pickIndex=0;else if(effective.includes("3g"))
pickIndex=Math.floor(entries.length/2);else pickIndex=entries.length-1}
pickIndex=Math.max(0,Math.min(entries.length-1,pickIndex));try{qualityPanel.children[pickIndex]&&qualityPanel.children[pickIndex].click()}catch(e){}}catch(e){}};buildQualityPanel();qualityBtn.addEventListener("click",(ev)=>{ev.stopPropagation();if(qualityPanel.parentElement===document.body){qualityPanel.remove();return}
buildQualityPanel();try{const r=qualityBtn.getBoundingClientRect();qualityPanel.style.position="fixed";qualityPanel.style.display="block";qualityPanel.style.zIndex=100010;document.body.appendChild(qualityPanel);const m=qualityPanel.getBoundingClientRect();let left=Math.round(r.right-m.width);if(left<8)left=8;if(left+m.width>window.innerWidth-8)
left=window.innerWidth-m.width-8;let top=Math.round(r.bottom+8);if(top+m.height>window.innerHeight-8){top=Math.round(r.top-m.height-8)}
if(top<8)top=8;qualityPanel.style.left=left+"px";qualityPanel.style.top=top+"px";setTimeout(()=>{document.addEventListener("click",()=>qualityPanel.remove(),{once:!0,})},0)}catch(e){try{document.body.appendChild(qualityPanel)}catch(err){}}});const onPlay=()=>{playBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';if(!tracker.progressInterval&&tracker.sessionId){tracker.progressInterval=setInterval(()=>tracker.sendProgress(),10000,)}};const onPause=()=>{playBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';if(tracker.progressInterval){clearInterval(tracker.progressInterval);tracker.progressInterval=null}
tracker.updateWatchTime(video.currentTime)};const onEnded=()=>{playBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>';tracker.updateWatchTime(video.currentTime);tracker.sendProgress(!0);setTimeout(()=>{if(currentIndex<allVideos.length-1&&nextBtn){nextBtn.click()}},500)};const onTimeUpdate=()=>{const pct=(video.currentTime/video.duration)*100;progressBar.style.width=pct+"%";timeDisplay.textContent=`${formatTime(video.currentTime)} / ${formatTime(
      video.duration || 0,
    )}`;try{if(video.buffered&&video.buffered.length){const end=video.buffered.end(video.buffered.length-1);const bufPct=(end/video.duration)*100;preloadBar.style.width=Math.max(bufPct,0)+"%"}else{preloadBar.style.width="0%"}}catch(e){preloadBar.style.width="0%"}};const onProgress=()=>{try{if(video.buffered&&video.buffered.length){const end=video.buffered.end(video.buffered.length-1);const bufPct=(end/video.duration)*100;preloadBar.style.width=Math.max(bufPct,0)+"%"}}catch(e){}};const onLoadedMetadata=()=>{try{if(video.buffered&&video.buffered.length){const end=video.buffered.end(video.buffered.length-1);const bufPct=(end/video.duration)*100;preloadBar.style.width=Math.max(bufPct,0)+"%"}}catch(e){}
tracker.startTracking(video.duration);try{const seekTime=startTime>0?startTime:0;if(seekTime>0&&seekTime<video.duration){video.currentTime=seekTime}}catch(e){}
try{if(video.videoWidth&&video.videoHeight){video.setAttribute("data-video-quality",`${video.videoWidth}x${video.videoHeight}`,);try{setActiveQualityLabel(video.videoHeight?video.videoHeight+"p":video.videoWidth+"x",)}catch(e){}}}catch(e){}};video.addEventListener("play",onPlay);video.addEventListener("pause",onPause);video.addEventListener("ended",onEnded);video.addEventListener("timeupdate",onTimeUpdate);video.addEventListener("loadedmetadata",onLoadedMetadata);video.addEventListener("progress",onProgress);playBtn.onclick=()=>(video.paused?video.play():video.pause());progressWrapper.onclick=(e)=>{const rect=progressContainer.getBoundingClientRect();const x=Math.max(0,Math.min(rect.width,e.clientX-rect.left));const pct=rect.width>0?x/rect.width:0;if(video.duration)video.currentTime=pct*video.duration};video.addEventListener("progress",()=>{try{if(video.buffered&&video.buffered.length){const end=video.buffered.end(video.buffered.length-1);const bufPct=(end/video.duration)*100;preloadBar.style.width=Math.max(bufPct,0)+"%"}}catch(e){}});video.addEventListener("loadedmetadata",()=>{try{if(video.buffered&&video.buffered.length){const end=video.buffered.end(video.buffered.length-1);const bufPct=(end/video.duration)*100;preloadBar.style.width=Math.max(bufPct,0)+"%"}}catch(e){}});volumeSlider.oninput=()=>{video.volume=volumeSlider.value;volumeBtn.innerHTML=video.volume==0?"🔇":video.volume<0.5?"🔉":"🔊"};volumeBtn.onclick=()=>{video.muted=!video.muted;volumeBtn.innerHTML=video.muted?"🔇":"🔊"};const updateVolumeFill=()=>{try{const min=parseFloat(volumeSlider.min)||0;const max=parseFloat(volumeSlider.max)||1;const val=parseFloat(volumeSlider.value)||0;const pct=Math.round(((val-min)/(max-min))*100);volumeSlider.style.background=`linear-gradient(90deg, #7f22f1 ${pct}%, rgba(255,255,255,0.18) ${pct}%)`}catch(e){}};updateVolumeFill();volumeSlider.addEventListener("input",updateVolumeFill);shareBtn.onclick=async()=>{const origin=window.location.origin;const baseLink=postId?`${origin}/post/${postId}`:window.location.href.split("#")[0];try{if(navigator.share){await navigator.share({title:document.title||"Video",url:baseLink,});return}}catch(e){}
try{if(navigator.clipboard&&navigator.clipboard.writeText)
await navigator.clipboard.writeText(baseLink);else{const ta=document.createElement("textarea");ta.value=baseLink;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()}
try{if(zigry&&zigry.toast)zigry.toast("Link copied to clipboard");}catch(e){}}catch(e){}};const showMenuFor=(targetVideo,clientX,clientY)=>{removeZigryVideoMenu();const menu=document.createElement("div");menu.className="zigry-video-menu";menu.style.position="fixed";menu.style.zIndex=100005;menu.setAttribute("role","menu");menu.tabIndex=0;menu.addEventListener("contextmenu",(ev)=>ev.preventDefault());menu.addEventListener("click",(ev)=>ev.stopPropagation());const makeItem=(label,onClick)=>{const it=document.createElement("div");it.textContent=label;it.style.padding="8px 12px";it.style.cursor="pointer";it.addEventListener("click",(e)=>{e.stopPropagation();try{onClick()}finally{removeZigryVideoMenu()}});it.addEventListener("mouseenter",()=>(it.style.background="#f6f6f6"),);it.addEventListener("mouseleave",()=>(it.style.background="transparent"),);return it};const origin=window.location.origin;const baseLink=postId?`${origin}/post/${postId}`:window.location.href.split("#")[0];menu.appendChild(makeItem("Copy video link (current time)",()=>{const readTime=()=>Math.floor(targetVideo&&targetVideo.currentTime?targetVideo.currentTime:0,);let secs=readTime();if(secs===0&&!targetVideo.paused){setTimeout(()=>{secs=readTime();try{navigator.clipboard.writeText(`${baseLink}#t=${secs}`)}catch(e){const ta=document.createElement("textarea");ta.value=`${baseLink}#t=${secs}`;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()}},120)}else{try{navigator.clipboard.writeText(`${baseLink}#t=${secs}`)}catch(e){const ta=document.createElement("textarea");ta.value=`${baseLink}#t=${secs}`;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()}}}),);menu.appendChild(makeItem("Copy video link",()=>{try{navigator.clipboard.writeText(baseLink)}catch(e){const ta=document.createElement("textarea");ta.value=baseLink;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()}}),);const M_WIDTH=260;const M_HEIGHT=120;let left=clientX;let top=clientY;if(left+M_WIDTH>window.innerWidth)
left=Math.max(8,window.innerWidth-M_WIDTH-8);if(top+M_HEIGHT>window.innerHeight)
top=Math.max(8,window.innerHeight-M_HEIGHT-8);menu.style.left=left+"px";menu.style.top=top+"px";document.body.appendChild(menu);setTimeout(()=>{document.addEventListener("click",()=>removeZigryVideoMenu(),{once:!0,});document.addEventListener("keydown",(e)=>{if(e.key==="Escape")removeZigryVideoMenu();})},0)};video.addEventListener("contextmenu",(ev)=>{ev.preventDefault();ev.stopPropagation();showMenuFor(video,ev.clientX,ev.clientY)});const cleanupCurrentVideo=()=>{const stillPlaying=!video.paused&&!video.ended;try{tracker.endTracking()}catch(e){}
video.removeEventListener("play",onPlay);video.removeEventListener("pause",onPause);video.removeEventListener("ended",onEnded);video.removeEventListener("timeupdate",onTimeUpdate);video.removeEventListener("loadedmetadata",onLoadedMetadata);video.removeEventListener("progress",onProgress);if(previewVideo)previewVideo.src="";try{if(placeholder&&placeholder.parentElement){placeholder.parentElement.replaceChild(video,placeholder);if(originalNext)originalParent.insertBefore(video,originalNext);}else if(originalParent){originalParent.appendChild(video)}}catch(e){}
try{video.style.cssText="";video.controls=!1}catch(e){}
try{video.pause()}catch(e){}
lightbox.remove();document.body.style.overflow=""};prevBtn.onclick=()=>{if(currentIndex>0){const prevVideo=allVideos[currentIndex-1];cleanupCurrentVideo();setTimeout(()=>openZigryVideoPlayer(prevVideo),50)}};nextBtn.onclick=()=>{if(currentIndex<allVideos.length-1){const nextVideo=allVideos[currentIndex+1];cleanupCurrentVideo();setTimeout(()=>openZigryVideoPlayer(nextVideo),50)}};fullscreenBtn.onclick=()=>{try{if(document.fullscreenElement){document.exitFullscreen()}else{if(lightbox.requestFullscreen)lightbox.requestFullscreen();else if(lightbox.webkitRequestFullscreen)
lightbox.webkitRequestFullscreen();}}catch(e){}};closeBtn.onclick=cleanupCurrentVideo;lightbox.onclick=(e)=>{if(e.target===lightbox){cleanupCurrentVideo()}};const keyHandler=(e)=>{if(e.key==="Escape")closeBtn.click();if(e.key===" "||e.key==="k"){e.preventDefault();playBtn.click()}
if(e.key==="ArrowLeft"){if(e.shiftKey&&currentIndex>0){e.preventDefault();prevBtn.click()}else{video.currentTime-=10}}
if(e.key==="ArrowRight"){if(e.shiftKey&&currentIndex<allVideos.length-1){e.preventDefault();nextBtn.click()}else{video.currentTime+=10}}
if(e.key==="ArrowUp"){e.preventDefault();video.volume=Math.min(1,video.volume+0.1);volumeSlider.value=video.volume}
if(e.key==="ArrowDown"){e.preventDefault();video.volume=Math.max(0,video.volume-0.1);volumeSlider.value=video.volume}
if(e.key==="m")volumeBtn.click();if(e.key==="f")fullscreenBtn.click();};document.addEventListener("keydown",keyHandler);const observer=new MutationObserver(()=>{if(!document.body.contains(lightbox)){document.removeEventListener("keydown",keyHandler);window.removeEventListener("beforeunload",beforeUnloadHandler);observer.disconnect()}});observer.observe(document.body,{childList:!0});const beforeUnloadHandler=()=>{tracker.endTracking()};window.addEventListener("beforeunload",beforeUnloadHandler);let controlsTimeout;videoContainer.addEventListener("mousemove",()=>{controls.style.opacity="1";clearTimeout(controlsTimeout);controlsTimeout=setTimeout(()=>{if(!video.paused)controls.style.opacity="0"},3000)});videoContainer.addEventListener("mouseleave",()=>{if(!video.paused)controls.style.opacity="0"});document.body.style.overflow="hidden";document.body.appendChild(lightbox);video.play().catch(()=>{})}
function openZigryReel(index,videos){let currentIndex=index;const container=document.createElement("div");container.className="zigry-reels-container";const createVideo=(src,autoplay=!0)=>{const vid=document.createElement("video");vid.src=src;vid.autoplay=autoplay;vid.loop=!0;vid.muted=!0;vid.playsInline=!0;vid.controls=!1;vid.className="reel-video";return vid};const showVideo=(i)=>{if(!videos[i])return;container.innerHTML="";const vidEl=createVideo(videos[i].dataset.decryptedSrc||videos[i].dataset.url||videos[i].src,);container.appendChild(vidEl);currentIndex=i;const next=videos[i+1];if(next){const preload=document.createElement("video");preload.src=next.dataset.decryptedSrc||next.dataset.url||next.src}};showVideo(index);let startY=0;container.addEventListener("touchstart",(e)=>(startY=e.touches[0].clientY),);container.addEventListener("touchend",(e)=>{const endY=e.changedTouches[0].clientY;const delta=startY-endY;if(delta>50)
showVideo(currentIndex+1);else if(delta<-50)showVideo(currentIndex-1);});container.addEventListener("wheel",(e)=>{if(e.deltaY>0)showVideo(currentIndex+1);else if(e.deltaY<0)showVideo(currentIndex-1);});const closeBtn=document.createElement("button");closeBtn.textContent="×";closeBtn.className="reel-close-btn";closeBtn.onclick=()=>container.remove();container.appendChild(closeBtn);document.body.appendChild(container)}
window.$=function $(el){return document.querySelector(el)};let loading=!1;let hasMore=!0;let currentPage=0;let observer=null;let translations={like:"Like",unlike:"Unlike",comment:"Comment",share:"Share",likes:"Likes",unlikes:"Unlikes",comments:"Comments",shares:"Shares",sharefrom:"Shared From",viewPost:"View Post",};try{if(window&&window.translations&&typeof window.translations==="object"){translations={...translations,...window.translations}}}catch(e){}
const nl2br=(str)=>str.replace(/\n/g,"<br>");const pluralize=(count,singular)=>{const num=parseInt(count)||0;return(num+" "+(num<2?translations[singular]:translations[singular+"s"]))};const parseHashtags=(text)=>{if(!text)return text;return text.replace(/#(\w+)/g,'<a href="/tag/$1" class="text-primary zigry-link hashtag-link">#$1</a>',)};const parseContent=(text)=>{if(!text)return"";return parseHashtags(nl2br(text))};function renderPosts(posts,position="append",containerSelector="#posts"){const container=document.querySelector(containerSelector);if(!container)return;const fragment=document.createDocumentFragment();posts.forEach((post)=>{const privacyMap={public:"🌐",friends:"👥",private:"🔒",};const privacyLabel=privacyMap[post.privacy?.toLowerCase()]||"❓ Unknown";if(post.is_ad){createAdCard(post)}
const div=document.createElement("div");let mediaHtml="";try{if(post.media){const mediaData=JSON.parse(post.media);if(mediaData.images){mediaData.images.forEach((img)=>{mediaHtml+=`<img class="img-fluid encrypted" data-url="${img.url}" src="${img.thumb || img.url}" />`})}
if(mediaData.videos){mediaData.videos.forEach((vid)=>{const posterAttr=vid.thumb?`poster="${vid.thumb}"`:"";const isFullUrl=typeof vid.url==="string"&&(vid.url.startsWith("http://")||vid.url.startsWith("https://"));const streamUrl=isFullUrl?vid.url:`/api/video/stream?path=${encodeURIComponent(vid.url)}`;mediaHtml+=`<div class="zigry-video-wrapper border border-solid" style="position:relative;background-color: rgb(0, 0, 0);"><video class="w-100 zigry-video z-2" playsinline ${posterAttr} src="${streamUrl}" preload="metadata">Your browser does not support video.</video></div>`})}}}catch(e){mediaHtml=post.media||""}
if(!mediaHtml&&(post.featured_image||post.image)){const featImg=post.featured_image||post.image;mediaHtml=`<img class="img-fluid encrypted" data-url="${featImg}" src="${featImg}" />`}
const authorName=post.original_user_name||post.author_name||post.name||post.advertiser_name||post.username||post.author_username||"";const username=post.username||post.author_username||"";const avatar=post.avatarthumb||post.author_avatar||post.avatar||"";let postContentHtml="";if(post.title){const blogUrl=post.slug?`/blog/${post.slug}`:`/post/${post.post_id}`;postContentHtml+=`<h4 class="fw-bold mb-2"><a href="${blogUrl}" class="text-reset text-decoration-none zigry-link">${post.title}</a></h4>`}
if(post.content){postContentHtml+=parseContent(post.content)}else if(post.description){postContentHtml+=parseContent(post.description)}
let pollHtml="";try{const mediaData=JSON.parse(post.media);if(mediaData.poll){const poll=mediaData.poll;const hasVoted=poll.voters&&poll.voters.includes(window.currentUser?.id||0);const isExpired=poll.expires_at&&new Date(poll.expires_at)<new Date();const showResults=hasVoted||isExpired;const totalVotes=poll.total_votes||0;let optionsHtml="";poll.options.forEach((opt,idx)=>{const votes=(poll.votes&&poll.votes[idx])||0;const pct=totalVotes>0?Math.round((votes/totalVotes)*100):0;const isWinner=totalVotes>0&&votes===Math.max(...(poll.votes||[]));if(showResults){optionsHtml+=`
              <div class="poll-result-option ${isWinner ? "poll-winner" : ""}">
                <div class="poll-result-bar" style="width: ${pct}%"></div>
                <div class="poll-result-content">
                  <span class="poll-result-text">${opt}</span>
                  <span class="poll-result-pct">${pct}%</span>
                </div>
              </div>`}else{optionsHtml+=`
              <button class="poll-vote-btn" onclick="votePoll(${post.post_id}, ${idx}, this)" data-post-id="${post.post_id}" data-option="${idx}">
                <span class="poll-vote-dot"></span>
                <span class="poll-vote-text">${opt}</span>
              </button>`}});let timeStr="";if(isExpired){timeStr="Poll ended"}else if(poll.expires_at){const diff=new Date(poll.expires_at)-new Date();const days=Math.floor(diff/(1000*60*60*24));const hours=Math.floor((diff%(1000*60*60*24))/(1000*60*60),);if(days>0)timeStr=`${days}d ${hours}h left`;else if(hours>0)timeStr=`${hours}h left`;else timeStr="Ending soon"}else{timeStr="No time limit"}
pollHtml=`
          <div class="poll-feed-container" data-post-id="${post.post_id}">
            <div class="poll-feed-question">${poll.question}</div>
            <div class="poll-feed-options">${optionsHtml}</div>
            <div class="poll-feed-footer">
              <span class="poll-feed-votes">${totalVotes} vote${totalVotes !== 1 ? "s" : ""}</span>
              <span class="poll-feed-timer">${timeStr}</span>
            </div>
          </div>`}}catch(e){}
div.innerHTML=`
      <div class="card mb-5 rounded rounded-4 zigry-liquid" data-post-id="${
        post.post_id
      }" data-privacy="${post.privacy || ""}" style="min-height:100px">
      
          <div class="card-header border-0 p-1 py-0 px-1 align-items-center">
            <div class="card-title my-1">
              <div class="name d-flex justify-content-between align-items-center">
              <div class="gap-1 d-flex align-items-center">
                <a href="/${username}" class="text-reset text-decoration-none zigry-link">
                  <img onerror="if(!this.dataset.fallbackAttempted){this.dataset.fallbackAttempted='1';this.src='/assets/images/default/${
                    post.gender?.toLowerCase() || "756e6b6e6f776e"
                  }.png';}else{this.style.display='none';}"
                       class="rounded-circle border border-2 object-fit-cover lock dp${post.ref_id || post.post_id}"
                       alt="Profile" height="40px" src="${avatar}"></a>
                  <div class="my-auto">
                    <div class="d-grid">
                    <div>
                                         ${
                                           post.source_name &&
                                           post.type &&
                                           post.type !== "user"
                                             ? `<a href="/${post.type}s/${post.source_username || post.on_id}" class="text-reset text-decoration-none zigry-link fw-semibold text-muted">${post.source_name}</a><span class="mx-1 text-muted opacity-50" style="font-size:10px;">▶</span>`
                                             : ""
                                         }
                    <a href="/${username}" class="text-reset text-decoration-none zigry-link">
                    ${authorName}
                    ${
                      post.verified
                        ? '<span class="lock mb-1 zigry z-verified zigry-xs"></span>'
                        : ""
                    }</a>

  
                    <div>
                    <a href="/post/${
                      post.post_id
                    }" class="text-reset text-decoration-none zigry-link smaller">
                      <span class="opacity-75">${post.created_at || ""}</span>
                      <span class="text-primary">${privacyLabel}</span> ${translations?.viewPost}
                    </a>

                    </div>
                    </div>
                    </div>
                  </div>
                </div>
                
                ${
                  post.is_ad
                    ? `<div class="float-end bg-light text-muted small p-2 rounded-pill"><i>Ad</i></div>`
                    : `<div class="d-flex flex-column align-items-end"><div class="d-flex align-items-center gap-1"><div class="dropdown"><button class="btn btn-sm border-0 dropdown-toggle px-2 py-0" type="button" data-bs-toggle="dropdown"><span class="visually-hidden">Post Actions ${post.post_id}</span></button><ul class="dropdown-menu dropdown-menu-end p-0">${post.own_post?`
                                    <li><a class="dropdown-item" href="#" data-action="edit" data-id="${post.post_id}">Edit</a></li>
                                    <li><a class="dropdown-item text-danger" href="#" data-action="delete" data-id="${post.post_id}">Delete</a></li>
                                  `:`
                                    <li><a class="dropdown-item text-warning" href="#" data-action="report" data-id="${post.post_id}">Report</a></li>
                                  `}</ul></div></div></div>`
                }
              </div>
            </div>
          </div>
    
          ${
            post.shared_from_name && post.shared_from_uname
              ? `<div class="p-1 py-0 mx-3 mt-1 text-muted d-flex justify-content-between align-items-center"><div class="d-flex gap-2 align-items-center">↪<b class="small d-none">${translations.sharefrom||"Shared from"}</b><a href="/${
                        post.shared_from_uname
                      }" class="link gap-2 align-items-center d-flex zigry-link"><img onerror="if(!this.dataset.fallbackAttempted){this.dataset.fallbackAttempted='1';this.src='/assets/images/default/${
                            post.shared_from_gender?.toLowerCase() ||
                            "756e6b6e6f776e"
                          }.png';}else{this.style.display='none';}"
class="rounded-circle border border-2 object-fit-cover lock"
alt="Profile" height="32px" src="${
                                post.from_avatar
                              }"><div>${post.shared_from_name||""}</div><span class="${
                            post.shared_from_verified
                              ? "lock mb-1 zigry z-verified zigry-xs"
                              : "d-none"
                          }"></span></a></div></div>`
              : ""
          }
          ${
            post.is_ad
              ? post.cta_type === "form"
                ? `<div style="cursor:pointer" onclick="zigry.showLeadForm(${
                    post.campaign_id
                  }, ${JSON.stringify(post.form_config || {}).replace(
                    /"/g,"&quot;",)})">`
                : `<a href="${post.target_url||"#"}" target="_blank" class="text-reset text-decoration-none" onclick="trackAd(${post.campaign_id},'click')">`
              : post.target_url
                ? '<a href="' +
                  post.target_url +
                  '" class="text-reset text-decoration-none">'
                : ""
          }
          <div class="card-body lead p-0" style="min-height:50px;">
            <div class="media-files media zigry-images">${mediaHtml || ""}</div>
            ${pollHtml}
            <div class="content px-3 ${mediaHtml&&postContentHtml?"mt-2":""}">${postContentHtml}</div>
          </div>
          ${
            post.is_ad && post.cta_text
              ? `
              <div class="px-3 pb-2">
                <div class="d-flex justify-content-between align-items-center p-2 rounded border">
                  <div class="flex-grow-1 me-2 overflow-hidden">
                    <div class="text-truncate fw-bold small">${
                      post.target_url
                        ? new URL(post.target_url).hostname
                        : "zigry.com"
                    }</div>
                    <div class="text-muted small text-truncate py-1">Sponsored</div>
                  </div>
                  <button class="btn btn-sm btn-primary rounded-pill px-3" 
                    ${
                      post.cta_type === "form"
                        ? `onclick="event.preventDefault();zigry.showLeadForm(${post.campaign_id},${JSON.stringify(post.form_config||{}).replace(/"/g,"&quot;",)})"`
                        : ""
                    }>
                    ${post.cta_text}
                  </button>
                </div>
              </div>`
              : ""
          }
          ${
            post.is_ad
              ? post.cta_type === "form"
                ? "</div>"
                : "</a>"
              : post.target_url
                ? "</a>"
                : ""
          }
                      <!-- View all comments link -->
            ${
              parseInt(post.comment_counts) > 0
                ? `
            <div class="px-2 py-1">
              <a href="#" class="text-muted text-decoration-none view-all-comments small" data-post-id="${post.post_id}">
                View all ${post.comment_counts} ${translations.comments}
              </a>
            </div>
            `
                : ""
            }
    <hr class="my-0">
    
          <div class="count d-flex justify-content-between my-1 mx-2">
            <div class="like_count w-100 ms-1 text-start" data-count="${post.like_counts||0}">${pluralize(
              post.like_counts || 0,
              "like",
            )}</div>
            <div class="comments_count w-100 mx-auto text-center" data-count="${post.comment_counts||0}">${pluralize(
              post.comment_counts || 0,
              "comment",
            )}</div>
            <div class="share_count w-100 me-1 text-end" data-count="${post.share_counts||0}">${pluralize(
              post.share_counts || 0,
              "share",
            )}</div>
          </div>
          <div class="card-footer p-0 border-0">
          <hr class="my-0">
            
            <div class="buttons d-flex btn-group-justified border-0 align-items-center">
              <div class="btn w-100 text-start align-items-center" data-action="like"><span class="fs-5 rounded like-icon text-danger">${
                post.likes
                  ? "<i class='zigry z-like zigry-md fill-red-700'></i>"
                  : "<i class='zigry zigry-md z-like no-fill stroke-red-700'></i>"
              }</span> <span class="like-text small d-none d-md-block">${
                post.likes ? translations.unlike : translations.like
              }</span></div>
              <div class="btn w-100 text-center align-items-center py-0" data-action="comment"><span class="fs-5"><i class="zigry z-comment zigry-md"></i></span><span class="small d-none d-md-block"> ${
                translations.comment || "Comment"
              }</span> </div>
              <div class="btn w-100 text-end align-items-center py-0" data-action="share"><span class="fs-5"><i class="zigry z-share-plane zigry-md"></i></span> <span class="small d-none d-md-block">${
                translations.share || "Share"
              }</span> </div>
            </div>
            

          </div>
        </div>
      `;

    // Ensure comments-section is initially hidden
    const commentsSection = div.querySelector(".comments-section");
    if (commentsSection) {
      commentsSection.style.display = "none";
    }

    const mediaContainer = div.querySelector(".media-files.media.zigry-images");
    if (mediaContainer) {
      const imgs = mediaContainer.querySelectorAll("img");
      const videos = mediaContainer.querySelectorAll(".zigry-video-wrapper");
      const imgCount = imgs.length;
      const videoCount = videos.length;
      const totalMediaCount = imgCount + videoCount;

      // Apply gallery layout if there's any media (images or videos)
      if (totalMediaCount > 0) {
        mediaContainer.classList.add("zigry-gallery");

        // Apply layout based on TOTAL media count
        if (totalMediaCount === 1) {
          mediaContainer.classList.add("zigry-single");
          mediaContainer.classList.add("w-100");
          // Fixed height container for single media
          mediaContainer.style.minHeight = "450px";
          mediaContainer.style.height = "100%";
          mediaContainer.style.maxHeight = "450px";
          mediaContainer.style.overflow = "hidden";
          mediaContainer.style.position = "relative";
        } else if (totalMediaCount === 2) {
          mediaContainer.classList.add("zigry-two");
        } else {
          mediaContainer.classList.add("zigry-four");
          mediaContainer.classList.add("gap-1");
        }

        // Process all media items (images + videos) together
        const allMediaItems = [...imgs, ...videos];

        allMediaItems.forEach((item, i) => {
          const isImage = item.tagName === "IMG";
          const wrapper = document.createElement("div");
          wrapper.className =
            "zigry-img-wrap d-flex justify-content-center border border-solid";

          if (post.is_ad) {
            // Disable pointer events on media for ads to prevent lightbox and allow click-through
            item.style.pointerEvents = "none";
            wrapper.style.pointerEvents = "none";
          }

          if (totalMediaCount === 1) {
            wrapper.style.height = "450px";
            wrapper.style.width = "100%";
            wrapper.style.position = "relative";
            wrapper.style.overflow = "hidden";
            wrapper.classList.remove("d-flex", "justify-content-center");
            wrapper.style.backgroundColor = "#000";

            if (isImage) {
              // Mark image as single for decryption handler
              item.classList.add("zigry-single-img");
              item.classList.add("mx-auto");
              item.style.objectFit = "contain";
              item.style.height = "100%";
              item.style.position = "relative";
              item.style.zIndex = "2";

              // Add blur background
              const blur = document.createElement("div");
              blur.className = "zigry-blur-bg";
              blur.style.cssText = `
                position: absolute; top: 0; left: 0; height: 100%;
                background-image: url('${item.src}');
                background-size: cover; background-position: center;
                filter: blur(20px) brightness(0.7); z-index: 1;
             `;
              wrapper.appendChild(blur);
            } else {
              // Single video styling with blur background
              item.style.height = "100%";
              item.style.width = "100%";
              item.style.display = "flex";
              item.style.alignItems = "center";
              item.style.justifyContent = "center";
              item.style.position = "relative";

              const video = item.querySelector("video");
              if (video) {
                video.style.objectFit = "contain";
                video.style.height = "100%";
                video.style.width = "100%";
                video.style.position = "relative";
                video.style.zIndex = "2";
                video.style.backgroundColor = "transparent";

                // Add blurred background using poster
                const poster = video.getAttribute("poster");
                if (poster) {
                  const blur = document.createElement("div");
                  blur.className = "zigry-blur-bg";
                  blur.style.cssText = `
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-image: url('${poster}');
                    background-size: cover; background-position: center;
                    filter: blur(20px) brightness(0.7); z-index: 1;
                  `;
                  wrapper.appendChild(blur);
                }
              }
            }
          } else {
            // Multiple items styling
            if (isImage) {
              item.classList.add("h-100");
              item.classList.add("overflow-hidden");
              item.classList.add("object-fit-cover");
            } else {
              // Multiple videos styling
              item.style.height = "100%";
              item.style.width = "100%";
              item.style.position = "relative";
              const video = item.querySelector("video");
              if (video) {
                video.classList.add("h-100");
                video.classList.add("w-100");
                video.classList.add("object-fit-contain");
                video.style.position = "relative";
                video.style.zIndex = "2";

                // Set background to black to avoid transparent gaps
                item.style.backgroundColor = "#000";

                // Add blur background for multiple videos
                // Skip blur for the main (big) video in collage (index 0 when count > 2) to avoid "double video" look
                const poster = video.getAttribute("poster");
                const isBigVideo = i === 0 && totalMediaCount > 2;

                if (poster && !isBigVideo) {
                  const blur = document.createElement("div");
                  blur.className = "zigry-blur-bg";
                  blur.style.cssText = `
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-image: url('${poster}');
                    background-size: cover; background-position: center;
                    filter: blur(20px) brightness(0.7); z-index: 1;
                  `;
                  item.appendChild(blur);
                }
              }
            }
          }

          item.parentNode.insertBefore(wrapper, item);
          wrapper.appendChild(item);

          // Hide after 3rd item (for both images and videos)
          if (totalMediaCount > 3 && i > 2) {
            item.classList.add("d-none");
            item.classList.remove("m-1");
          }

          // ✅ Overlay only on 3rd item
          if (i === 2 && totalMediaCount > 3) {
            const overlay = document.createElement("div");
            overlay.className = "zigry-overlay active";
            overlay.textContent = `+${totalMediaCount - 3}`;
            overlay.style.zIndex = "10"; // Higher z-index to be on top
            wrapper.appendChild(overlay);

            // Make overlay click open lightbox
            overlay.addEventListener("click", (e) => {
              e.stopPropagation();
              e.preventDefault();

              if (isImage) {
                item.click(); // Opens existing lightbox for images
              } else {
                // For videos, explicitly open our custom video player lightbox
                const videoEl = item.querySelector("video");
                if (videoEl && typeof openZigryVideoPlayer === "function") {
                  openZigryVideoPlayer(videoEl);
                }
              }
            });
          }
        });
      }
    }

    // If server provided OG in the post payload, render it directly and skip client fetch
    try {
      if (post.og && (post.og.title || post.og.image)) {
        const contentDiv = div.querySelector(".content");
        const urlFromPost =
          post.target_url ||
          (post.content || "").match(/(https?:\/\/[^\s<>"']+)/)?.[0] ||
          "";
        const ogCard = createOgPreviewCard(post.og, urlFromPost);
        if (contentDiv) contentDiv.insertAdjacentElement("afterend", ogCard);
      } else {
        // processPostLinks(); // Removed early call
      }
    } catch (e) {
      // processPostLinks(); // Removed early call
    }

    if (position === "prepend") {
      container.prepend(div.firstElementChild);
    } else {
      container.appendChild(div.firstElementChild);
    }

    // Call processPostLinks AFTER element is in the DOM
    try {
      if (typeof processPostLinks === "function") {
        processPostLinks();
      }
    } catch (e) {}

    // Re-initialize scripts for new content
    document
      .querySelectorAll(".encrypted")
      .forEach(decryptAndSetProtectedMedia);
    initApp();
    zScroll();
  });
}

// Expose renderer on Zigry namespace for server-render integration
if (!window.Zigry) window.Zigry = {};
window.Zigry.renderPosts = renderPosts;
window.Zigry.parseHashtags = parseHashtags;
window.Zigry.decryptElement = decryptAndSetProtectedMedia;

// Allow server to set translations used by renderPosts
window.Zigry.setTranslations = function (t) {
  try {
    if (t && typeof t === "object") translations = t;
  } catch (e) {}
};

// Handle "View all comments" click - expands existing comment section
document.addEventListener("click", function (e) {
  const viewLink = e.target.closest(".view-all-comments");
  if (!viewLink) return;
  e.preventDefault();

  // Trigger the existing comment button action
  const card = viewLink.closest(".card");
  const commentBtn = card?.querySelector('[data-action="comment"]');
  if (commentBtn) commentBtn.click();
});

function createAdCard(ad) {
  // Track impression when the ad is rendered
  trackAd(ad.campaign_id, "impression");

  const objectiveLabel =
    {
      awareness: "Sponsored",
      traffic: "Sponsored",
      leads: "Sponsored • Leads",
      sales: "Sponsored • Shopping",
    }[ad.objective] || "Sponsored";

  const hasCta = ad.cta_text && ad.cta_text !== "None";
  const ctaAction =
    ad.cta_type === "form"
      ? `onclick="zigry.showLeadForm(${ad.campaign_id}, ${JSON.stringify(ad.form_config).replace(/"/g, "&quot;")});"`
      : `href="${ad.target_url || "#"}" target="_blank" onclick="trackAd(${ad.campaign_id}, 'click');"`;

  return `
      <div class="card mb-3 ad-card shadow-sm border-primary border-opacity-25" data-campaign-id="${ad.campaign_id}" style="border-left: 4px solid var(--zigry-primary);">
          <div class="card-header bg-white border-0 py-2 d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center">
                  <div class="rounded-circle bg-light me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                      <i class="zigry z-user zigry-xs"></i>
                  </div>
                  <div>
                      <div class="fw-bold small text-dark">${ad.advertiser_name || "Advertiser"}</div>
                      <div class="text-muted" style="font-size: 0.7rem;">${objectiveLabel}</div>
                  </div>
              </div>
              <div class="dropdown">
                  <i class="zigry z-more-horizontal text-muted cursor-pointer" data-bs-toggle="dropdown"></i>
                  <ul class="dropdown-menu dropdown-menu-end">
                      <li><a class="dropdown-item small" href="javascript:void(0)" onclick="zigry.reportAd(${ad.campaign_id})">Report Ad</a></li>
                      <li><a class="dropdown-item small" href="javascript:void(0)" onclick="this.closest('.ad-card').remove()">Hide Ad</a></li>
                  </ul>
              </div>
          </div>
          <div class="card-body p-0">
              ${ad.thumb ? `<img src="${ad.thumb}" class="w-100 encrypted" style="max-height: 400px; object-fit: cover;">` : ""}
              <div class="p-3">
                  <p class="card-text small mb-3">${ad.content}</p>
                  
                  ${
                    hasCta
                      ? `
                      <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light border">
                          <div class="flex-grow-1 me-2 overflow-hidden">
                              <div class="text-truncate fw-bold small">${ad.target_url ? new URL(ad.target_url).hostname : "zigry.com"}</div>
                              <div class="text-muted small text-truncate">Sponsored</div>
                          </div>
                          <a ${ctaAction} class="btn btn-primary btn-sm px-4 fw-bold shadow-sm">${ad.cta_text}</a>
                      </div>
                  `
                      : `
                      <a href="${ad.target_url || "#"}" onclick="trackAd(${ad.campaign_id}, 'click');" class="btn btn-outline-primary btn-sm w-100">Learn More</a>
                  `
                  }
              </div>
          </div>
      </div>
  `;
}

// Global functions for Ads
zigry.showLeadForm = async function (campaignId, formConfig) {
  // Generate form HTML
  const fields = Array.isArray(formConfig)
    ? formConfig
    : ["full_name", "email"];
  let fieldsHtml = "";

  fields.forEach((field) => {
    const label = field
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    const type =
      field === "email" ? "email" : field === "phone" ? "tel" : "text";
    fieldsHtml += `
            <div class="mb-3">
                <label class="form-label small fw-bold">${label}</label>
                <input type="${type}" name="${field}" class="form-control" required placeholder="Enter your ${label.toLowerCase()}">
            </div>
        `;
  });

  const formHtml = `
        <form id="lead-form-${campaignId}">
            <div class="mb-3 text-center">
                <i class="fas fa-file-alt fa-3x text-primary mb-3"></i>
                <h5>Connect with Business</h5>
                <p class="text-muted small">Please fill in your details below. The business will contact you soon.</p>
            </div>
            <hr>
            ${fieldsHtml}
            <div class="mt-4">
                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold">Submit Information</button>
                <p class="text-center mt-2" style="font-size: 0.7rem; color: #aaa;">By submitting, you agree to share your info with the advertiser.</p>
            </div>
        </form>
    `;

  // Open modal using zigry.alert (which acts as a general modal too)
  const modalContent = document.createElement("div");
  modalContent.innerHTML = formHtml;

  // Use a custom SweetAlert-like approach or just inject into document
  // Since I don't see a complex modal system in zigry.js only zigry.alert
const overlay=document.createElement("div");overlay.style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99999; display:flex; align-items:center; justify-content:center;";const modal=document.createElement("div");modal.className="card p-4 rounded shadow-lg";modal.style="width: 100%; max-width: 400px; position: relative;";modal.innerHTML=`
        <button class="btn-close" style="position:absolute; top:15px; right:15px;"></button>
        ${formHtml}
    `;overlay.appendChild(modal);document.body.appendChild(overlay);const closeBtn=modal.querySelector(".btn-close");closeBtn.onclick=()=>overlay.remove();overlay.onclick=(e)=>{if(e.target===overlay)overlay.remove();};window.form=modal.querySelector("form");form.onsubmit=async(e)=>{e.preventDefault();const formData=new FormData(form);const data=Object.fromEntries(formData.entries());const btn=form.querySelector('button[type="submit"]');btn.disabled=!0;btn.innerHTML='<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';try{const res=await fetch("/api/ads/submit-lead",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":document.querySelector('meta[name="csrf-token"]')?.content||"",},body:JSON.stringify({campaign_id:campaignId,form_data:data,}),});const result=await res.json();if(result.status==="ok"){modal.innerHTML=`
                    <div class="text-center py-4">
                        <i class="fas fa-check-circle fa-4x text-success mb-3"></i>
                        <h4>Thank You!</h4>
                        <p class="text-muted">Your information has been sent to the business.</p>
                        <button class="btn btn-outline-primary mt-3 px-4" onclick="this.closest('div').parentElement.parentElement.parentElement.remove()">Close</button>
                    </div>
                `;trackAd(campaignId,"conversion")}else{zigry.toast("error",result.message||"Failed to submit form");btn.disabled=!1;btn.textContent="Submit Information"}}catch(e){zigry.toast("error","An error occurred");btn.disabled=!1;btn.textContent="Submit Information"}}};zigry.reportAd=function(campaignId){zigry.toast("success","Ad reported. Thank you for your feedback.")};function votePoll(postId,optionIndex,btnEl){const container=btnEl.closest(".poll-feed-container");if(!container)return;const btns=container.querySelectorAll(".poll-vote-btn");btns.forEach((b)=>{b.disabled=!0;b.style.opacity="0.6"});btnEl.style.opacity="1";btnEl.classList.add("poll-voting");fetch(`/api/posts/${postId}/poll/vote`,{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest",},body:JSON.stringify({option_index:optionIndex}),}).then((r)=>r.json()).then((data)=>{if(data.success&&data.poll){const poll=data.poll;const totalVotes=poll.total_votes||0;let optionsHtml="";poll.options.forEach((opt,idx)=>{const votes=(poll.votes&&poll.votes[idx])||0;const pct=totalVotes>0?Math.round((votes/totalVotes)*100):0;const isWinner=totalVotes>0&&votes===Math.max(...(poll.votes||[]));optionsHtml+=`
          <div class="poll-result-option ${isWinner ? "poll-winner" : ""}" style="animation: pollResultIn 0.4s ease ${idx * 0.1}s both">
            <div class="poll-result-bar" style="width: ${pct}%"></div>
            <div class="poll-result-content">
              <span class="poll-result-text">${opt}</span>
              <span class="poll-result-pct">${pct}%</span>
            </div>
          </div>`});container.querySelector(".poll-feed-options").innerHTML=optionsHtml;container.querySelector(".poll-feed-votes").textContent=`${totalVotes} vote${totalVotes !== 1 ? "s" : ""}`;if(typeof zigry!=="undefined"&&zigry.toast)
zigry.toast("Vote recorded!","success");}else{if(typeof zigry!=="undefined"&&zigry.toast)
zigry.toast(data.message||"Failed to vote","error");btns.forEach((b)=>{b.disabled=!1;b.style.opacity="1"});btnEl.classList.remove("poll-voting")}}).catch(()=>{if(typeof zigry!=="undefined"&&zigry.toast)
zigry.toast("Network error","error");btns.forEach((b)=>{b.disabled=!1;b.style.opacity="1"});btnEl.classList.remove("poll-voting")})}
function trackAd(campaignId,type){const data=new Blob([JSON.stringify({campaign_id:campaignId,type:type,}),],{type:"application/json"},);navigator.sendBeacon("/api/ads/track",data)}
async function loadMore(urlobj){if(loading||!hasMore)return;loading=!0;try{await zigry.prefetchUserLocation();const geo=window.zigryGeo??{};const url=urlobj.getAttribute("url")??"/";const res=await fetch(`${url + (currentPage + 1)}`,{headers:{"X-Requested-With":"Zigry-Ajax",location:encodeURIComponent(JSON.stringify(geo)),},});const json=await res.json();translations=json.translations||translations;const items=json.items||json.data||[];const pagination=json.pagination||json;if(items.length>0){currentPage=pagination.currentPage||currentPage+1;hasMore=pagination.currentPage<pagination.lastPage;renderPosts(items,"append");reconnectObserver()}else{hasMore=!1;removeObserver()}}catch(err){console.error("Failed to load more:",err)}finally{loading=!1}}
function setupObserver(){if(observer)observer.disconnect();const paginate=document.querySelector(".paginate");if(!paginate||!hasMore)return;observer=new IntersectionObserver((entries)=>{const entry=entries[0];if(entry.isIntersecting&&!loading){loadMore(paginate)}},{root:null,rootMargin:"0px",threshold:1.0,},);observer.observe(paginate)}
function reconnectObserver(){if(observer)observer.disconnect();requestAnimationFrame(()=>{setupObserver()})}
function removeObserver(){if(observer)observer.disconnect();observer=null}
function getImageMimeType(data,headerContentType,url=""){if(data&&data.length>=12){if(data[0]===0xff&&data[1]===0xd8&&data[2]===0xff){return"image/jpeg"}
if(data[0]===0x89&&data[1]===0x50&&data[2]===0x4e&&data[3]===0x47){return"image/png"}
if(data[0]===0x47&&data[1]===0x49&&data[2]===0x46&&data[3]===0x38){return"image/gif"}
if(data[0]===0x52&&data[1]===0x49&&data[2]===0x46&&data[3]===0x46&&data[8]===0x57&&data[9]===0x45&&data[10]===0x42&&data[11]===0x50){return"image/webp"}}
if(headerContentType&&headerContentType.startsWith("image/")){return headerContentType.split(";")[0].trim()}
const cleanUrl=url.split("?")[0].split("#")[0].toLowerCase();if(cleanUrl.endsWith(".png"))return"image/png";if(cleanUrl.endsWith(".jpg")||cleanUrl.endsWith(".jpeg"))return"image/jpeg";if(cleanUrl.endsWith(".webp"))return"image/webp";if(cleanUrl.endsWith(".gif"))return"image/gif";if(cleanUrl.endsWith(".svg"))return"image/svg+xml";return"image/jpeg"}
async function decryptAndSetProtectedMedia(el){if(el.tagName==="VIDEO"){return}
if(!el||!el.dataset.url||el.dataset.decryptedSrc||el.dataset.decryptionState==="processing")
return;el.dataset.decryptionState="processing";try{const url=el.dataset.url;const res=await fetch(url,{mode:"cors"});if(!res.ok)throw new Error(`Fetch failed: ${res.status}`);const buffer=await res.arrayBuffer();const data=new Uint8Array(buffer);let objectUrl;const mimeLen=(data[0]<<8)+data[1];let isEncrypted=!1;let mime="";if(data.length>50&&mimeLen>0&&mimeLen<100){try{const candidateMime=new TextDecoder().decode(data.slice(2,2+mimeLen),);if(candidateMime.startsWith("image/")||candidateMime.startsWith("video/")||candidateMime.startsWith("application/")){isEncrypted=!0;mime=candidateMime}}catch(e){}}
if(isEncrypted){const offset=2+mimeLen;const key=data.slice(offset,offset+32);const iv=data.slice(offset+32,offset+48);const cipher=data.slice(offset+48);const cryptoKey=await crypto.subtle.importKey("raw",key,{name:"AES-CBC"},!1,["decrypt"],);const decryptedBuffer=await crypto.subtle.decrypt({name:"AES-CBC",iv},cryptoKey,cipher,);const decryptedBytes=new Uint8Array(decryptedBuffer);const finalMime=(mime&&mime.startsWith("image/"))?mime:getImageMimeType(decryptedBytes,res.headers.get("content-type"),url);const blob=new Blob([decryptedBytes],{type:finalMime});objectUrl=URL.createObjectURL(blob)}else{const finalMime=getImageMimeType(data,res.headers.get("content-type"),url);const blob=new Blob([buffer],{type:finalMime});objectUrl=URL.createObjectURL(blob)}
el.dataset.decryptedSrc=objectUrl;el.dataset.full=objectUrl;if(el.classList.contains("skip-wrapper")){el.src=objectUrl;el.dataset.decryptionState="success";return}
if(el.tagName==="IMG"){const wrapper=document.createElement("div");wrapper.className=el.className;wrapper.classList.remove("encrypted");wrapper.dataset.decryptedSrc=objectUrl;wrapper.dataset.full=objectUrl;wrapper.dataset.decryptionState="complete";wrapper.id=el.id;wrapper.style.cssText=`
          display: block;
          position: relative;
          width: 100%;
          overflow: hidden;
      `;const isSingle=el.classList.contains("zigry-single-img");if(isSingle){const blur=document.createElement("div");blur.className="zigry-blur-bg";blur.style.cssText=`
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: url("${objectUrl}");
            background-size: cover;
            background-position: center;
            filter: blur(20px) brightness(0.7);
            z-index: 1; 
         `;wrapper.appendChild(blur)}
const mainImg=document.createElement("div");const bgSize=isSingle?"contain":"cover";mainImg.style.cssText=`
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url("${objectUrl}");
          background-size: ${bgSize};
          background-repeat: no-repeat;
          background-position: center;
          z-index: 2;
      `;wrapper.appendChild(mainImg);const dummy=document.createElement("img");dummy.src=objectUrl;dummy.className="zigry-dummy-img";dummy.style.cssText="display: block; width: 100%; height: auto; max-height: 75vh; object-fit: contain; opacity: 0; position: relative; z-index: 3;";dummy.dataset.full=objectUrl;dummy.dataset.decryptedSrc=objectUrl;wrapper.appendChild(dummy);el.replaceWith(wrapper);bindZigryLightbox(wrapper.parentElement||document)}
el.dataset.decryptionState="complete"}catch(err){console.warn("[decrypt] Fallback to direct URL:",el.dataset?.url,err);const fallbackUrl=el.dataset?.url||el.src;if(fallbackUrl){el.dataset.decryptedSrc=fallbackUrl;el.dataset.full=fallbackUrl;el.dataset.decryptionState="fallback";if(el.tagName==="IMG"&&el.src!==fallbackUrl){el.src=fallbackUrl}}else{el.dataset.decryptionState="failed"}}}["contextmenu","copy"].forEach((eventName)=>{document.addEventListener(eventName,(e)=>{if(e.target.closest(".encrypted, #zigryMedia, .zigry-lightbox, .lock"))
e.preventDefault();})});document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll(".encrypted").forEach(decryptAndSetProtectedMedia);initApp();const loader=document.getElementById("zigry-loader");if(loader){loader.classList.add("d-none")}
zScroll();initEmoji();reverse_counter()});async function decryptAndSetMediaLb(el){if(!el||!el.dataset.url||el.dataset.decryptedSrc)return;try{const res=await fetch(el.dataset.url,{mode:"cors"});const buffer=await res.arrayBuffer();const data=new Uint8Array(buffer);let objectUrl;const mimeLen=(data[0]<<8)+data[1];let isEncrypted=!1;let mime="";if(data.length>50&&mimeLen>0&&mimeLen<100){try{const candidateMime=new TextDecoder().decode(data.slice(2,2+mimeLen),);if(candidateMime.startsWith("image/")||candidateMime.startsWith("video/")||candidateMime.startsWith("application/")){isEncrypted=!0;mime=candidateMime}}catch(e){}}
if(isEncrypted){const offset=2+mimeLen;const key=data.slice(offset,offset+32);const iv=data.slice(offset+32,offset+48);const cipher=data.slice(offset+48);const cryptoKey=await crypto.subtle.importKey("raw",key,{name:"AES-CBC"},!1,["decrypt"],);const decryptedBuffer=await crypto.subtle.decrypt({name:"AES-CBC",iv},cryptoKey,cipher,);const decryptedBytes=new Uint8Array(decryptedBuffer);const finalMime=(mime&&mime.startsWith("image/"))?mime:getImageMimeType(decryptedBytes,res.headers.get("content-type"),el.dataset.url);const blob=new Blob([decryptedBytes],{type:finalMime});objectUrl=URL.createObjectURL(blob)}else{const finalMime=getImageMimeType(data,res.headers.get("content-type"),el.dataset.url);const blob=new Blob([buffer],{type:finalMime});objectUrl=URL.createObjectURL(blob)}
el.dataset.decryptedSrc=objectUrl;el.dataset.url=objectUrl;el.dataset.full=objectUrl}catch(err){console.error("[decryptAndSetMediaLb] Failed to decrypt:",err)}}
document.addEventListener("DOMContentLoaded",zvalid);function zvalid(){const inputs=document.querySelectorAll("input, textarea, select");const processedGroups=new Set();inputs.forEach((input)=>{if(input.type==="radio"){return}
if(input.type==="checkbox"&&!input.hasAttribute("required")){return}
if(input.hasAttribute("required")){let label=null;if(input.id){label=document.querySelector(`label[for="${input.id}"]`)}
if(!label){label=input.previousElementSibling;if(!label||label.tagName!=="LABEL"){label=input.closest("label")}
if(!label&&input.parentElement){const prev=input.parentElement.previousElementSibling;if(prev&&prev.tagName==="LABEL"){label=prev}
const parentLabel=input.parentElement.querySelector("label");if(parentLabel&&!parentLabel.contains(input)){label=parentLabel}}}
if(label&&!label.querySelector(".required-asterisk")){addAsterisk(label)}}});function addAsterisk(label){const asterisk=document.createElement("span");asterisk.className="required-asterisk";asterisk.textContent=" *";asterisk.style.color="inherit";asterisk.style.opacity="0.8";label.appendChild(asterisk)}
inputs.forEach((input)=>{if(input.type==="radio"||input.type==="checkbox"){const radioInputs=document.querySelectorAll(`[name="${input.name}"]`);radioInputs.forEach((radioInput)=>{radioInput.addEventListener("invalid",(event)=>{event.preventDefault();const errorMessage={};errorMessage[input.name]=getErrorMessage(radioInput);const errorMessageElement=radioInputs[0].parentNode.querySelector(".notify-error");if(errorMessageElement){errorMessageElement.querySelector(".notify-text").innerHTML=errorMessage[input.name];errorMessageElement.style.display="block"}else{zigry.notify(errorMessage,"danger");const newErrorMessageElement=radioInputs[0].parentNode.querySelector(`.notify-wrapper`);if(newErrorMessageElement){newErrorMessageElement.classList.add("notify-error")}}})});radioInputs.forEach((radioInput)=>{radioInput.addEventListener("change",(event)=>{const errorMessageElement=radioInputs[0].parentNode.querySelector(".notify-error");if(errorMessageElement&&document.querySelectorAll(`[name="${input.name}"]:checked`).length>0){errorMessageElement.style.display="none"}})})}else{input.addEventListener("invalid",(event)=>{event.preventDefault();const errorMessage={};errorMessage[input.name]=getErrorMessage(input);const errorMessageElement=input.parentNode.querySelector(".notify-error");if(errorMessageElement){errorMessageElement.querySelector(".notify-text").innerHTML=errorMessage[input.name];errorMessageElement.style.display="block"}else{zigry.notify(errorMessage,"danger");const newErrorMessageElement=input.parentNode.querySelector(`.notify-wrapper`);if(newErrorMessageElement){newErrorMessageElement.classList.add("notify-error")}}});input.addEventListener("input",(event)=>{const errorMessageElement=input.parentNode.querySelector(".notify-error");if(errorMessageElement){if(input.validity.valid){errorMessageElement.style.display="none"}else{errorMessageElement.querySelector(".notify-text").innerHTML=getErrorMessage(input);errorMessageElement.style.display="block"}}
if(input.type==="tel"){let value=event.target.value;value=value.replace(/\D/g,"");if(value.startsWith("0")&&value.length>1){value=value.replace(/^0+/,"")}
event.target.value=value}
if(input.type==="otp"){let value=event.target.value;value=value.replace(/\D/g,"");event.target.value=value}})}});function getErrorMessage(input){const v=input.validity;const m=window.validation;if((input.type==="radio"||input.type==="checkbox")&&v.valueMissing){return m.valueMissingOptions}
for(let key in v){if(v[key]&&m[key])return m[key]}
return input.validationMessage}}
class ZigryBS{constructor(el){this.el=el;if(!this.el.hasAttribute("role")){this.el.setAttribute("role","dialog")}
this.el.addEventListener("click",(e)=>{const isStatic=this.el.getAttribute("data-bs-backdrop")==="static";if(e.target===this.el){if(e.target===this.el){if(isStatic){this.animateStatic()}else{this.hide()}}}else if(e.target.closest('[data-bs-dismiss="modal"]')){this.hide()}});document.addEventListener("keydown",(e)=>{if(e.key==="Escape"&&this.el.classList.contains("show")){const isStatic=this.el.getAttribute("data-bs-backdrop")==="static";if(!isStatic)this.hide();}})}
animateStatic(){const animations=["modal-deny-wiggle","modal-deny-pulse","modal-static","modal-deny-bounce",];const random=animations[Math.floor(Math.random()*animations.length)];this.el.classList.add(random);setTimeout(()=>{this.el.classList.remove(random)},400)}
show(){replaceZigryIcons();this.el.removeAttribute("aria-hidden");this.el.setAttribute("aria-modal","true");this.el.style.display="block";requestAnimationFrame(()=>this.el.classList.add("show"));this.addBackdrop();document.body.classList.add("modal-open")}
hide(){if(document.activeElement&&this.el.contains(document.activeElement)){document.activeElement.blur()}
this.el.classList.remove("show");setTimeout(()=>{this.el.style.display="none";this.el.setAttribute("aria-hidden","true");this.el.removeAttribute("aria-modal")},200);this.removeBackdrop();document.body.classList.remove("modal-open")}
addBackdrop(){if(!document.querySelector(".modal-backdrop")){const backdrop=document.createElement("div");backdrop.className="modal-backdrop fade show";document.body.appendChild(backdrop)}}
removeBackdrop(){const backdrop=document.querySelector(".modal-backdrop");if(backdrop)backdrop.remove();}
static initAll(root=document){root.querySelectorAll('[data-bs-toggle="modal"]').forEach((btn)=>{if(btn._zigryInit)return;const targetSelector=btn.getAttribute("data-bs-target");const modalEl=document.querySelector(targetSelector);if(!modalEl)return;if(!modalEl._ZigryBS){modalEl._ZigryBS=new ZigryBS(modalEl)}
btn.addEventListener("click",(e)=>{e.preventDefault();modalEl._ZigryBS.show()});btn._zigryInit=!0});if(!this._dropdownDelegatorInited){document.addEventListener("click",(e)=>{const toggle=e.target.closest('[data-bs-toggle="dropdown"]');if(toggle){e.preventDefault();const parent=toggle.closest(".dropdown, .dropdown-center");const menu=parent?.querySelector(".dropdown-menu");if(!menu)return;document.querySelectorAll(".dropdown-menu.show").forEach((m)=>{if(m!==menu)m.classList.remove("show");});menu.classList.toggle("show");return}
const isChildOfMenu=e.target.closest(".dropdown-menu");const isItem=e.target.closest(".dropdown-item");if(!isChildOfMenu||isItem){document.querySelectorAll(".dropdown-menu.show").forEach((m)=>{m.classList.remove("show")})}});this._dropdownDelegatorInited=!0}}}
class ZigrySparkScroll{constructor(s,t,o={}){this.s=s;this.t=t;this.c=o.colors||["#ff0040","#ff9000","#ffff00","#00ff90","#00ffd0","#9000ff","#ff00d0","#ff1493","#00ced1","#ffa500",];this.d=[];this.ls=s.scrollTop;this.h=!1;this.wrapper=this.t.parentElement||document.body;this._computeOffsets();this.i()}
_computeOffsets(){const sRect=this.s.getBoundingClientRect();const wRect=this.wrapper.getBoundingClientRect();this.offsetTopWithinWrapper=Math.max(0,sRect.top-wRect.top);this.visibleHeight=this.s.clientHeight;this.scrollHeight=this.s.scrollHeight}
i(){this.u();window.addEventListener("resize",()=>{this._computeOffsets();this.u()});this.s.addEventListener("scroll",()=>this.u());this.drag=!1;this.t.addEventListener("mousedown",(e)=>{e.preventDefault();this.drag=!0;this.sy=e.clientY;this.st=parseFloat(this.t.style.top)||0;document.documentElement.classList.add("no-select")});document.addEventListener("mousemove",(e)=>{if(!this.drag)return;this._computeOffsets();const ch=this.visibleHeight;const sh=this.scrollHeight;const th=this.t.offsetHeight;const track=ch-th;const dy=e.clientY-this.sy;const newTop=Math.max(0,Math.min(track,this.st+dy));const newScrollTop=(newTop/track)*(sh-ch);this.s.scrollTop=newScrollTop});document.addEventListener("mouseup",()=>{this.drag=!1;document.documentElement.classList.remove("no-select")});this.t.addEventListener("mouseenter",()=>(this.h=!0));this.t.addEventListener("mouseleave",()=>(this.h=!1));this.t.addEventListener("mousedown",()=>{for(let i=0;i<4;i++)this.cS();});this.ctx=this.t.getContext("2d");this.a()}
u(){this._computeOffsets();const ch=this.visibleHeight;const sh=this.s.scrollHeight;if(sh<=ch){this.t.style.display="none";return}
this.t.style.display="block";const th=Math.max(Math.floor((ch/sh)*ch),20);const track=ch-th;const scrollRatio=sh-ch<=0?0:this.s.scrollTop/(sh-ch);const topPos=this.offsetTopWithinWrapper+scrollRatio*track;this.t.style.height=`${th}px`;this.t.style.top=`${Math.round(topPos)}px`}
cS(){const th=this.t.offsetHeight,tw=this.t.offsetWidth;const a=Math.random()*2*Math.PI;const s=0.5+Math.random()*1.2;this.d.push({x:Math.random()*tw,y:Math.random()*th,r:3+Math.random()*4,mr:1+Math.random()*1.5,a:1,c:this.c[Math.floor(Math.random()*this.c.length)],vx:Math.cos(a)*s,vy:Math.sin(a)*s,})}
sS(speed){if(speed>1){const count=Math.max(1,Math.floor(this.t.offsetHeight/40));for(let i=0;i<count;i++)if(Math.random()<0.5)this.cS();}}
a(){const th=this.t.offsetHeight,tw=this.t.offsetWidth;const dpr=window.devicePixelRatio||1;this.t.width=Math.max(1,Math.floor(tw*dpr));this.t.height=Math.max(1,Math.floor(th*dpr));this.t.style.width=`${tw}px`;this.t.style.height=`${th}px`;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.clearRect(0,0,tw,th);const spd=Math.min(50,Math.abs(this.s.scrollTop-this.ls));this.ls=this.s.scrollTop;this.sS(spd);this.ctx.fillStyle=this.h?"rgba(127,34,241,.3)":"rgba(127,34,241,.15)";this.ctx.fillRect(0,0,tw,th);this.d.forEach((d)=>{const g=this.ctx.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r);g.addColorStop(0,d.c);g.addColorStop(1,"rgba(0,0,0,0)");this.ctx.fillStyle=g;this.ctx.globalAlpha=d.a;this.ctx.fillRect(0,0,tw,th);d.x+=d.vx;d.y+=d.vy;d.r+=0.05+d.mr*0.05;d.a-=0.01});this.d=this.d.filter((d)=>d.a>0);this.ctx.globalAlpha=1;requestAnimationFrame(()=>this.a())}}
let zScrollObserver;function zScroll(){if(!zigry.applyScroll){if(!document.getElementById("zigry-scroll-style")){const st=document.createElement("style");st.id="zigry-scroll-style";st.textContent=`
        .zigry-hide-scrollbar::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
        .zigry-hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `;document.head.appendChild(st)}
zigry.applyScroll=(el)=>{if(el.dataset.zigryScrollApplied){if(el._zscroll)el._zscroll.u();return}
if(el.scrollHeight<=el.clientHeight)return;el.classList.add("zigry-hide-scrollbar");el.style.overflowY="auto";let wrapper=el.parentElement||document.body;if(getComputedStyle(wrapper).position==="static"){wrapper.style.position="relative"}
let thumb=wrapper.querySelector(":scope > .zigry-thumb");if(!thumb){thumb=document.createElement("canvas");thumb.className="zigry-thumb";Object.assign(thumb.style,{position:"absolute",right:"2px",width:"8px",borderRadius:"4px",pointerEvents:"auto",zIndex:"9999",background:"transparent",top:"0",});wrapper.appendChild(thumb)}
if(!el._zscroll){el._zscroll=new ZigrySparkScroll(el,thumb)}
el.dataset.zigryScrollApplied="true"}}
const applyScroll=zigry.applyScroll;if(!zScrollObserver){zScrollObserver=new IntersectionObserver((entries)=>{entries.forEach((entry)=>{const el=entry.target;if(!entry.isIntersecting||el.offsetParent===null){return}
const style=getComputedStyle(el);if((style.overflowY==="auto"||style.overflowY==="scroll")&&el.scrollHeight>el.clientHeight&&!el.dataset.zigryScrollApplied){applyScroll(el)}})},{threshold:0.1},)}else{zScrollObserver.disconnect()}
const selectors=[".z-scroll",".zigry-scroll",".scrollable",'div[style*="overflow"]','ul[style*="overflow"]',"main",".modal-body",];document.querySelectorAll(selectors.join(",")).forEach((el)=>{if(el.classList.contains("z-scroll")||el.classList.contains("zigry-scroll")){zScrollObserver.observe(el);applyScroll(el)}else{const style=getComputedStyle(el);if(style.overflowY==="auto"||style.overflowY==="scroll"){zScrollObserver.observe(el)}}})}
document.addEventListener("click",function(e){if(e.target.closest(".z-scroll")){zScroll()}});function replaceZigryIcons(root=document){root.querySelectorAll("span.zigry[class*='z-'], i.zigry[class*='z-'], div.zigry[class*='z-']",).forEach((el)=>{const match=el.className.match(/z-([\w-]+)/);if(!match)return;const iconName=match[0];const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");const use=document.createElementNS("http://www.w3.org/2000/svg","use");svg.setAttribute("class",el.className);if(el.hasAttribute("aria-label")){svg.setAttribute("role","img");svg.setAttribute("aria-label",el.getAttribute("aria-label"))}else if(!el.hasAttribute("aria-hidden")){svg.setAttribute("aria-hidden","true")}
use.setAttribute("href",`#${iconName}`);use.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",`#${iconName}`,);svg.appendChild(use);el.replaceWith(svg)})}
function initApp(root=document){replaceZigryIcons(root);bindZigryLightbox();ZigryBS.initAll();initVideos()}
const _zigry_inited_videos=new WeakSet();function initVideos(){const videos=document.querySelectorAll("video.zigry-video");videos.forEach((video)=>{if(_zigry_inited_videos.has(video))return;_zigry_inited_videos.add(video);const setQuality=()=>{try{const w=video.videoWidth||0;const h=video.videoHeight||0;if(w&&h){video.setAttribute("data-video-quality",`${w}x${h}`)}}catch(e){}};if(video.readyState>=1){setQuality()}else{video.addEventListener("loadedmetadata",setQuality,{once:!0})}
video.addEventListener("contextmenu",(ev)=>{ev.preventDefault();removeZigryVideoMenu();const menu=document.createElement("div");menu.className="zigry-video-menu";menu.style.position="fixed";menu.style.zIndex=100005;menu.setAttribute("role","menu");menu.tabIndex=0;menu.addEventListener("contextmenu",(ev)=>ev.preventDefault());menu.addEventListener("click",(ev)=>ev.stopPropagation());const M_WIDTH=260;const M_HEIGHT=120;let left=ev.clientX;let top=ev.clientY;if(left+M_WIDTH>window.innerWidth)
left=Math.max(8,window.innerWidth-M_WIDTH-8);if(top+M_HEIGHT>window.innerHeight)
top=Math.max(8,window.innerHeight-M_HEIGHT-8);menu.style.left=left+"px";menu.style.top=top+"px";menu.style.background="#fff";menu.style.border="1px solid rgba(0,0,0,0.08)";menu.style.boxShadow="0 6px 24px rgba(0,0,0,0.12)";menu.style.padding="6px 0";menu.style.borderRadius="6px";menu.style.minWidth="220px";menu.style.fontSize="13px";menu.style.color="#222";const makeItem=(label,onClick)=>{const it=document.createElement("div");it.textContent=label;it.style.padding="8px 12px";it.style.cursor="pointer";it.addEventListener("click",(e)=>{e.stopPropagation();try{onClick()}finally{removeZigryVideoMenu()}});it.addEventListener("mouseenter",()=>(it.style.background="#f6f6f6"),);it.addEventListener("mouseleave",()=>(it.style.background="transparent"),);return it};let postId=null;const card=video.closest("[data-post-id]");if(card)postId=card.getAttribute("data-post-id");const origin=window.location.origin;const baseLink=postId?`${origin}/post/${postId}`:window.location.href.split("#")[0];const copyText=async(text)=>{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text)}else{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()}};menu.appendChild(makeItem("Copy video link (current time)",()=>{const secs=Math.floor(video.currentTime||0);const url=`${baseLink}#t=${secs}`;copyText(url)}),);menu.appendChild(makeItem("Copy video link",()=>{copyText(baseLink)}),);document.body.appendChild(menu);const removeOnDocClick=()=>removeZigryVideoMenu();const onKey=(e)=>{if(e.key==="Escape")removeZigryVideoMenu();};const onScroll=()=>removeZigryVideoMenu();const onResize=()=>removeZigryVideoMenu();setTimeout(()=>{document.addEventListener("click",removeOnDocClick,{once:!0});document.addEventListener("keydown",onKey);window.addEventListener("scroll",onScroll,{once:!0,passive:!0,});window.addEventListener("resize",onResize,{once:!0})},0)});try{const wrapper=video.closest(".zigry-video-wrapper");if(wrapper){wrapper.addEventListener("contextmenu",(ev)=>{ev.preventDefault();ev.stopPropagation();const synthetic=new MouseEvent("contextmenu",{bubbles:!0,cancelable:!0,clientX:ev.clientX,clientY:ev.clientY,});video.dispatchEvent(synthetic)});const overlay=wrapper.querySelector(".zigry-play-overlay");if(overlay){overlay.addEventListener("contextmenu",(ev)=>{ev.preventDefault();ev.stopPropagation();const synthetic=new MouseEvent("contextmenu",{bubbles:!0,cancelable:!0,clientX:ev.clientX,clientY:ev.clientY,});video.dispatchEvent(synthetic)})}}}catch(e){}})}
function removeZigryVideoMenu(){document.querySelectorAll(".zigry-video-menu").forEach((m)=>m.remove())}
window.bootstrap=window.bootstrap||{};bootstrap.Modal=class{constructor(el){if(!el)throw new Error("ZigryBS: modal element not found");if(!el._ZigryBS)el._ZigryBS=new ZigryBS(el);this.instance=el._ZigryBS}
show(){this.instance.show()}
hide(){this.instance.hide()}
static getInstance(el){return el?._ZigryBS||new ZigryBS(el)}};(function(){if(typeof window==="undefined")return;console.log("%c⚠️ SECURITY WARNING!","color:#fff;background:#dc3545;padding:6px;font-size:16px;",);console.log("%cNever paste code here. It may compromise your account!","color:#dc3545;font-size:14px;",);const devtools={isOpen:!1,orientation:undefined};const threshold=170;function checkDevTools(){const widthThreshold=window.outerWidth-window.innerWidth>threshold;const heightThreshold=window.outerHeight-window.innerHeight>threshold;const orientation=widthThreshold?"vertical":"horizontal";const detected=!(heightThreshold&&widthThreshold)&&((window.Firebug&&window.Firebug.chrome&&window.Firebug.chrome.isInitialized)||widthThreshold||heightThreshold);if(detected){devtools.isOpen=!0;devtools.orientation=orientation}else{devtools.isOpen=!1;devtools.orientation=undefined}
return devtools.isOpen}
document.addEventListener("fullscreenchange",()=>{try{const fs=document.fullscreenElement||document.webkitFullscreenElement;if(fs&&fs.tagName&&fs.tagName.toLowerCase()==="video"){fs.controls=!0}else{document.querySelectorAll("video.zigry-video").forEach((v)=>{try{v.controls=!1}catch(e){}})}}catch(e){}});let opened=!1;setInterval(()=>{const isOpen=checkDevTools();if(isOpen&&!opened){opened=!0;if(typeof zigry!=="undefined"&&typeof zigry.alert==="function"){zigry.alert({title:"⚠️ Security Warning",message:"Developer tools are open. For your safety, do not paste any scripts in the console.",type:"warning",buttons:[{label:"I Understand",class:"btn btn-danger",value:!0},],multiple:!1,duration:null,})}}else if(!isOpen&&opened){opened=!1;const zone=document.getElementById("toastZone");if(zone){zone.querySelectorAll(".zigry-toast").forEach((toast)=>{const buttons=toast.querySelectorAll("button");if(buttons.length)buttons[0].click();else{toast.remove();zone.style.display="none";window.alertOpen=!1;if(window.queue)window.queue.shift?.();}})}}},500)})();function initEmoji(){const btn=document.getElementById("emoji-btn");if(!btn)return;const categories={Smileys:"😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 😶 😐 😑 🤔 🙄 🤥 🤭 🤫 🤗 🤔 🫠 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠",Animals:"🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🐣 🐺 🐗 🦆 🦅 🦉 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🕷️ 🦂 🐢 🐍 🦎 🐙 🐠 🐟 🐬 🐳 🐋 🦈 🦀 🐊",Food:"🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🥔 🧄 🧅 🥐 🍞 🥖 🥨 🥯 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🌮 🌯 🥗 🥙 🍝 🍣 🍱 🍤 🍙 🍚 🍛 🍜 🍲 🫕 🥘 🍥 🧁 🍰 🍩 🍪 🍫 🍿 🍩 🍦 🍨 🍧 🧃 ☕ 🍵 🧋 🥤 🥛 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉",Activities:"⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🪀 🏓 🏸 🥅 🏒 🏑 🥍 🏏 ⛳ 🏹 🎣 🤿 🥊 🥋 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🚴 🚵 🏇 🏄 🏊 🤽 🤾 🧗 🏋️ 🤸 🤹 🧘 🎯 🎳 🎮 🎰 🎲 🧩 🪅 🎭 🎨 🎤 🎧 🎸 🎹 🥁 🎻 🎬 🎥 📸 📹 🎞️ 📺 📻 📼",Objects:"⌚ 📱 💻 🖥️ 🖨️ 🖱️ 🖲️ 💽 💾 💿 📀 📸 📷 📹 🎥 📞 ☎️ 📟 📠 📺 📻 🧭 ⏰ ⏱️ ⏲️ 🕰️ 🕹️ 🧮 💡 🔦 🕯️ 🪔 🧯 🔋 🪫 🔌 💸 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒️ 🪓 🪚 🔩 ⚙️ 🧱 🧲 🔫 🪄 🧽 🧴 💊 💉 🩺 🩹 🧬 🧫 🧪 🌡️",Symbols:"❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💔 ❤️‍🔥 ❤️‍🩹 💘 💝 💖 💗 💓 💞 💕 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🔀 🔁 🔂 ⏩ ⏪ ⏫ ⏬ 🔼 🔽 ⏹️ ⏺️ ⏏️ 🎦 🔅 🔆 📶 📳 📴",};const picker=document.getElementById("emoji-picker");const categoryBar=document.getElementById("emoji-categories");const grid=document.getElementById("emoji-grid");const input=document.getElementById("richPostEditor");let pickerVisible=!1;let activeCategory="Smileys";for(const[category,emojis]of Object.entries(categories)){const catBtn=document.createElement("button");catBtn.textContent=emojis.split(" ")[0];catBtn.title=category;catBtn.classList.add("btn");catBtn.classList.add("btn-default");catBtn.classList.add("z-scroll");if(category===activeCategory)catBtn.classList.add("active");catBtn.addEventListener("click",(e)=>{e.stopPropagation();document.querySelectorAll(".emoji-categories button").forEach((b)=>b.classList.remove("active"));catBtn.classList.add("active");activeCategory=category;renderEmojis(categories[category])});categoryBar.appendChild(catBtn)}
function renderEmojis(emojiStr){grid.innerHTML="";emojiStr.split(" ").forEach((e)=>{if(!e.trim())return;const span=document.createElement("span");span.textContent=e;span.addEventListener("click",(ev)=>{ev.stopPropagation();input.innerText+=e});grid.appendChild(span)})}
renderEmojis(categories[activeCategory]);btn.addEventListener("click",(e)=>{e.stopPropagation();pickerVisible=!pickerVisible;picker.classList.toggle("d-none",!pickerVisible)});picker.addEventListener("click",(e)=>e.stopPropagation());if(!window.emojiGlobalListenerAttached){document.addEventListener("click",()=>{const picker=document.getElementById("emoji-picker");if(picker){picker.classList.add("d-none");pickerVisible=!1}});window.emojiGlobalListenerAttached=!0}}
function processPostLinks(){const postContents=document.querySelectorAll('.content:not([data-processed="true"])',);const urlRegex=/(https?:\/\/[^\s<>"']+)/g;postContents.forEach((contentDiv)=>{contentDiv.dataset.processed="true";const nextElement=contentDiv.nextElementSibling;if(nextElement&&nextElement.classList.contains("og-preview-card")){return}
const contentText=contentDiv.textContent;const urls=contentText.match(urlRegex);if(urls&&urls.length>0){const url=urls[0];const placeholder=createOgPreviewCard(null,url);contentDiv.insertAdjacentElement("afterend",placeholder);fetch("/fetch-og",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":document.querySelector('meta[name="csrf-token"]').getAttribute("content"),},body:JSON.stringify({url:url}),}).then((response)=>response.json()).then((result)=>{if(result.success&&result.data&&(result.data.title||result.data.image)){const newCard=createOgPreviewCard(result.data,url);placeholder.replaceWith(newCard)}else{placeholder.remove()}}).catch((error)=>{placeholder.remove()})}})}
function createOgPreviewCard(data,url){const card=document.createElement("a");card.href=`/url?link=${encodeURIComponent(url)}`;card.target="_blank";card.rel="nofollow noopener noreferrer";card.className="og-preview-card  text-decoration-none my-0 border-0 mt-2";if(!data){card.innerHTML=`
            <div class="card-body">
                <div class="placeholder-glow">
                    <span class="placeholder col-7"></span>
                    <span class="placeholder col-4"></span>
                    <span class="placeholder col-4"></span>
                    <span class="placeholder col-6"></span>
                </div>
            </div>`;return card}
let imageCard="";const isInternal=url.includes(window.location.hostname);if(data.image){imageCard=`
      <div
        class="img-fluid zigry-single-img mb-2 zigry-img-wrap mx-auto"
        style="
          display:flex;
          position:relative;
          width:100%;
          min-height:450px;
          max-height:450px;
          height:100%;
          overflow:hidden;
        "
      >

        <!-- BLUR BACKGROUND (cover) -->
        <div
          class="zigry-blur-bg"
          style="
            position:absolute;
            inset:0;
            background-image:url('${data.image}');
            background-size:cover;
            background-position:center;
            filter:blur(20px) brightness(0.7);
            z-index:1;
          "
        ></div>

        <!-- MAIN IMAGE WALL (contain, no stretch) -->
        <div
          style="
            position:absolute;
            inset:0;
            background-image:url('${data.image}');
            background-size:contain;
            background-repeat:no-repeat;
            background-position:center;
            z-index:2;
          "
        ></div>

        <!-- REAL IMAGE (invisible, for load/click) -->
        <img
          src="${data.image}"
          style="
            width:100%;
            height:100%;
            opacity:0;
            position:absolute;
            top:0;
            left:0;
            z-index:3;
            cursor:pointer;
          "
          alt="${data.title ?? ""}"
          onerror="this.style.display='none'"
        />

      </div>
    `}
const title=data.title?`<div class="og-title fw-bold text-truncate">${data.title}</div>`:`<div class="og-title fw-bold text-truncate">${url}</div>`;const description=data.description?`<div class="og-description small text-muted text-wrap">${data.description}</div>`:"";const siteName=new URL(url).hostname;const faviconUrl=data.favicon;card.innerHTML=`
<div class="card-body overflow-hidden" style="max-width: 100%;">
  <div class="og-content-wrapper">
    ${imageCard}
    <div class="og-text-content">
      <div class="mb-2 text-truncate small">${title}</div>
      <div class="text-wrap smaller">${description}</div>
    </div>
  </div>
  <div class="og-footer d-flex align-items-center gap-1 overflow-hidden justify-content-end mt-2 small" style="min-width: 0;">
    <img src="${faviconUrl}" class="og-favicon" alt="Favicon" width="12" height="12" onerror="this.style.display='none'"/>
    <small class="text-muted text-truncate">${siteName}</small>
  </div>
</div>
    `;return card}
let reverseCounterInterval=null;function reverse_counter(){if(reverseCounterInterval){clearInterval(reverseCounterInterval);reverseCounterInterval=null}
var el=document.getElementById("reverse_counter");if(el){function incrementSeconds(){if(el.innerText>0){el.innerText=el.innerText-1;if(el.innerText==0){zigry.navigate(location.pathname)}}}
reverseCounterInterval=setInterval(incrementSeconds,1000)}}
document.addEventListener("DOMContentLoaded",()=>{const COOKIE_CONSENT_KEY="zigry_cookie_consent";const banner=document.getElementById("cookie-consent-banner");if(!banner)return;const acceptBtn=document.getElementById("cookie-consent-accept");const declineBtn=document.getElementById("cookie-consent-decline");function updateConsent(granted){window.dataLayer=window.dataLayer||[];dataLayer.push({event:"consent_update",analytics_storage:granted?"granted":"denied",ad_storage:granted?"granted":"denied",ad_user_data:granted?"granted":"denied",ad_personalization:granted?"granted":"denied",})}
function setConsentCookie(value){const expiry=new Date();expiry.setFullYear(expiry.getFullYear()+1);document.cookie=`${COOKIE_CONSENT_KEY}=${value}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;banner.classList.add("d-none")}
const existing=document.cookie.split("; ").find((c)=>c.startsWith(COOKIE_CONSENT_KEY+"="));if(existing){const val=existing.split("=")[1];updateConsent(val==="granted")}else{banner.classList.remove("d-none")}
acceptBtn?.addEventListener("click",()=>{updateConsent(!0);setConsentCookie("granted")});declineBtn?.addEventListener("click",()=>{updateConsent(!1);setConsentCookie("denied")})});function initTabs(){document.querySelectorAll('[data-bs-toggle="tab"]').forEach((tab)=>{tab.addEventListener("click",(e)=>{e.preventDefault();const targetSelector=tab.getAttribute("data-bs-target");const targetPane=document.querySelector(targetSelector);if(!targetPane)return;const container=tab.closest(".nav-tabs");if(container){container.querySelectorAll(".nav-link").forEach((t)=>t.classList.remove("active"))}
const contentContainer=targetPane.closest(".tab-content");if(contentContainer){contentContainer.querySelectorAll(".tab-pane").forEach((p)=>{p.classList.remove("show","active")})}
tab.classList.add("active");targetPane.classList.add("show","active")})})}
document.addEventListener("DOMContentLoaded",initTabs);document.addEventListener("input",(e)=>{if(e.target.id!=="richPostEditor")return;const url=(e.target.innerText.match(/https?:\/\/[^\s]+/)||[])[0];const preview=document.getElementById("linkPreview");if(!preview)return;if(!url){preview.classList.add("d-none");preview.innerHTML="";delete preview.dataset.url;return}
if(preview.dataset.url===url)return;preview.dataset.url=url;const csrf=document.querySelector('meta[name="csrf-token"]')?.content;fetch("/fetch-og",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":csrf},body:JSON.stringify({url}),}).then((r)=>r.json()).then((res)=>{if(res.success&&res.data&&typeof createOgPreviewCard==="function"){const card=createOgPreviewCard(res.data,url);preview.innerHTML="";preview.appendChild(card);preview.classList.remove("d-none")}})});document.addEventListener("paste",(e)=>{if(e.target.id!=="richPostEditor")return;const files=Array.from(e.clipboardData.files).filter((f)=>f.type.startsWith("image/")||f.type.startsWith("video/"),);if(files.length>0){e.preventDefault();if(typeof handleMediaPreviewChange==="function"){handleMediaPreviewChange.call({files})}}else{const text=e.clipboardData.getData("text/plain");if(text){e.preventDefault();document.execCommand("insertText",!1,text)}}});window.switchAccountType=function(type,urlConvert,urlRevert){if(type==="business"){window.location.href=urlConvert}else{if(typeof zigry==="undefined"||!zigry.box||!zigry.box.confirm){if(confirm("Switch to Personal Account? You will lose access to professional tools like insights and ads.",)){doRevert(urlRevert)}
return}
zigry.box.confirm({title:"Switch to Personal Account?",html:"You will lose access to professional tools like insights and ads.",okText:"Switch Back",cancelText:"Cancel",},function(){doRevert(urlRevert)},)}
function doRevert(url){const csrfMeta=document.querySelector('meta[name="csrf-token"]');const token=csrfMeta?csrfMeta.getAttribute("content"):"";fetch(url,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":token,},}).then((res)=>res.json()).then((data)=>{if(data.status==="ok"){zigry.toast("Switched to personal account");setTimeout(()=>location.reload(),1000)}else{zigry.alert(data.message||"Error switching account")}}).catch((err)=>zigry.alert("Network error"))}};function stripTags(html){const div=document.createElement("div");div.innerHTML=html;return div.textContent||div.innerText||""}
document.addEventListener("click",async(e)=>{const btn=e.target.closest&&e.target.closest(".zigry-confirm");if(!btn)return;e.preventDefault();const message=btn.getAttribute("data-message")||"Are you sure you want to proceed?";const action=btn.getAttribute("data-action");const method=(btn.getAttribute("data-method")||"POST").toUpperCase();const confirmed=await zigry.alert({title:"Please Confirm",message:message,type:"warning",duration:0,buttons:[{label:"Yes, Proceed",class:"btn-danger",value:!0},{label:"Cancel",class:"btn-secondary",value:!1},],});if(confirmed&&action){zigry.loader(!0);const csrfToken=document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")||"";try{const res=await fetch(action,{method:method,headers:{"Content-Type":"application/json","X-Requested-With":"Zigry-Ajax","X-CSRF-TOKEN":csrfToken,},});const p=await res.json();if(p?.toast)zigry.toast(p.toast,p.type??"success");if(p?.alert)
zigry.alert({message:p.alert,type:p.type??"error",position:p.position??"top-right",});if(p?.html||p?.props)zigry.mount(p.html,p.props||{});if(p.redirect){setTimeout(()=>zigry.navigate(p.redirect),500)}else if(p.reload){location.reload()}
const onSuccess=btn.getAttribute("data-zigry-onsuccess");if(onSuccess&&typeof window[onSuccess]==="function"){window[onSuccess](p,btn)}}catch(err){zigry.toast("Operation failed","error")}finally{zigry.loader(!1)}}});document.addEventListener("click",async(e)=>{const a=e.target.closest&&e.target.closest("[data-friend-action]");if(!a)return;e.preventDefault();const action=a.getAttribute("data-friend-action");const id=a.getAttribute("data-id");const username=a.getAttribute("data-username");const name=a.getAttribute("data-name");if(!username)return;const csrfToken=document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")||"";const refreshTable=()=>{const tableContainer=a.closest("[zigryTable]");if(tableContainer&&tableContainer.id){const refreshFn=window[tableContainer.id+"_refresh"];if(typeof refreshFn==="function")refreshFn();}};if(action==="unfriend"){const confirmed=await zigry.alert({title:"Remove Friend",message:`Are you sure you want to remove <strong>${name}</strong> from your friends?`,type:"warning",duration:0,buttons:[{label:"Yes, Remove",class:"btn-danger",value:!0},{label:"Cancel",class:"btn-secondary",value:!1},],});if(!confirmed)return;zigry.loader(!0);try{const res=await fetch(`/friend/unfriend/${encodeURIComponent(id)}`,{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"Zigry-Ajax","X-CSRF-TOKEN":csrfToken,},body:JSON.stringify({id}),});const data=await res.json();if(data.toast)zigry.toast(data.toast);if(data.alert)zalert(data.alert,data.type||"success");refreshTable()}catch(err){zigry.toast("Operation failed","error")}finally{zigry.loader(!1)}}else if(action==="block"){const confirmed=await zigry.alert({title:"Block User",message:`Are you sure you want to block <strong>${name}</strong>? They will no longer be able to contact you.`,type:"warning",duration:0,buttons:[{label:"Yes, Block",class:"btn-danger",value:!0},{label:"Cancel",class:"btn-secondary",value:!1},],});if(!confirmed)return;zigry.loader(!0);try{const res=await fetch(`/friend/block/${encodeURIComponent(id)}`,{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"Zigry-Ajax","X-CSRF-TOKEN":csrfToken,},body:JSON.stringify({id}),});const data=await res.json();if(data.toast)zigry.toast(data.toast);if(data.alert)zalert(data.alert,data.type||"success");refreshTable()}catch(err){zigry.toast("Operation failed","error")}finally{zigry.loader(!1)}}else if(action==="report"){const reason=await zigry.alert({title:"Report Profile",message:`Why are you reporting <strong>${name}</strong>?<br><small class="text-muted">Select the reason that best applies</small>`,type:"warning",duration:0,width:420,buttons:[{label:"🚫  Spam or scam",class:"btn-outline-warning w-100 text-start",value:"spam",},{label:"🔞  Inappropriate content",class:"btn-outline-danger w-100 text-start",value:"inappropriate",},{label:"😡  Harassment or bullying",class:"btn-outline-danger w-100 text-start",value:"harassment",},{label:"🤖  Fake account or impersonation",class:"btn-outline-warning w-100 text-start",value:"fake_account",},{label:"⚠️  Other",class:"btn-outline-secondary w-100 text-start",value:"other",},{label:"Cancel",class:"btn-secondary btn-sm px-4",value:!1},],});if(!reason)return;zigry.loader(!0);try{const res=await fetch(`/user/report/${encodeURIComponent(id)}`,{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"Zigry-Ajax","X-CSRF-TOKEN":csrfToken,},body:JSON.stringify({id,reason}),});const data=await res.json();if(data.toast)zigry.toast(data.toast);zigry.alert({title:"Report Submitted",message:"Thank you for your report. We will review it shortly.",type:"success",duration:3000,})}catch(err){zigry.toast("Operation failed","error")}finally{zigry.loader(!1)}}});const csrfToken=document.querySelector('meta[name="csrf-token"]')["content"];function speak(text){const utterance=new SpeechSynthesisUtterance(text);const voices=speechSynthesis.getVoices();utterance.voice=voices[10];speechSynthesis.speak(utterance)}
const startButton=document.getElementById("mic")??!1;let mediaStream=null;if(startButton){startButton.addEventListener("click",async()=>{alert(1);try{mediaStream=await navigator.mediaDevices.getUserMedia({audio:!0});const audioContext=new(window.AudioContext||window.webkitAudioContext)();const source=audioContext.createMediaStreamSource(mediaStream);const analyser=audioContext.createAnalyser();source.connect(analyser)}catch(error){console.error("Error accessing microphone:",error)}})}
function updateDynamicTime(){document.querySelectorAll(".date").forEach((element)=>{const timestamp=element.getAttribute("data-timestamp");if(timestamp){try{element.textContent=humanReadableTime(timestamp);const diffInSeconds=Math.floor((new Date()-new Date(parseTime(timestamp)*1000))/1000,);if(diffInSeconds<60){}else if(diffInSeconds>60&&diffInSeconds<3600){setTimeout(updateDynamicTime,60*1000)}else{setTimeout(updateDynamicTime,60*60*1000)}}catch(e){element.textContent="Invalid timestamp"}}})}
function parseTime(input){if(input instanceof Date)return input;const relativeMatch=String(input).trim().toLowerCase().match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/);if(relativeMatch){const[,value,unit]=relativeMatch;const date=new Date();switch(unit){case "second":date.setSeconds(date.getSeconds()-value);break;case "minute":date.setMinutes(date.getMinutes()-value);break;case "hour":date.setHours(date.getHours()-value);break;case "day":date.setDate(date.getDate()-value);break;case "week":date.setDate(date.getDate()-value*7);break;case "month":date.setMonth(date.getMonth()-value);break;case "year":date.setFullYear(date.getFullYear()-value);break}
return date}
const num=Number(input);if(!isNaN(num)){if(input.toString().length===10)return new Date(num*1000);if(input.toString().length===13)return new Date(num);}
const customMatch=input.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,);if(customMatch){const[,dd,mm,yyyy,hh,min,ss]=customMatch;return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`)}
const parsed=new Date(input);if(!isNaN(parsed.getTime()))return parsed}
function humanReadableTime(input){const now=new Date();let time=parseTime(input);try{const diffInSeconds=Math.floor((now-time)/1000);const isPast=diffInSeconds>=0;const absDiffInSeconds=Math.abs(diffInSeconds);if(absDiffInSeconds<60){return `Just now`}else if(absDiffInSeconds<3600){const minutes=Math.floor(absDiffInSeconds/60);return `${isPast ? "" : "before"} ${minutes} ${minutes === 1 ? "minute" : "minutes"} ${isPast ? "ago" : ""}`}else if(absDiffInSeconds<86400){const hours=Math.floor(absDiffInSeconds/3600);return `${isPast ? "" : "before"} ${hours} ${hours === 1 ? "hour" : "hours"} ${isPast ? "ago" : ""}`}else if(absDiffInSeconds<2592000){const days=Math.floor(absDiffInSeconds/86400);return `${isPast ? "" : "before"} ${days} ${days === 1 ? "day" : "days"} ${isPast ? "ago" : ""}`}else if(absDiffInSeconds<31536000){const months=Math.floor(absDiffInSeconds/2592000);return `${isPast ? "" : "before"} ${months} ${months === 1 ? "month" : "months"} ${isPast ? "ago" : ""}`}else{const years=Math.floor(absDiffInSeconds/31536000);return `${isPast ? "" : "before"} ${years} ${years === 1 ? "year" : "years"} ${isPast ? "ago" : ""}`}}catch(error){}}
updateDynamicTime();function getLocation(){return new Promise((resolve,reject)=>{navigator.geolocation.getCurrentPosition((position)=>resolve(position),(error)=>reject(error),)})}
async function getUserCoordinates(){try{const position=await getLocation();const{latitude,longitude,accuracy}=position.coords;return position.coords}catch(error){console.error(error)}}
const storageKey="searchRecords";function getSearchRecords(){const records=sessionStorage.getItem(storageKey);return records?JSON.parse(records):[]}
function saveSearchRecords(records){sessionStorage.setItem(storageKey,JSON.stringify(records))}
function addSearchRecord(searchTerm){let records=getSearchRecords();const existingIndex=records.findIndex((record)=>record.term===searchTerm,);if(existingIndex!==-1){records[existingIndex].time=new Date().toISOString()}else{records.push({term:searchTerm,time:new Date().toISOString()})}
records.sort((a,b)=>new Date(b.time)-new Date(a.time));records=records.slice(0,10);saveSearchRecords(records)}
function updateDropdown(records){const dropdownList=document.getElementById("dropdown-list");if(!dropdownList){console.warn("updateDropdown: #dropdown-list not found");return}
dropdownList.innerHTML="";records.forEach((record)=>{const term=record&&record.term?record.term:typeof record==="string"?record:null;if(!term)return;const item=document.createElement("div");item.className="dropdown-item";item.textContent=term;item.addEventListener("click",()=>{const searchInput=document.getElementById("search");if(searchInput)searchInput.value=term;dropdownList.classList.remove("active");if(searchInput&&searchInput.form)searchInput.form.submit();});dropdownList.appendChild(item)});if(records.length>0){dropdownList.classList.add("active")}else{dropdownList.classList.remove("active")}}
async function fetchServerSuggestions(query){try{const response=await fetch(`/api/search-suggestions?query=${encodeURIComponent(query)}`,);if(response.ok){const suggestions=await response.json();return suggestions.map((term)=>({term,time:new Date().toISOString(),}))}else{console.error("Failed to fetch server suggestions");return[]}}catch(error){console.error("Error fetching suggestions:",error);return[]}}
async function fetchAndCombineSuggestions(query){const localRecords=getSearchRecords();const filteredLocalRecords=localRecords.filter((record)=>record.term.toLowerCase().includes(query.toLowerCase()),);const serverSuggestions=await fetchServerSuggestions(query);const combined=[...filteredLocalRecords];serverSuggestions.forEach((serverRecord)=>{if(!combined.some((localRecord)=>localRecord.term===serverRecord.term)){combined.push(serverRecord)}});combined.sort((a,b)=>new Date(b.time)-new Date(a.time));const top=combined.slice(0,5);try{console.debug("suggestions combined",top)}catch(e){}
updateDropdown(top)}
function setupEventListeners(){const searchInput=document.getElementById("search");const dropdownList=document.getElementById("dropdown-list");searchInput?.addEventListener("input",debounce(async(event)=>{const query=event.target.value.trim();if(query){await fetchAndCombineSuggestions(query)}else{dropdownList?.classList.remove("active")}},1000),);document.getElementById("search-button")?.addEventListener("click",()=>{const query=searchInput.value.trim();if(query){addSearchRecord(query)}});document.getElementById("search-magic")?.addEventListener("click",()=>{const query=searchInput.value.trim();if(query){addSearchRecord(query)}});document.addEventListener("click",(event)=>{if(!event.target.closest(".dropdown")){dropdownList?.classList?.remove("active")}})}
function debounce(func,delay){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>func(...args),delay)}}
document.addEventListener("DOMContentLoaded",()=>{setupEventListeners()});async function fetchSuggestion(query){try{const response=await fetch(`/suggestion/handler?query=${encodeURIComponent(query)}`,);if(response.ok){const data=await response.json();return data.suggestion||null}else{console.error("Failed to fetch suggestion");return null}}catch(error){console.error("Error fetching suggestion:",error);return null}}
function displaySuggestion(suggestion){const suggestionContainer=document.getElementById("suggestion-container");if(suggestion){suggestionContainer.innerHTML=`Did you mean <a href="#" id="suggestion-link">${suggestion}</a>?`;suggestionContainer.style.display="block";const suggestionLink=document.getElementById("suggestion-link");suggestionLink.addEventListener("click",(event)=>{event.preventDefault();const searchInput=document.getElementById("search");searchInput.value=suggestion;searchInput.form.submit()})}else{suggestionContainer.style.display="none"}}
async function handleSearch(event){const searchInput=document.getElementById("search");const query=searchInput.value.trim();if(!query){event.preventDefault();return}
const suggestion=await fetchSuggestion(query);displaySuggestion(suggestion)}
function urlB64ToUint8Array(base64String){const padding="=".repeat((4-(base64String.length%4))%4);const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");const rawData=window.atob(base64);return new Uint8Array([...rawData].map((char)=>char.charCodeAt(0)))}
function sendSubscriptionToServer(subscription){fetch("/subscribe",{method:"POST",body:JSON.stringify(subscription),headers:{"X-Requested-With":"Zigry-Ajax","X-CSRF-Token":csrfToken,"Content-Type":"application/json",},}).then((response)=>{if(response.ok){}}).catch((err)=>{})}
function createNotification(title,icon,body,url){var notification=new Notification(title,{icon:icon,body:body,});notification.onclick=function(){window.open(url)};return notification};function uploadStory(input){if(!input.files||!input.files[0])return;const file=input.files[0];if(file.size>50*1024*1024){alert("File size must be less than 50MB");return}
const validTypes=["image/jpeg","image/jpg","image/png","image/gif","video/mp4","video/webm","video/ogv",];if(!validTypes.includes(file.type)){alert("Invalid file type. Please upload an image (JPEG, PNG, GIF) or video (MP4, WebM, OGV)",);return}
const formData=new FormData();formData.append("file",file);const csrfToken=document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");const loadingEl=document.createElement("div");loadingEl.className="story-item text-center";loadingEl.style.width="60px";loadingEl.innerHTML=`
    <div class="spinner-border text-primary" role="status" style="width: 60px; height: 60px;">
      <span class="visually-hidden">Uploading...</span>
    </div>
    <small class="d-block mt-1 text-muted" style="font-size: 10px;">Uploading...</small>
  `;const container=document.getElementById("stories-list");if(container){container.insertBefore(loadingEl,container.firstChild)}
fetch("/api/stories",{method:"POST",headers:{"X-CSRF-TOKEN":csrfToken,"X-Requested-With":"XMLHttpRequest",},body:formData,}).then((response)=>response.json()).then((data)=>{if(loadingEl&&loadingEl.parentNode){loadingEl.remove()}
if(data.success){if(typeof zigry.toast==="function"){zigry.toast("Story added successfully!","success")}else{alert("Story added!")}
loadStories()}else{alert("Failed to add story: "+(data.message||"Unknown error"))}}).catch((error)=>{if(loadingEl&&loadingEl.parentNode){loadingEl.remove()}
console.error("Error:",error);alert("Failed to upload story. Please try again.")});input.value=""}
function loadStories(){if(!document.getElementById("stories-list"))return;fetch("/api/stories").then((response)=>response.json()).then((data)=>{const container=document.getElementById("stories-list");if(!container)return;container.innerHTML="";if(Array.isArray(data)&&data.length>0){data.forEach((userStories,index)=>{const storyEl=document.createElement("div");storyEl.className="story-item text-center pointer";storyEl.style.width="60px";storyEl.style.position="relative";const firstStory=userStories.stories[0];let mediaHtml="";let ringStyle="";const storyCount=userStories.stories.length;if(storyCount<=1){ringStyle="background: linear-gradient(45deg, #667eea, #764ba2);"}else{const gapDegrees=5;const segmentDegrees=(360-storyCount*gapDegrees)/storyCount;let gradientParts=[];let currentDeg=0;for(let i=0;i<storyCount;i++){gradientParts.push(`#667eea ${currentDeg}deg ${currentDeg + segmentDegrees}deg`,);gradientParts.push(`transparent ${currentDeg + segmentDegrees}deg ${
                  currentDeg + segmentDegrees + gapDegrees
                }deg`,);currentDeg+=segmentDegrees+gapDegrees}
ringStyle=`background: conic-gradient(${gradientParts.join(
              ", ",
            )});`}
const containerStyle=`width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 3px; ${ringStyle}`;const innerStyle="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: white;";if(firstStory.isVideo){mediaHtml=`<div style="${containerStyle}">
                <div style="${innerStyle} display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden;">
                  <i class="zigry z-play text-white"></i>
                </div>
            </div>`}else{mediaHtml=`<div style="${containerStyle}">
               <div style="${innerStyle} overflow: hidden; display: flex; align-items: center; justify-content: center;">
                 <img class="encrypted" data-url="${firstStory.file}" style="width: 100%; height: 100%; object-fit: cover;">
               </div>
            </div>`}
const countBadge=userStories.stories.length>1?`<span style="position: absolute; top: -5px; right: -5px; background: #007bff; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${userStories.stories.length}</span>`:"";storyEl.innerHTML=`
            ${mediaHtml}
            ${countBadge}
            <small class="d-block mt-1 text-muted text-truncate" style="font-size: 10px; max-width: 60px;">${
              userStories.user ? userStories.user.name : "User"
            }</small>
          `;storyEl.onclick=()=>viewUserStories(userStories,data,index);container.appendChild(storyEl);if(!firstStory.isVideo){const img=storyEl.querySelector(".encrypted");if(img&&typeof decryptAndSetProtectedMedia==="function"){decryptAndSetProtectedMedia(img)}}})}}).catch((error)=>console.error("Error loading stories:",error))}
function viewUserStories(userStories,allUserStoriesData,currentUserIndex){let currentIndex=0;const stories=userStories.stories;window.allUserStoriesData=allUserStoriesData||window.allUserStoriesData;window.currentUserIndex=currentUserIndex!==undefined?currentUserIndex:window.currentUserIndex||0;function showStory(index){if(index<0)return;if(index>=stories.length){jumpToNextUser();return}
if(window.storyTimer)clearTimeout(window.storyTimer);if(window.currentVideo){window.currentVideo.onended=null;window.currentVideo.ontimeupdate=null;window.currentVideo=null}
currentIndex=index;window.storyCurrentIndex=index;const story=stories[index];if(!story.isViewed&&!story.viewed){story.isViewed=!0;story.viewed=!0;story.views=(parseInt(story.views)||0)+1;fetch(`/api/stories/${story.id}/view`,{method:"GET",headers:{"X-Requested-With":"XMLHttpRequest",},}).then((res)=>res.json()).then((resData)=>{if(resData&&resData.views!==undefined){story.views=resData.views;const viewsIndicator=document.querySelector(".story-views-indicator",);if(viewsIndicator){viewsIndicator.innerHTML=`<svg class="zigry z-eye"><use xlink:href="#z-eye"></use></svg> ${resData.views}`;if(typeof replaceZigryIcons==="function")
replaceZigryIcons(viewsIndicator);}}}).catch(console.error)}
const viewer=document.getElementById("story-viewer")||createViewer();let content="";if(story.isVideo){content=`<video class="story-video encrypted" src="${story.fileUrl}" data-src="${story.fileUrl}" autoplay playsinline preload="auto" style="width: 100%; height: 100%; object-fit: contain; cursor: pointer;"></video>`}else{content=`<img class="encrypted zigry-single-img" data-url="${story.file}" style="height: 100%; width: auto; max-width: 100%; object-fit: contain; background: transparent; cursor: pointer;">`}
const progressBars=stories.map((_,i)=>`
      <div style="flex: 1; height: 3px; background: rgba(255,255,255,0.3); margin: 0 2px; border-radius: 2px; overflow: hidden; contain: paint;">
        <div class="story-progress-bar" style="width: 100%; height: 100%; background: white; transform: scaleX(${
          i < currentIndex ? "1" : "0"
        }); transform-origin: left; transition: none;"></div>
      </div>
    `,).join("");const userInfo=`
      <div style="position: absolute; top: 20px; left: 20px; right: 20px; z-index: 10001;">
        <div style="display: flex; gap: 4px; margin-bottom: 10px;">
          ${progressBars}
        </div>
        <div style="color: white; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); padding: 0; border-radius: 25px; width: fit-content;">
          <img src="${userStories.user.avatar}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
          <span style="font-weight: 600;" class="visually-hidden-focusable">${userStories.user.name}</span>
        </div>
      </div>
    `;const prevButton=currentIndex>0?`
      <button onclick="window.prevStory()" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10001;">
        ‹
      </button>
    `:"";const nextButton=`
      <button onclick="window.nextStory()" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10001;">
        ›
      </button>
    `;viewer.innerHTML=`
      ${userInfo}
      <button onclick="window.closeStoryViewer()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 30px; cursor: pointer; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10002;">&times;</button>
      ${prevButton}
      ${nextButton}
      ${content}
      <div style="position: absolute; bottom: 30px; left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; z-index: 10001;">
        <div class="story-views-indicator" style="color: white; background: rgba(0,0,0,0.5); padding: 8px 15px; border-radius: 20px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 6px;" onclick="${userStories.user.id === (window.currentUser ? window.currentUser.id : null) ? `window.showStoryViewers(${story.id})` : ""}">
          <svg class="zigry z-eye"><use xlink:href="#z-eye"></use></svg> ${story.views || 0}
        </div>
        <div class="story-like-btn" style="color: ${story.isLiked ? "#ff4b4b" : "white"}; background: rgba(0,0,0,0.5); padding: 6px 12px; border-radius: 20px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: transform 0.2s;" onclick="window.likeStory(${story.id}, this)">
            <svg class="zigry z-heart" style="fill: ${story.isLiked ? "#ff4b4b" : "currentColor"};"><use xlink:href="#z-heart"></use></svg>
            <span class="likes-count" style="font-size: 13px; font-weight: 600;">${story.likes || 0}</span>
        </div>
      </div>
      <div id="play-pause-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 60px; color: white; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 10000;"><i class="zigry z-play"></i></div>
    `;const currentProgressBar=viewer.querySelectorAll(".story-progress-bar")[currentIndex];let toggleImagePause=null;let toggleVideoPause=null;if(!story.isVideo){const img=viewer.querySelector(".encrypted");if(img&&typeof decryptAndSetProtectedMedia==="function"){decryptAndSetProtectedMedia(img)}
const playPauseOverlay=viewer.querySelector("#play-pause-overlay");let isPaused=!1;const duration=5000;let remainingTime=duration;let startTime=Date.now();let initTimer=null;const startImageProgress=(ms)=>{if(currentProgressBar){currentProgressBar.style.transition=`transform ${ms / 1000}s linear`;currentProgressBar.style.transform="scaleX(1)"}
if(window.storyTimer){clearTimeout(window.storyTimer);window.storyTimer=null}
window.storyTimer=setTimeout(()=>{if(!isPaused){window.nextStory()}},ms)};initTimer=setTimeout(()=>{if(!isPaused){startTime=Date.now();startImageProgress(duration)}},100);toggleImagePause=()=>{if(initTimer){clearTimeout(initTimer);initTimer=null}
if(!isPaused){isPaused=!0;if(window.storyTimer){clearTimeout(window.storyTimer);window.storyTimer=null}
const elapsed=Date.now()-startTime;remainingTime=Math.max(0,remainingTime-elapsed);if(currentProgressBar){const currentScale=Math.min(1,Math.max(0,(duration-remainingTime)/duration),);currentProgressBar.style.transition="none";currentProgressBar.style.transform=`scaleX(${currentScale})`}
if(playPauseOverlay){playPauseOverlay.innerHTML='<i class="zigry z-pause"></i>';if(typeof replaceZigryIcons==="function")
replaceZigryIcons(playPauseOverlay);playPauseOverlay.style.opacity="0.8";setTimeout(()=>{if(isPaused&&playPauseOverlay)
playPauseOverlay.style.opacity="0"},500)}}else{isPaused=!1;startTime=Date.now();startImageProgress(remainingTime);if(playPauseOverlay){playPauseOverlay.innerHTML='<i class="zigry z-play"></i>';if(typeof replaceZigryIcons==="function")
replaceZigryIcons(playPauseOverlay);playPauseOverlay.style.opacity="0.8";setTimeout(()=>{if(!isPaused&&playPauseOverlay)
playPauseOverlay.style.opacity="0"},500)}}}}else{const video=viewer.querySelector(".story-video");const playPauseOverlay=viewer.querySelector("#play-pause-overlay");if(video){window.currentVideo=video;const updateVideoProgress=()=>{if(currentProgressBar&&video.duration&&!isNaN(video.duration)){const currentScale=video.currentTime/video.duration;const remainingDuration=Math.max(0,video.duration-video.currentTime,);if(video.paused){currentProgressBar.style.transition="none";currentProgressBar.style.transform=`scaleX(${currentScale})`}else{currentProgressBar.style.transition=`transform ${remainingDuration}s linear`;currentProgressBar.style.transform="scaleX(1)"}}};const startVideoProgress=()=>{updateVideoProgress()};if(video.readyState>=1){startVideoProgress()}else{video.addEventListener("loadedmetadata",startVideoProgress)}
video.addEventListener("timeupdate",()=>{if(video.paused){updateVideoProgress()}});video.onended=()=>{window.nextStory()};video.play().catch((e)=>{});toggleVideoPause=()=>{if(video.paused){video.play().catch((e)=>{});updateVideoProgress();if(playPauseOverlay){playPauseOverlay.innerHTML='<i class="zigry z-play"></i>';if(typeof replaceZigryIcons==="function")
replaceZigryIcons(playPauseOverlay);playPauseOverlay.style.opacity="0.8";setTimeout(()=>(playPauseOverlay.style.opacity="0"),500)}}else{video.pause();updateVideoProgress();if(playPauseOverlay){playPauseOverlay.innerHTML='<i class="zigry z-pause"></i>';if(typeof replaceZigryIcons==="function")
replaceZigryIcons(playPauseOverlay);playPauseOverlay.style.opacity="0.8";setTimeout(()=>(playPauseOverlay.style.opacity="0"),500)}}}}}
const handleStoryClick=(e)=>{if(e.target&&e.target.closest&&e.target.closest("button, .story-views-indicator, .story-like-btn, .story-viewers-modal",)){return}
e.stopPropagation();if(!story.isVideo&&typeof toggleImagePause==="function"){toggleImagePause()}else if(story.isVideo&&typeof toggleVideoPause==="function"){toggleVideoPause()}};viewer.addEventListener("click",handleStoryClick)}
function createViewer(){const viewer=document.createElement("div");viewer.id="story-viewer";viewer.className="story-viewer";viewer.style.position="fixed";viewer.style.top="0";viewer.style.left="0";viewer.style.width="100%";viewer.style.height="100%";viewer.style.backgroundColor="#000";viewer.style.zIndex="9999";viewer.style.display="flex";viewer.style.alignItems="center";viewer.style.justifyContent="center";viewer.style.contain="strict";document.body.appendChild(viewer);return viewer}
function jumpToNextUser(){const nextUserIndex=window.currentUserIndex+1;if(nextUserIndex<window.allUserStoriesData.length){window.currentUserIndex=nextUserIndex;viewUserStories(window.allUserStoriesData[nextUserIndex],window.allUserStoriesData,nextUserIndex,)}else{window.closeStoryViewer()}}
function handleKeyboard(e){if(e.key==="Escape"){window.closeStoryViewer()}else if(e.key==="ArrowLeft"){window.prevStory()}else if(e.key==="ArrowRight"){window.nextStory()}}
document.addEventListener("keydown",handleKeyboard);window.prevStory=()=>showStory(currentIndex-1);window.nextStory=()=>showStory(currentIndex+1);window.closeStoryViewer=()=>{if(window.storyTimer)clearTimeout(window.storyTimer);if(window.currentVideo){window.currentVideo.onended=null;window.currentVideo.ontimeupdate=null;window.currentVideo=null}
const viewer=document.getElementById("story-viewer");if(viewer)viewer.remove();document.removeEventListener("keydown",handleKeyboard);delete window.prevStory;delete window.nextStory;delete window.closeStoryViewer;delete window.allUserStoriesData;delete window.currentUserIndex;delete window.storyTimer};showStory(0)}
window.likeStory=function(storyId,btn){btn.style.transform="scale(1.3)";setTimeout(()=>(btn.style.transform="scale(1)"),200);const csrfToken=document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");fetch(`/api/stories/${storyId}/like`,{method:"POST",headers:{"X-CSRF-TOKEN":csrfToken,"X-Requested-With":"XMLHttpRequest",Accept:"application/json",},}).then((response)=>response.json()).then((data)=>{if(data.success){const icon=btn.querySelector("svg.z-heart")||btn.querySelector("i");const likesCountSpan=btn.querySelector(".likes-count");if(data.liked){btn.style.color="#ff4b4b";if(icon)icon.style.fill="#ff4b4b"}else{btn.style.color="#ffffff";if(icon)icon.style.fill="currentColor"}
if(likesCountSpan&&data.likes!==undefined){likesCountSpan.textContent=data.likes}
if(window.storyCurrentIndex!==undefined&&window.allUserStoriesData){const currentStoryUser=window.allUserStoriesData[window.currentUserIndex];if(currentStoryUser&&currentStoryUser.stories&&currentStoryUser.stories[window.storyCurrentIndex]){currentStoryUser.stories[window.storyCurrentIndex].isLiked=data.liked;currentStoryUser.stories[window.storyCurrentIndex].likes=data.likes}}}}).catch(console.error)};window.showStoryViewers=function(storyId){if(window.storyTimer){clearTimeout(window.storyTimer)}
if(window.currentVideo){window.currentVideo.pause()}
const activeProgress=document.querySelectorAll(".story-progress-bar")[window.storyCurrentIndex];if(activeProgress){activeProgress.style.transition="none"}
const modal=document.createElement("div");modal.className="story-viewers-modal";modal.style.cssText=`
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;const content=document.createElement("div");content.style.cssText=`
        background: #1e1e1e;
        color: white;
        width: 90%;
        max-width: 400px;
        border-radius: 15px;
        overflow: hidden;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        border: 1px solid #333;
    `;content.innerHTML=`
        <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
            <h5 style="margin: 0;">Viewers</h5>
            <button id="close-viewers-btn" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div id="viewers-list" style="padding: 10px; overflow-y: auto; flex: 1;">
            <div style="text-align: center; padding: 20px; color: #888;">Loading...</div>
        </div>
    `;modal.appendChild(content);document.body.appendChild(modal);const closeViewers=()=>{document.body.removeChild(modal);if(window.nextStory)window.nextStory();};document.getElementById("close-viewers-btn").onclick=closeViewers;modal.onclick=(e)=>{if(e.target===modal)closeViewers();};fetch(`/api/stories/${storyId}/viewers`).then((response)=>response.json()).then((data)=>{const list=document.getElementById("viewers-list");if(data.success&&data.viewers&&data.viewers.length>0){list.innerHTML=data.viewers.map((viewer)=>`
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid #222;">
                    <img src="${viewer.avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${viewer.name}</div>
                        <div style="color: #888; font-size: 12px;">@${viewer.username}</div>
                    </div>
                    <div style="color: #666; font-size: 11px;">${new Date(viewer.viewed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
            `,).join("")}else{list.innerHTML=`<div style="text-align: center; padding: 20px; color: #888;">No viewers yet</div>`}}).catch((err)=>{document.getElementById("viewers-list").innerHTML=`<div style="text-align: center; padding: 20px; color: #ff4b4b;">Error loading viewers</div>`})};document.addEventListener("DOMContentLoaded",()=>{loadStories();if(typeof zigry!=="undefined"&&zigry.use){zigry.use("afterMount",loadStories)}});var reelsData=[];var currentReelIndex=0;var reelsPage=1;var reelsHasMore=!0;var reelsLoading=!1;function uploadReel(input){if(!input.files||!input.files[0])return;const file=input.files[0];const validTypes=["video/mp4","video/webm","video/ogv","video/mov"];if(!validTypes.includes(file.type)){alert(window.reels_tx?.invalid_file_type||"Invalid file type. Please upload a video (MP4, WebM, OGV, MOV)",);return}
if(file.size>20*1024*1024){alert(window.reels_tx?.file_too_large||"File size must be less than 20MB",);return}
const video=document.createElement("video");video.preload="metadata";video.onloadedmetadata=function(){window.URL.revokeObjectURL(video.src);const duration=Math.round(video.duration||0);const formData=new FormData();formData.append("video",file);formData.append("caption",document.getElementById("reel-caption").value);formData.append("duration",duration);const csrfToken=document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");const uploadBtn=input.closest(".add-reel-btn")||input.parentElement;if(uploadBtn){uploadBtn.style.opacity="0.5";uploadBtn.style.pointerEvents="none"}
fetch("/api/reels",{method:"POST",headers:{"X-CSRF-TOKEN":csrfToken,"X-Requested-With":"XMLHttpRequest",},body:formData,}).then((response)=>response.json()).then((data)=>{if(data.success){if(typeof zigry!=="undefined"&&zigry.toast){zigry.toast(window.reels_tx?.upload_success||"Reel uploaded successfully!",)}else{}
loadReelsPreview()}else{alert((window.reels_tx?.upload_failed||"Failed to upload reel")+": "+(data.message||"Unknown error"),)}}).catch((error)=>{}).finally(()=>{if(uploadBtn){uploadBtn.style.opacity="1";uploadBtn.style.pointerEvents="auto"}
input.value=""})};video.src=URL.createObjectURL(file)}
function loadReelsPreview(){const container=document.getElementById("reels-preview-list");if(!container)return;fetch("/api/reels/preview").then((response)=>response.json()).then((reels)=>{container.innerHTML="";if(Array.isArray(reels)&&reels.length>0){reels.forEach((reel,index)=>{const reelEl=document.createElement("div");reelEl.className="reel-preview-item rounded-3 overflow-hidden position-relative flex-shrink-0";reelEl.style.cssText="width: 140px; height: 200px; cursor: pointer;";const bgImage=reel.thumbnail||"";reelEl.innerHTML=`
            <div class="w-100 h-100 d-flex align-items-center justify-content-center" style="background: linear-gradient(45deg, #667eea, #764ba2);">
                ${
                  bgImage
                    ? `<img src="${bgImage}" class="w-100 h-100 object-fit-cover">`
                    : ""
                }
                <div class="position-absolute top-50 start-50 translate-middle text-white fs-4">▶</div>
            </div>
            <div class="position-absolute bottom-0 start-0 end-0 p-1" style="background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                <small class="text-white d-block text-center text-truncate small" style="font-size: 9px;">${
                  reel.user?.name || ""
                }</small>
            </div>
          `;reelEl.onclick=()=>{if(reel.hash){if(typeof zigry!=="undefined"&&zigry.navigate){zigry.navigate("/reels/"+reel.hash)}else{window.location.href="/reels/"+reel.hash}}else{console.error("Reel missing hash, cannot navigate",reel)}};container.appendChild(reelEl)})}}).catch((error)=>console.error("Error loading reels preview:",error))}
function loadReelsPage(){if(reelsPage===1){reelsData=[];reelsHasMore=!0;currentReelIndex=0;if(window.initialReel){reelsData.push(window.initialReel);renderReels([window.initialReel]);window.initialReel=null}}
if(reelsLoading||!reelsHasMore)return;reelsLoading=!0;const loadingEl=document.getElementById("reels-loading");let url=`/api/reels/feed?page=${reelsPage}`;if(reelsPage===1){const pathParts=window.location.pathname.split("/");if(pathParts.length>=3&&pathParts[1]==="reels"&&pathParts[2]){url+=`&hash=${pathParts[2]}`}}
fetch(url).then((response)=>response.json()).then((data)=>{if(loadingEl)loadingEl.style.display="none";if(data.success&&data.reels&&data.reels.length>0){const newReels=data.reels.filter((r)=>!reelsData.some((existing)=>existing.id===r.id),);if(newReels.length>0){reelsData=reelsData.concat(newReels);renderReels(newReels)}
reelsHasMore=data.hasMore;reelsPage++}else if(reelsData.length===0){const feed=document.getElementById("reels-feed");if(feed){feed.innerHTML=`
            <div class="d-flex flex-column align-items-center justify-content-center h-100 text-white">
                <div class="mb-3" style="font-size: 48px;">🎬</div>
                <h3>${window.reels_tx?.no_reels_yet || "No reels yet"}</h3>
                <p class="opacity-75">${window.reels_tx?.be_first_to_upload || "Be the first to upload a reel!"}</p>
                <a href="/" class="btn btn-primary mt-3">${window.reels_tx?.go_home || "Go Home"}</a>
            </div>
          `}}
reelsLoading=!1}).catch((error)=>{console.error("Error loading reels:",error);reelsLoading=!1;if(loadingEl)loadingEl.style.display="none"})}
var reelObserver=null;function renderReels(reels){const feed=document.getElementById("reels-feed");if(!feed)return;const newElements=[];reels.forEach((reel,index)=>{const reelEl=document.createElement("div");reelEl.className="reel-item";reelEl.dataset.reelId=reel.id;reelEl.dataset.hash=reel.hash||"";reelEl.dataset.isAd=reel.is_ad?"true":"false";if(reel.is_ad){reelEl.dataset.adId=reel.ad_id;reelEl.dataset.campaignId=reel.campaign_id}
reelEl.dataset.index=reelsData.length-reels.length+index;reelEl.innerHTML=`
      <div class="reel-video-wrapper">
        <video 
            class="reel-video-player zigry-video" 
            src="${reel.video_url}"
            ${reel.thumbnail ? `poster="${reel.thumbnail}"` : ""}
            loop
            playsinline
            preload="auto"
        ></video>
        
        <div class="play-pause-indicator">▶</div>
        
        <div class="reel-overlay">
            <a href="${
              reel.is_ad ? "#" : "/" + (reel.user?.username || "")
            }" class="reel-user-info text-decoration-none text-white">
                <img src="${
                  reel.user?.avatar ||
                  "/assets/images/default/756e6b6e6f776e.png"
                }" 
                     class="reel-user-avatar"
                     onerror="this.onerror=null;this.src='/assets/images/default/756e6b6e6f776e.png'">
                <div class="d-flex flex-column">
                    <span class="reel-user-name gap-2">
                        ${reel.user?.name || "Unknown"}
                        ${
                          reel.user?.verified
                            ? '<svg class="glow zigry zigry-xs z-verified reel-verified"><use xlink:href="#z-verified"></use></svg>'
                            : ""
                        }
                    </span>
                    ${
                      reel.is_ad
                        ? `<span class="badge bg-white text-dark" style="font-size: 10px; width: fit-content;">${window.reels_tx?.sponsored||"Sponsored"}</span>`
                        : ""
                    }
                </div>
            </a>
            <div class="reel-caption">${reel.caption || ""}</div>
            ${
              reel.is_ad && reel.cta_link
                ? `<a href="${
                    reel.cta_link
                  }" target="_blank" class="btn btn-primary btn-sm mt-2 w-100" onclick="trackAdClick('${
                    reel.ad_id
                  }', '${reel.campaign_id}')">${reel.cta_text||window.reels_tx?.learn_more||"Learn More"}</a>`
                : ""
            }
        </div>
        
        <div class="reel-actions">
            ${
              !reel.is_ad
                ? `<div class="reel-action-btn ${
              reel.is_liked ? "liked" : ""
            }" onclick="toggleReelLike(${reel.id}, this)"><span class="icon"><svg class="z-heart"><use xlink:href="#z-heart"></use></svg></span><span class="count likes-count">${formatNumber(reel.likes||0,)}</span></div><div class="reel-action-btn" onclick="openComments('${reel.hash}')"><span class="icon"><svg class="z-message"><use xlink:href="#z-message"></use></svg></span><span class="count comments-count">${formatNumber(reel.comments_count||0,)}</span></div><div class="reel-action-btn" onclick="shareReel(${reel.id})"><span class="icon"><svg class="z-share-plane"><use xlink:href="#z-share-plane"></use></svg></span><span class="count">${window.reels_tx?.share||"Share"}</span></div><div class="reel-action-btn views-display"><span class="icon"><svg class="z-eye"><use xlink:href="#z-eye"></use></svg></span><span class="count views-count">${formatNumber(reel.views||0,)}</span></div>`
                : ""
            }
        </div>
      </div>
    `;feed.appendChild(reelEl);newElements.push(reelEl);const appLoader=document.querySelector(".zigry-loader");if(appLoader)appLoader.style.display="none";const video=reelEl.querySelector(".reel-video-player");const indicator=reelEl.querySelector(".play-pause-indicator");video.addEventListener("loadeddata",function(){const loadingEl=document.getElementById("reels-loading");if(loadingEl)loadingEl.style.display="none"});video.addEventListener("error",function(e){console.error("Video load error:",e,this.error);console.error("Failed URL:",this.src);const loadingEl=document.getElementById("reels-loading");if(loadingEl)loadingEl.style.display="none";if(indicator){indicator.textContent="⚠️";indicator.style.opacity="0.8"}});video.addEventListener("playing",function(){if(indicator)indicator.style.opacity="0"});if(reelsData.length-reels.length+index===0){video.play().catch((err)=>{if(indicator){indicator.textContent="▶";indicator.style.opacity="0.8"}})}
video.addEventListener("click",function(e){e.stopPropagation();if(this.paused){this.play();indicator.textContent="▶"}else{this.pause();indicator.textContent="⏸"}
indicator.style.opacity="0.8";setTimeout(()=>(indicator.style.opacity="0"),500)});video.addEventListener("contextmenu",function(e){e.preventDefault();return!1})});setupReelObserver(newElements)}
function setupReelObserver(elements){if(!reelObserver){reelObserver=new IntersectionObserver((entries)=>{entries.forEach((entry)=>{const video=entry.target.querySelector(".reel-video-player");const indicator=entry.target.querySelector(".play-pause-indicator");if(!video)return;if(entry.isIntersecting){const playPromise=video.play();if(playPromise!==undefined){playPromise.then(()=>{if(indicator)indicator.style.opacity="0";if(video._viewTimer)clearTimeout(video._viewTimer);const reelId=entry.target.dataset.reelId;const hash=entry.target.dataset.hash;if(!viewedReels.has(reelId)){video._viewTimer=setTimeout(()=>{const isAd=entry.target.dataset.isAd==="true";const adId=entry.target.dataset.adId;const campaignId=entry.target.dataset.campaignId;trackReelView(reelId,hash,isAd,adId,campaignId)},3000)}
if(hash){const currentFn=window.location.pathname.split("/").pop();if(currentFn!==hash){const newUrl="/reels/"+hash;history.replaceState({path:newUrl},"",newUrl)}}else{console.warn("No hash found for reel",reelId)}}).catch((e)=>{if(indicator){indicator.textContent="▶";indicator.style.opacity="0.8"}})}}else{video.pause();if(video._viewTimer){clearTimeout(video._viewTimer);video._viewTimer=null}}})},{threshold:0.5,},)}
if(elements&&elements.length>0){elements.forEach((reel)=>{reelObserver.observe(reel)})}}
var viewedReels=new Set();let lastViewedReelId=null;function trackReelView(reelId,reelHash,isAd=!1,adId=null,campaignId=null,){if(viewedReels.has(reelId)){return}
viewedReels.add(reelId);const csrfToken=document.querySelector('meta[name="csrf-token"]').getAttribute("content");if(isAd){fetch("/api/ads/track",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":csrfToken,"X-Requested-With":"XMLHttpRequest",},body:JSON.stringify({type:"impression",ad_id:adId,campaign_id:campaignId,reel_id:lastViewedReelId,}),}).catch(console.error);return}
lastViewedReelId=reelId;fetch(`/api/reels/${reelHash}/view`,{headers:{"X-CSRF-TOKEN":csrfToken,"X-Requested-With":"XMLHttpRequest",},}).then((res)=>res.json()).then((data)=>{if(data.success&&!data.viewes){const reelEl=document.querySelector(`[data-reel-id="${reelId}"]`);if(reelEl){const viewsDisplay=reelEl.querySelector(".views-display");const viewsCount=reelEl.querySelector(".views-count");if(viewsCount){let current=parseInt(viewsCount.textContent.replace(/[^0-9]/g,""))||0}}}}).catch(console.error)}
function toggleReelLike(reelId,btn){const csrfToken=document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");fetch(`/api/reels/${reelId}/like`,{method:"POST",headers:{"X-CSRF-TOKEN":csrfToken,"X-Requested-With":"XMLHttpRequest",},}).then((res)=>res.json()).then((data)=>{if(data.success){const icon=btn.querySelector(".icon");const count=btn.querySelector(".likes-count");if(data.liked){btn.classList.add("liked")}else{btn.classList.remove("liked")}
if(count){count.textContent=formatNumber(data.likes)}}else if(data.message==="Unauthorized"){window.location.href="/login"}}).catch(console.error)}
function shareReel(reelId){if(typeof zigry!=="undefined"&&zigry.sharePost){zigry.sharePost(reelId,null,null,"reel")}else{const reel=reelsData.find((r)=>r.id===reelId);if(reel&&reel.share_url){doShare(reel.share_url)}}}
function doShare(url){if(navigator.share){navigator.share({title:window.reels_tx?.check_out_reel||"Check out this reel on Zigry!",url:url,}).catch(console.error)}else{navigator.clipboard.writeText(url).then(()=>{if(typeof zigry!=="undefined"&&zigry.toast){zigry.toast(window.reels_tx?.link_copied||"Link copied to clipboard!",)}else{alert(window.reels_tx?.link_copied||"Link copied to clipboard!")}}).catch(()=>{prompt(window.reels_tx?.copy_link||"Copy this link:",url)})}}
window.exitReels=function(){document.querySelectorAll("video.reel-video-player, video.reel-video").forEach((v)=>{try{v.pause();v.src=""}catch(e){}});const overlay=document.querySelector(".zigry-reels-container");if(overlay){overlay.remove();return}
if(window.history&&window.history.length>1&&document.referrer&&!document.referrer.includes("/reels")){window.history.back();return}
const lastUrl=typeof sessionStorage!=="undefined"?sessionStorage.getItem("lastReelsUrl"):null;const targetUrl=lastUrl&&!lastUrl.includes("/reels")?lastUrl:"/";if(window.zigry&&typeof window.zigry.navigate==="function"){window.zigry.navigate(targetUrl)}else{window.location.href=targetUrl}};function formatNumber(num){if(num>=1000000)return(num/1000000).toFixed(1)+"M";if(num>=1000)return(num/1000).toFixed(1)+"K";return num}
function initReels(){if(document.getElementById("reels-feed")){reelsPage=1;reelsData=[];reelsHasMore=!0;reelsLoading=!1;currentReelIndex=0}
if(document.getElementById("reels-preview-list")){loadReelsPreview()}
if(typeof sessionStorage!=="undefined"){if(!window.location.pathname.includes("/reels")){sessionStorage.setItem("lastReelsUrl",window.location.href)}}
if(typeof enableDragScroll==="function"){enableDragScroll(".ribbon-container")}
const feed=document.getElementById("reels-feed");if(feed){feed.addEventListener("scroll",function(){if(this.scrollTop+this.clientHeight>=this.scrollHeight-500){loadReelsPage()}})}}
document.addEventListener("DOMContentLoaded",()=>{initReels();if(typeof zigry!=="undefined"&&zigry.use){zigry.use("afterMount",initReels)}});function enableDragScroll(selector){const containers=document.querySelectorAll(selector);containers.forEach((slider)=>{let isDown=!1;let startX;let scrollLeft;const startAction=(e)=>{isDown=!0;slider.classList.add("active");startX=(e.pageX||e.touches[0].pageX)-slider.offsetLeft;scrollLeft=slider.scrollLeft;slider.style.cursor="grabbing";slider.style.scrollBehavior="auto"};const stopAction=()=>{isDown=!1;slider.classList.remove("active");slider.style.cursor="grab";slider.style.scrollBehavior="smooth"};const moveAction=(e)=>{if(!isDown)return;const x=e.pageX||e.touches[0].pageX;const walk=(x-startX)*2.5;slider.scrollLeft=scrollLeft-walk};slider.addEventListener("mousedown",startAction);slider.addEventListener("mouseleave",stopAction);slider.addEventListener("mouseup",stopAction);slider.addEventListener("mousemove",(e)=>{if(!isDown)return;e.preventDefault();moveAction(e)});slider.addEventListener("touchstart",(e)=>{startAction(e)},{passive:!0},);slider.addEventListener("touchend",stopAction);slider.addEventListener("touchcancel",stopAction);slider.addEventListener("touchmove",(e)=>{if(!isDown)return;const x=e.touches[0].pageX;if(Math.abs(x-startX)>5){moveAction(e)}},{passive:!0},)})};let currentEditingPostId=null;let selectedMediaFiles=[];function togglePostBox(force=null){const b=document.getElementById("richPostBox");const tp=document.getElementById("togglepost");const tb=document.getElementById("togglebtn");const e=document.getElementById("richPostEditor");const p=document.getElementById("privacySelect");b.style.display=force===!1?"none":force===!0?"block":b.style.display==="none"?"block":"none";tb.style.display=force===!1?"none":force===!0?"block":b.style.display==="none"?"block":"none";p.style.display=force===!1?"none":force===!0?"block":b.style.display==="none"?"block":"none";tp.style.display=force===!0?"none":force===!1?"block":b.style.display==="none"?"block":"none";if(b.style.display=="block"){e.focus()}}
function cancelPost(){document.getElementById("richPostEditor").innerHTML="";document.getElementById("mediaPreview").innerHTML="";selectedMediaFiles=[];document.getElementById("linkPreview").innerHTML="";document.getElementById("linkPreview").classList.add("d-none");document.getElementById("mediaInput").value="";document.getElementById("locationTag").innerHTML="";document.getElementById("locationTag").classList.add("d-none");const p=document.getElementById("privacySelect");if(p)p.value="public";currentEditingPostId=null;const btn=document.getElementById("postSubmitBtn");if(btn)btn.textContent="Post";if(typeof removePoll==="function")removePoll();togglePostBox(!1);renderAddMoreTile()}
function exec(c){document.execCommand(c,!1,null)}
function setEditorColor(c){document.getElementById("richPostEditor").style.backgroundColor=c}
document.querySelectorAll(".color-btn").forEach((b)=>{b.addEventListener("click",()=>{const c=b.style.background;setEditorColor(c)})});async function handleInput(){const el=document.getElementById("richPostEditor");const txt=el.innerText.trim();const preview=document.getElementById("linkPreview");const match=txt.match(/https?:\/\/[^\s]+/);if(match){fetch(`/api/og-meta?url=${encodeURIComponent(match[0])}`).then((r)=>r.json()).then((m)=>{preview.innerHTML=`
          <div class="d-flex">
            <img src="${m.image}" alt="OG Image" class="me-2" width="100">
            <div>
              <div class="fw-bold">${m.title}</div>
              <div class="text-muted small">${m.description}</div>
              <div class="text-primary small">${m.site_name}</div>
            </div>
          </div>
        `;preview.classList.remove("d-none")})}else{preview.classList.add("d-none")}
el.classList.toggle("fs-3",txt.length<=160)}
function tagLocation(){const el=document.getElementById("locationTag");navigator.geolocation.getCurrentPosition((p)=>{const{latitude:lat,longitude:lng}=p.coords;el.classList.remove("d-none");el.textContent=`📍 Location: (${lat.toFixed(4)}, ${lng.toFixed(4)})`;el.dataset.coords=`${lat},${lng}`},()=>{el.classList.remove("d-none");el.textContent="📍 Location tagging failed."},)}
async function submitPost(){const ed=document.getElementById("richPostEditor");const inp=document.getElementById("mediaInput");const prev=document.getElementById("linkPreview");const loc=document.getElementById("locationTag");const ps=document.getElementById("privacySelect");const txt=ed.innerText.trim();const lHtml=!prev.classList.contains("d-none")?prev.innerHTML:"";const coords=loc.dataset.coords||"";const prv=ps?ps.value:"public";const typ=document.getElementById("post_type")?.value||"user";const onId=document.getElementById("post_on_id")?.value||"";const fd=new FormData();fd.append("content",txt);fd.append("location",coords);fd.append("privacy",prv);fd.append("type",typ);fd.append("on_id",onId);if(typeof getPollData==="function"){const pd=getPollData();if(pd){fd.append("poll",JSON.stringify(pd))}}
const files=selectedMediaFiles.length>0?selectedMediaFiles.filter((item)=>item.file).map((item)=>item.file):Array.from(inp.files);for(const f of files){fd.append("media[]",f);if(f.type.startsWith("video/")){const thumb=await zigry.generateVideoThumbnail(f);if(thumb){fd.append("video_thumbnail",thumb)}}}
document.querySelectorAll(".upload-progress").forEach((e)=>e.classList.remove("d-none"));try{let u="/api/posts/create";let m="POST";if(currentEditingPostId){u=`/api/posts/${currentEditingPostId}/edit`;fd.append("_method","PUT")}
const token=document.querySelector('meta[name="csrf-token"]')?.content||"";const req=()=>{return new Promise((res,rej)=>{const x=new XMLHttpRequest();x.open(m,u,!0);x.setRequestHeader("X-CSRF-TOKEN",token);x.setRequestHeader("X-Requested-With","Zigry-Ajax");x.upload.onprogress=(ev)=>{if(ev.lengthComputable){const pct=(ev.loaded/ev.total)*100;document.querySelectorAll(".upload-progress .progress-bar").forEach((b)=>{b.style.width=pct+"%"})}};x.onload=()=>{if(x.status>=200&&x.status<300){try{const json=JSON.parse(x.responseText);res({ok:!0,data:json})}catch(e){rej(new Error("Invalid JSON response"))}}else{let errObj;try{errObj=JSON.parse(x.responseText)}catch(e){errObj={message:x.statusText}}
res({ok:!1,data:errObj})}};x.onerror=()=>rej(new Error("Network Error"));x.send(fd)})};const r=await req();const d=r.data;if(r.ok){zigry.toast(d.alert||(currentEditingPostId?"Post updated successfully!":"Post created successfully!"),"success",);if(currentEditingPostId){const card=document.querySelector(`.card[data-post-id="${currentEditingPostId}"]`,);if(card){const cnt=card.querySelector(".content");if(cnt){let html=txt.replace(/\n/g,"<br>");if(loc&&loc.dataset.coords){html+=`<div class="small text-muted mt-1">${loc.textContent}</div>`}
if(!prev.classList.contains("d-none")){html+=`<div class="mt-2">${prev.innerHTML}</div>`}
cnt.innerHTML=html}}}
cancelPost();if(!currentEditingPostId){renderPosts(d.items,"prepend");initApp()}}else{zigry.alert({title:"Error",message:d.message||(currentEditingPostId?"Failed to update post.":"Failed to create post."),type:"error",})}}catch(e){console.error(e);zigry.alert({title:"Error",message:"Something went wrong.",type:"error",})}finally{zigry.loader(!1)}}
window.openEditComposer=function(id,h,p="public",mj=null){const ed=document.getElementById("richPostEditor");const ps=document.getElementById("privacySelect");currentEditingPostId=id;if(ed)ed.innerHTML=h||"";if(ps)ps.value=p||"public";const btn=document.getElementById("postSubmitBtn");if(btn)btn.textContent="Update";if(mj){try{const m=typeof mj==="string"?JSON.parse(mj):mj;selectedMediaFiles=[];const prev=document.getElementById("mediaPreview");if(prev)prev.innerHTML="";const add=(u,t,isVid=!1)=>{const idStr="exist_"+Date.now()+Math.random().toString(36).substr(2,9);selectedMediaFiles.push({file:null,uid:idStr,url:u,type:isVid?"video/mp4":"image/jpeg",});const isFullUrl=typeof u==="string"&&(u.startsWith("http://")||u.startsWith("https://"));const s=isVid?(isFullUrl?u:`/api/video/stream?path=${encodeURIComponent(u)}`):u;const markup=isVid?`<video controls class="object-fit-cover" height="100px"><source src="${s}"></video>`:`<img src="${u}" class="object-fit-cover" height="100px">`;const item=document.createElement("div");item.classList.add("preview-item");item.dataset.uid=idStr;item.innerHTML=`${markup}<div class="remove-btn" onclick="removePreview(this)">✖</div>`;prev.appendChild(item)};if(m.images)m.images.forEach((i)=>add(i.thumb,"image"));if(m.videos)m.videos.forEach((v)=>add(v.url,"video",!0));if(selectedMediaFiles.length>0){renderAddMoreTile();setTimeout(()=>applyCollage(),50)}}catch(err){console.error("Error parsing media for edit:",err)}}else{selectedMediaFiles=[];const prev=document.getElementById("mediaPreview");if(prev)prev.innerHTML="";renderAddMoreTile()}
togglePostBox(!0);ed?.focus()};document.addEventListener("change",function(ev){if(ev.target&&ev.target.id==="mediaInput"){if(ev._mediaInputHandled)return;ev._mediaInputHandled=!0;handleMediaPreviewChange.call(ev.target)}});document.addEventListener("dragover",function(ev){const ed=document.getElementById("richPostEditor");if(ev.target===ed||ed?.contains(ev.target)){ev.preventDefault();ed.classList.add("drag-active")}});document.addEventListener("dragleave",function(ev){const ed=document.getElementById("richPostEditor");if(ev.target===ed||ed?.contains(ev.target)){ed.classList.remove("drag-active")}});document.addEventListener("drop",function(ev){const ed=document.getElementById("richPostEditor");if(ev.target===ed||ed?.contains(ev.target)){ev.preventDefault();ed.classList.remove("drag-active");if(ev.dataTransfer.files&&ev.dataTransfer.files.length>0){processMediaFiles(ev.dataTransfer.files)}}});async function compressImage(f,opts={}){const{maxSize:maxS=200*1024,maxDimension:maxD=1920}=opts;if(!f.type.startsWith("image/")){return f}
return new Promise((res,rej)=>{const r=new FileReader();r.readAsDataURL(f);r.onerror=rej;r.onload=(ev)=>{const i=new Image();i.src=ev.target.result;i.onerror=rej;i.onload=()=>{let{width:w,height:h}=i;if(w>maxD||h>maxD){if(w>h){h=Math.round((h*maxD)/w);w=maxD}else{w=Math.round((w*maxD)/h);h=maxD}}
const c=document.createElement("canvas");c.width=w;c.height=h;const context=c.getContext("2d");context.drawImage(i,0,0,w,h);c.toBlob((b)=>{if(b.size<=maxS){res(new File([b],f.name,{type:"image/jpeg",lastModified:Date.now(),}),)}else{c.toBlob((fb)=>res(new File([fb],f.name,{type:"image/jpeg",lastModified:Date.now(),}),),"image/jpeg",0.7,)}},"image/jpeg",0.9,)}}})}
async function processMediaFiles(fls){const prev=document.getElementById("mediaPreview");if(!prev)return;const arr=fls instanceof FileList?Array.from(fls):fls;const items=arr.slice(0,20-selectedMediaFiles.length);for(const orig of items){if(!orig)continue;const isDuplicate=selectedMediaFiles.some((item)=>item.file&&item.file.name===orig.name&&item.file.size===orig.size&&item.file.lastModified===orig.lastModified);if(isDuplicate)continue;let f=orig;let src="";const isVid=f.type.startsWith("video");if(isVid){try{const tf=await zigry.generateVideoThumbnail(f);if(tf&&(tf instanceof Blob||tf instanceof File)){src=await new Promise((res)=>{const r=new FileReader();r.onload=(ev)=>res(ev.target.result);r.readAsDataURL(tf)})}else{src=tf}}catch(err){console.error("Thumbnail generation failed",err);src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiPjxwb2x5Z29uIHBvaW50cz0iMjMgNyAxNiAxMiAyMyAxNyAyMyA3Ii8+PHJlY3QgeD0iMSIgeT0iNSIgd2lkdGg9IjE1IiBoZWlnaHQ9IjE0IiByeD0iMiIvPjwvc3ZnPg=="}}else{f=await compressImage(orig);src=await new Promise((res)=>{const r=new FileReader();r.onload=(ev)=>res(ev.target.result);r.readAsDataURL(f)})}
const id=`${Date.now()}_${Math.random().toString(36).slice(2)}`;selectedMediaFiles.push({file:orig,uid:id});const el=document.createElement("div");el.classList.add("preview-item");el.dataset.uid=id;el.style.width="100px";el.style.width="48%";el.style.aspectRatio="1/1";el.style.overflow="hidden";el.style.position="relative";el.className="preview-item m-1 d-inline-block rounded overflow-hidden";el.style.width="120px";el.style.height="120px";const markup=`<img src="${src}" class="w-100 h-100 object-fit-cover" style="display:block;">`;const pHtml=`
                <div class="upload-progress d-none" style="position:absolute;bottom:0;left:0;width:100%;height:4px;background:rgba(255,255,255,0.5);">
                    <div class="progress-bar" style="width:0%;height:100%;background:#0d6efd;transition:width 0.2s;"></div>
                </div>
            `;const pIcon=isVid?`<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 16 16" style="filter:drop-shadow(0 0 2px rgba(0,0,0,0.5));"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814l-3.5-2.5z"/></svg></div>`:"";el.innerHTML=`${markup}${pIcon}${pHtml}<div class="remove-btn" onclick="removePreview(this)" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.5); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px;">✖</div>`;const tile=document.getElementById("addMoreTile");if(tile){prev.insertBefore(el,tile)}else{prev.appendChild(el)}}
if(items.length>0){renderAddMoreTile();setTimeout(()=>applyCollage(),50)}
const inp=document.getElementById("mediaInput");if(inp)inp.value=""}
async function handleMediaPreviewChange(){const fls=this.files||[];await processMediaFiles(fls)}
function removePreview(el){const it=el.parentElement;const id=it?.dataset?.uid;if(id){selectedMediaFiles=selectedMediaFiles.filter((item)=>item.uid!==id)}
it.remove();renderAddMoreTile();setTimeout(()=>applyCollage(),50)}
function renderAddMoreTile(){const prev=document.getElementById("mediaPreview");if(!prev)return;const ex=document.getElementById("addMoreTile");const cnt=Math.max(selectedMediaFiles.length,prev.querySelectorAll(".preview-item:not(#addMoreTile)").length,);if(cnt<=0){if(ex)ex.remove();return}
if(cnt>=20){if(ex)ex.remove();return}
const el=ex||document.createElement("div");el.id="addMoreTile";el.className="preview-item d-flex align-items-center justify-content-center border border-solid";el.style.cursor="pointer";el.textContent="+ More";el.onclick=()=>{const c=Math.max(selectedMediaFiles.length,prev.querySelectorAll(".preview-item:not(#addMoreTile)").length,);if(c>=20)return;document.getElementById("mediaInput")?.click()};if(!ex)prev.appendChild(el);}
function applyCollage(){const fn=()=>{const prev=document.getElementById("mediaPreview");if(!prev)return;const list=Array.from(prev.querySelectorAll(".preview-item:not(#addMoreTile)"),);list.forEach((el)=>{const o=el.querySelector(".more-overlay");if(o)o.remove();el.style.display=""});if(list.length<=4)return;const rem=list.length-4;list.slice(4).forEach((el)=>{el.style.display="none"});const lastEl=list[3];if(!lastEl)return;if(!lastEl.classList.contains("position-relative")){lastEl.classList.add("position-relative")}
const oEl=document.createElement("div");oEl.className="more-overlay";oEl.textContent=`+${rem}`;lastEl.appendChild(oEl)};if(window.requestAnimationFrame)requestAnimationFrame(fn);else setTimeout(fn,0)}
function setEditorColor(c){const ed=document.getElementById("richPostEditor");ed.style.background=c;ed.style.color=getContrastColor(c)}
function getContrastColor(h){const c=h.replace("#","").match(/.{1,2}/g).map((x)=>parseInt(x,16));const b=(c[0]*299+c[1]*587+c[2]*114)/1000;return b>150?"#000":"#fff"}
function debounce(fn,d){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),d)}}
let editing=!1;let dragging=!1;let startY=0;let startPercent=0;let hasChanged=!1;document.addEventListener("click",(ev)=>{const t=ev.target.closest("[id]")||ev.target;if(t&&t.id==="editCoverBtn"){editing=!0;const prev=document.getElementById("coverPreview");const wrap=document.getElementById("coverWrapper");const eBtn=document.getElementById("editCoverBtn");const sBtn=document.getElementById("saveCoverBtn");const uBtn=document.getElementById("uploadImageBtn");eBtn&&eBtn.classList.add("d-none");sBtn&&sBtn.classList.remove("d-none");uBtn&&uBtn.classList.remove("d-none");if(wrap){wrap.classList.remove("zigry-images")}
if(prev){prev.style.cursor="grab";prev.style.position="relative"}}
if(t&&t.id==="saveCoverBtn"){const wrap=document.getElementById("coverWrapper");const prev=document.getElementById("coverPreview");const eBtn=document.getElementById("editCoverBtn");const sBtn=document.getElementById("saveCoverBtn");const uBtn=document.getElementById("uploadImageBtn");editing=!1;dragging=!1;const frm=wrap?.closest("form");sBtn&&sBtn.classList.add("d-none");uBtn&&uBtn.classList.add("d-none");eBtn&&eBtn.classList.remove("d-none");if(wrap&&prev&&prev.dataset.url){wrap.classList.add("zigry-images")}}
if(t&&t.id==="uploadImageBtn"){const uInput=document.getElementById("coverUpload");uInput&&uInput.click()}});document.addEventListener("change",(ev)=>{const t=ev.target;if(!t||t.id!=="coverUpload")return;const f=t.files&&t.files[0];if(!f)return;const prev=document.getElementById("coverPreview");const inp=document.getElementById("offsetYInput");const r=new FileReader();r.onload=(e)=>{if(prev){prev.src=e.target.result;prev.style.top="0px"}
if(inp)inp.value=0;hasChanged=!0};r.readAsDataURL(f)});document.addEventListener("mousedown",(ev)=>{const prev=document.getElementById("coverPreview");if(!prev||ev.target!==prev)return;if(!editing)return;dragging=!0;startY=ev.clientY;const m=prev.style.transform.match(/translateY\((-?\d+(?:\.\d+)?)%\)/);startPercent=m?parseFloat(m[1]):0;prev.style.cursor="grabbing";ev.preventDefault()});document.addEventListener("mousemove",(ev)=>{if(!dragging||!editing)return;const prev=document.getElementById("coverPreview");const wrap=document.getElementById("coverWrapper");const inp=document.getElementById("offsetYInput");if(!prev||!wrap)return;const dy=ev.clientY-startY;const ih=prev.clientHeight;let np=startPercent+(dy/ih)*100;const sc=prev.clientWidth/prev.naturalWidth;const fih=prev.naturalHeight*sc;const wh=wrap.clientHeight;const ov=fih-wh;const minO=Math.min(0,-(ov/fih)*100);const maxO=Math.max(0,(ov/fih)*0);np=Math.max(minO,Math.min(maxO,np));prev.style.transform=`translateY(${np}%)`;if(inp)inp.value=np;hasChanged=!0});document.addEventListener("mouseup",()=>{const prev=document.getElementById("coverPreview");dragging=!1;if(editing&&prev)prev.style.cursor="grab"});function applyOffsetFromInput(){const inp=document.getElementById("offsetYInput");const pct=parseFloat(inp?.value);if(!isNaN(pct)){coverPreview.style.transform=`translateY(${pct}%)`}}
window.addEventListener("resize",applyOffsetFromInput);const editBtn=document.getElementById("editCoverBtn");editBtn?.addEventListener("click",()=>{editing=!0;coverPreview.style.cursor="grab";editBtn.classList.add("d-none");saveBtn.classList.remove("d-none");uploadBtn.classList.remove("d-none")});const coverUpload=document.getElementById("coverUpload");const uploadBtn=document.getElementById("uploadImageBtn");coverUpload?.addEventListener("change",(ev)=>{const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=(e)=>{coverPreview.src=e.target.result;coverPreview.style.top="0px";offsetYInput.value=0;hasChanged=!0};r.readAsDataURL(f)});const coverWrapper=document.getElementById("coverWrapper");const form=coverWrapper?.closest("form");form?.addEventListener("submit",(ev)=>{if(!hasChanged){ev.preventDefault();zigry.alert({title:"Info",message:"No changes to save.",type:"info",})}});let img=new Image();let ctx=null;let zoom=1;let offsetX=0;let offsetY=0;let cropDragging=!1;let cropStartX=0;let cropStartY=0;let originalProfileSrc;function initCropCanvas(){const c=document.getElementById("cropCanvas");if(c&&!ctx){ctx=c.getContext("2d")}
return c}
function openCropModal(){const mEl=document.getElementById("cropModal");if(!mEl)return;initCropCanvas();attachCanvasEvents();attachZoomEvents();try{if(window.bootstrap&&typeof window.bootstrap.Modal==="function"){const bsModal=new window.bootstrap.Modal(mEl);bsModal.show();return}}catch(err){}
mEl.classList.add("show");mEl.style.display="block";mEl.removeAttribute("aria-hidden");mEl.setAttribute("aria-modal","true");mEl.focus&&mEl.focus()}
function handleProfilePicChange(ev){const f=ev.target.files[0];if(!f)return;const cvs=initCropCanvas();if(!cvs||!ctx)return;const prev=document.getElementById("profile-preview");if(prev&&!originalProfileSrc){originalProfileSrc=prev.src||prev.style.backgroundImage?.replace(/url\(["']?|["']?\)/g,"")}
const r=new FileReader();r.onload=()=>{img.onload=()=>{zoom=1;offsetX=0;offsetY=0;cvs.width=250;cvs.height=250;const sx=cvs.width/img.width;const sy=cvs.height/img.height;zoom=Math.max(sx,sy);const sw=img.width*zoom;const sh=img.height*zoom;offsetX=(cvs.width-sw)/2;offsetY=(cvs.height-sh)/2;drawImage();updateCrop();openCropModal()};img.src=r.result};r.readAsDataURL(f);ev.target.value=null}
const profile_pic=document.getElementById("profile_pic");if(profile_pic){profile_pic.addEventListener("change",handleProfilePicChange)}
document.addEventListener("change",function(ev){if(ev.target&&ev.target.id==="profile_pic"){handleProfilePicChange(ev)}});function drawImage(){const cvs=document.getElementById("cropCanvas");if(!cvs||!ctx)return;const sz=cvs.width;ctx.clearRect(0,0,sz,sz);const sw=img.width*zoom;const sh=img.height*zoom;ctx.drawImage(img,offsetX,offsetY,sw,sh)}
function attachCanvasEvents(){const cvs=initCropCanvas();if(!cvs)return;if(cvs._hasEvents)return;cvs._hasEvents=!0;cvs.addEventListener("mousedown",(ev)=>{cropDragging=!0;cropStartX=ev.offsetX-offsetX;cropStartY=ev.offsetY-offsetY});cvs.addEventListener("mousemove",(ev)=>{if(!cropDragging)return;offsetX=ev.offsetX-cropStartX;offsetY=ev.offsetY-cropStartY;drawImage()});cvs.addEventListener("mouseup",()=>{cropDragging=!1;updateCrop()});cvs.addEventListener("mouseleave",()=>(cropDragging=!1))}
let cropDebounceTimer;function attachZoomEvents(){const cvs=initCropCanvas();if(!cvs||cvs._hasZoom)return;cvs._hasZoom=!0;cvs.addEventListener("wheel",(ev)=>{ev.preventDefault();const r=cvs.getBoundingClientRect();const cx=ev.clientX-r.left;const cy=ev.clientY-r.top;const pz=zoom;const zf=0.1;if(ev.deltaY<0){zoom*=1+zf}else{zoom*=1-zf}
zoom=Math.max(0.2,Math.min(5,zoom));const sc=zoom/pz;const ix=cx-offsetX;const iy=cy-offsetY;offsetX-=ix*(sc-1);offsetY-=iy*(sc-1);drawImage();clearTimeout(cropDebounceTimer);cropDebounceTimer=setTimeout(updateCrop,200)},{passive:!1},)}
if(document.getElementById("cropModal")){attachCanvasEvents();attachZoomEvents()}
function updateCrop(){const cvs=document.getElementById("cropCanvas");if(!cvs||!ctx)return;const data=cvs.toDataURL("image/jpeg");const cInp=document.getElementById("cropped_image_data");if(cInp)cInp.value=data;const wrap=document.getElementById("profile-preview");if(wrap){if(wrap.tagName==="IMG"){wrap.src=data}else{wrap.style.backgroundImage=`url(${data})`;wrap.style.backgroundSize="cover";wrap.style.backgroundPosition="center"}}
const dpEl=document.getElementById("dpupdate");if(dpEl){const id=dpEl.getAttribute("uid");if(id){document.querySelectorAll("."+id).forEach((e)=>dpupdate(e,data))}}}
function dpupdate(e,s){if(e.tagName==="IMG"){e.src=s}else{e.style.backgroundImage=`url(${s})`}}
function dataURItoBlob(uri){const bs=atob(uri.split(",")[1]);const mime=uri.split(",")[0].split(":")[1].split(";")[0];const buf=new ArrayBuffer(bs.length);const arr=new Uint8Array(buf);for(let i=0;i<bs.length;i++){arr[i]=bs.charCodeAt(i)}
return new Blob([buf],{type:mime})}
document.addEventListener("click",(ev)=>{if(ev.target&&ev.target.id==="CropCancelBtn"){const prev=document.getElementById("profile-preview");if(prev&&originalProfileSrc){if(prev.tagName==="IMG"){prev.src=originalProfileSrc}else{prev.style.backgroundImage=`url(${originalProfileSrc})`}}
zoom=1;offsetX=0;offsetY=0;originalProfileSrc=null}
if(ev.target&&ev.target.id==="modalSaveBtn"){document.activeElement&&document.activeElement.blur();const modalEl=document.getElementById("cropModal");let isClosed=!1;try{if(window.bootstrap&&typeof window.bootstrap.Modal==="function"){let bm=window.bootstrap.Modal.getInstance(modalEl);if(!bm)bm=new window.bootstrap.Modal(modalEl);bm.hide();isClosed=!0}}catch(err){}
if(!isClosed&&modalEl){modalEl.classList.remove("show");modalEl.style.display="none";modalEl.setAttribute("aria-hidden","true")}
const frm=document.getElementById("uploadForm");const cData=document.getElementById("cropped_image_data");if(frm&&cData&&cData.value){setTimeout(()=>{const evt=new Event("submit",{bubbles:!0,cancelable:!0,});frm.dispatchEvent(evt)},100)}else if(cData&&!cData.value){zigry.alert({title:"Warning",message:"Please crop an image first",type:"warning",})}}});let _activePreview=null;let _dragging=!1;let _startX=0;let _startScrollLeft=0;let _lastX=0;let _lastT=0;let _velocity=0;let _momentumRaf=null;document.addEventListener("mousedown",(ev)=>{const p=ev.target.closest("#mediaPreview");if(!p)return;_activePreview=p;_dragging=!0;_startX=ev.pageX-_activePreview.offsetLeft;_startScrollLeft=_activePreview.scrollLeft;_activePreview.style.cursor="grabbing";_lastX=ev.pageX;_lastT=performance.now();_velocity=0;document.body.style.userSelect="none";ev.preventDefault()});document.addEventListener("mouseleave",()=>{if(!_activePreview)return;endDragWithMomentum()});document.addEventListener("mouseup",()=>{if(!_activePreview)return;endDragWithMomentum()});document.addEventListener("mousemove",(ev)=>{if(!_dragging||!_activePreview)return;ev.preventDefault();const t=performance.now();const xa=ev.pageX;const x=xa-_activePreview.offsetLeft;const w=x-_startX;_activePreview.scrollLeft=_startScrollLeft-w;const dt=Math.max(1,t-_lastT);_velocity=(xa-_lastX)/dt;_lastX=xa;_lastT=t});document.addEventListener("touchstart",(ev)=>{const p=ev.target.closest("#mediaPreview");if(!p)return;_activePreview=p;_dragging=!0;const t=ev.touches[0];_startX=t.pageX-_activePreview.offsetLeft;_startScrollLeft=_activePreview.scrollLeft;_lastX=t.pageX;_lastT=performance.now();_velocity=0},{passive:!0},);document.addEventListener("touchmove",(ev)=>{if(!_dragging||!_activePreview)return;const t=ev.touches[0];const time=performance.now();const xa=t.pageX;const x=xa-_activePreview.offsetLeft;const w=x-_startX;_activePreview.scrollLeft=_startScrollLeft-w;const dt=Math.max(1,time-_lastT);_velocity=(xa-_lastX)/dt;_lastX=xa;_lastT=time},{passive:!0},);document.addEventListener("touchend",()=>{endDragWithMomentum()},{passive:!0},);function endDragWithMomentum(){if(!_activePreview)return;_dragging=!1;_activePreview.style.cursor="grab";document.body.style.userSelect="";const el=_activePreview;let vel=_velocity*16;const f=0.92;cancelAnimationFrame(_momentumRaf);const tick=()=>{if(Math.abs(vel)<0.1){_activePreview=null;return}
el.scrollLeft-=vel;vel*=f;_momentumRaf=requestAnimationFrame(tick)};_momentumRaf=requestAnimationFrame(tick)}
window.dataLayer=window.dataLayer||[];document.addEventListener("click",(ev)=>{const item=ev.target.closest("a, button, [data-action]");if(!item)return;dataLayer.push({event:item.dataset.action?"zig_action":"zig_click",action:item.dataset.action||null,text:(item.innerText||"").trim(),url:item.href||null,id:item.id||null,classes:item.className||null,post_id:item.closest("[data-post-id]")?.dataset.postId||null,})});document.addEventListener("click",(ev)=>{const i=ev.target.closest("img");if(!i)return;dataLayer.push({event:"zig_image_click",src:i.dataset.src||i.dataset.decryptedSrc,post_id:i.closest("[data-post-id]")?.dataset.postId||null,})});function trackForms(){document.querySelectorAll("form:not([data-tracked])").forEach((frm)=>{frm.dataset.tracked=1;frm.addEventListener("submit",()=>{dataLayer.push({event:"zig_form_submit",id:frm.id||null,action:frm.action,})})})}(()=>{let done={};window.addEventListener("scroll",()=>{let pct=Math.round((scrollY/(document.body.scrollHeight-innerHeight))*100,);[25,50,75,100].forEach((v)=>{if(!done[v]&&pct>=v){done[v]=1;dataLayer.push({event:"zig_scroll_depth",percent:v})}})})})();function trackPosts(){document.querySelectorAll("[data-post-id]:not([data-seen])").forEach((card)=>{card.dataset.seen=1;dataLayer.push({event:"zig_post_view",post_id:card.dataset.postId})})}
if(typeof window.trackAd==="function"){const origAd=window.trackAd;window.trackAd=function(cId,t){dataLayer.push({event:"zig_ad_event",campaign_id:cId,type:t});return origAd.apply(this,arguments)}}
function init(){trackForms();trackPosts()}
if(window.zigry&&typeof zigry.mount==="function"){const __mount=zigry.mount;zigry.mount=function(html,props){const r=__mount.call(this,html,props);init();return r}}
document.addEventListener("DOMContentLoaded",init);document.addEventListener("click",async(ev)=>{const b=ev.target.closest(".zigry-toggle-btn");if(!b)return;const act=b.getAttribute("data-action");if(!act)return;ev.preventDefault();zigry.loader(!0);const meta=document.querySelector('meta[name="csrf-token"]');const token=meta?.content??"";try{const res=await fetch(act,{method:"POST",headers:{"X-Requested-With":"Zigry-Ajax","X-CSRF-Token":token,},});const data=await res.json();if(data?.alert)
zalert(data.alert,data.type??"error",data.position??"top-right");if(data?.props)zigry.mount(null,data.props);zigry.loader(!1)}catch(e){console.error("Toggle failed",e);zigry.loader(!1);zalert("Action failed","error","center")}});document.addEventListener("DOMContentLoaded",()=>{const COOKIE_CONSENT_KEY="zigry_cookie_consent";const banner=document.getElementById("cookie-consent-banner");if(!banner)return;const acceptBtn=document.getElementById("cookie-consent-accept");const declineBtn=document.getElementById("cookie-consent-decline");function updateConsent(granted){window.dataLayer=window.dataLayer||[];dataLayer.push({event:"consent_update",analytics_storage:granted?"granted":"denied",ad_storage:granted?"granted":"denied",ad_user_data:granted?"granted":"denied",ad_personalization:granted?"granted":"denied",})}
function setConsentCookie(value){const expiry=new Date();expiry.setFullYear(expiry.getFullYear()+1);document.cookie=`${COOKIE_CONSENT_KEY}=${value}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;banner.classList.add("d-none")}
const existing=document.cookie.split("; ").find((c)=>c.startsWith(COOKIE_CONSENT_KEY+"="));if(existing){const val=existing.split("=")[1];updateConsent(val==="granted")}else{banner.classList.remove("d-none")}
acceptBtn?.addEventListener("click",()=>{updateConsent(!0);setConsentCookie("granted")});declineBtn?.addEventListener("click",()=>{updateConsent(!1);setConsentCookie("denied")})})