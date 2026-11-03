(function(root){
  'use strict';
  function distance(a,b){
    if(!a||!b||!Number.isFinite(a.lat)||!Number.isFinite(a.lng)||!Number.isFinite(b.lat)||!Number.isFinite(b.lng))return null;
    const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad;
    const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }
  function closure(p,date){
    if(p.status==='closed')return '目前记录为关闭；重开须另行确认';
    if(p.closes_on&&date>=p.closes_on&&(!p.reopens_on||date<p.reopens_on))return '计划日期落在已公告关闭期';
    const c=(p.closures||[]).find(x=>date>=x.from&&(!x.to||date<=x.to));
    if(c)return c.note||'计划日期落在已公告临休期';
    const weekday=new Date(date+'T12:00:00Z').getUTCDay();
    if((p.closed_weekdays||[]).includes(weekday))return '计划日期为已记录的固定休息日（公共假日例外请另查）';
    return null;
  }
  function eligibility(p,opt){
    const reason=closure(p,opt.date);if(reason)return reason;
    if(p.route_eligible===false)return '仅供收藏研究，未纳入自动路线';
    if(p.transport_required==='ferry')return '需要渡轮，适合单独安排离岛行程';
    if(p.transport_required==='taxi')return '需要车辆，未纳入步行或公共交通自动路线';
    if(p.requires_booking&&!opt.booking)return '需提前预约';
    if(opt.mode==='walking'&&p.transport_required)return '需要交通接驳';
    if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return '尚未取得坐标，可按地址手动加入';
    return null;
  }
  function stats(places){
    let km=0,knownLegs=0;for(let i=1;i<places.length;i++){const d=distance(places[i-1],places[i]);if(d!==null){km+=d;knownLegs++;}}
    return {visitMinutes:places.reduce((s,p)=>s+(+p.visit_minutes||45),0),km,knownLegs,totalLegs:Math.max(places.length-1,0),approximate:places.some(p=>p.coordinates_quality==='approximate')};
  }
  function generate(places,station,opt){
    const associated=new Set(station?station.place_ids:[]), excluded=[];
    let pool=places.filter(p=>associated.has(p.id)&&(!opt.theme||p.category===opt.theme));
    pool=pool.filter(p=>{const reason=eligibility(p,opt);if(reason)excluded.push({id:p.id,reason});return !reason;});
    const chosen=[];let remaining=+opt.budget;const initialCount=pool.length;
    let position=station&&Number.isFinite(station.lat)?station:null;
    while(pool.length&&chosen.length<+opt.max){
      const used=new Set(chosen.map(x=>x.category));
      const options=pool.map(p=>{
        const km=distance(position,p), transfer=chosen.length?(opt.mode==='walking'?Math.max(7,(km||0)*20):20):position?Math.max(5,(km||0)*20):0;
        const visit=+p.visit_minutes||45;
        let score=(km===null?0:km)*4+(used.has(p.category)?5:0)+(p.category==='food'&&used.has('food')?12:0)+(p.status==='check_before_visit'?1:0);
        if(!chosen.length&&!opt.theme&&p.category==='culture')score-=1;
        return {p,km,transfer,visit,score};
      }).filter(x=>x.visit+x.transfer<=remaining&&(opt.mode!=='walking'||x.km===null||x.km<=3.5))
        .sort((a,b)=>a.score-b.score||a.visit-b.visit||a.p.id.localeCompare(b.p.id));
      if(!options.length)break;
      const pick=options[0];chosen.push(pick.p);remaining-=pick.visit+pick.transfer;position=pick.p;pool=pool.filter(p=>p.id!==pick.p.id);
    }
    return {ids:chosen.map(p=>p.id),excluded,initialCount,estimatedMinutes:Math.round(+opt.budget-remaining),stats:stats(chosen)};
  }
  function mapsLinks(places,station,mode){
    if(!places.length)return [];
    const dest=p=>p.name_en+', '+(p.address||'Singapore');
    let origin=station?station.name_en+' MRT Station, Singapore':dest(places[0]);
    let remaining=station?places:places.slice(1);
    if(!remaining.length)return [{label:'打开地点地图',url:places[0].maps_url||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(dest(places[0]))}];
    const links=[];
    if(mode==='transit'){
      remaining.forEach((p,i)=>{const q=new URLSearchParams({api:'1',origin,destination:dest(p),travelmode:'transit'});links.push({label:'交通第 '+(i+1)+' 段 → '+p.name_zh,url:'https://www.google.com/maps/dir/?'+q});origin=dest(p);});
    }else{
      while(remaining.length){const part=remaining.slice(0,4);remaining=remaining.slice(4);const q=new URLSearchParams({api:'1',origin,destination:dest(part[part.length-1]),travelmode:'walking'});if(part.length>1)q.set('waypoints',part.slice(0,-1).map(dest).join('|'));links.push({label:'Google Maps 步行导航'+(places.length>4?' · 第 '+(links.length+1)+' 段':''),url:'https://www.google.com/maps/dir/?'+q});origin=dest(part[part.length-1]);}
    }
    return links;
  }
  const api={distance,closure,eligibility,stats,generate,mapsLinks};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasRoutes=api;
})(typeof window==='object'?window:globalThis);
