(() => {
  const d = window.__IDLECOMBATZ__; d.advance(0);
  document.querySelector('#art-study')?.remove();
  const c = document.createElement('canvas'); c.id = 'art-study'; c.width = 1080; c.height = 900;
  c.style = 'position:fixed;inset:0;z-index:9999;width:1080px;height:900px;background:#25202f'; document.body.append(c);
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const rows = [['boss',0,1,2,3,4,5],['boss',6,10,8,9,10,11],['boss',12,13,14,15,16,17],['boss',18,19,20,21,22,23],['hero-extra',0,1,2,3,4,5],['skeleton-extra',0,1,2,3,4,5]];
  rows.forEach(([key,...frames],r) => frames.forEach((f,col) => {
    const tex = d.scene.textures.get(key+'-'+f).getSourceImage(); const scale = key === 'boss' ? 2 : 3;
    const x = col*180+90, foot = r*150+126;
    ctx.fillStyle = '#473b50'; ctx.fillRect(col*180,foot,180,1);
    ctx.drawImage(tex,x-tex.width*scale/2,foot-(key==='boss'?82:40)*scale,tex.width*scale,tex.height*scale);
    ctx.fillStyle='#d8c7dc';ctx.font='12px sans-serif';ctx.fillText(key+'-'+f,col*180+8,r*150+145);
  }));
  return 'Production texture contact sheet';
})()
