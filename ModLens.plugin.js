/**
 * @name ModLens
 * @author GOD3128
 * @version 0.4.8
 * @description Member inspector with copyable details, local notes, DM sharing and in-panel activity search.
 * @website https://hevn.cc
 */
module.exports = class ModLens {
  constructor() { this.api = new BdApi('ModLens'); this.overlay=null; this.observer=null; this.unpatch=null; this.activeUser=null; this.activeGuild=null; this.busy=false; this.logs=[]; this.activityRequest=0; }
  start() {
    this.unpatch = BdApi.ContextMenu.patch('user-context',(menu,props)=>{
      const id=props?.user?.id; if(!id)return;
      const item=BdApi.ContextMenu.buildItem({type:'text',label:'Open ModLens',action:()=>this.safeOpen(id,props.guildId||this.store('SelectedGuildStore')?.getGuildId())});
      if(Array.isArray(menu?.props?.children))menu.props.children.push(item);
      else if(menu?.props)menu.props.children=[menu.props.children,item].filter(Boolean);
    });
    this.observer=new MutationObserver(()=>this.decoratePopouts());
    this.observer.observe(document.body,{childList:true,subtree:true});
    this.decoratePopouts();
    BdApi.UI.showToast('ModLens v0.4.8 enabled',{type:'success'});
  }
  stop(){this.unpatch?.();this.observer?.disconnect();document.querySelectorAll('[data-modlens-button]').forEach(e=>e.remove());this.close();}
  store(name){try{return BdApi.Webpack.getStore(name)}catch{return null}}
  log(level,message){const entry={time:new Date().toLocaleString(),level,message:String(message)};this.logs.push(entry);if(this.logs.length>150)this.logs.shift();console.log('[ModLens]',level,message);}
  error(e){this.log('ERROR',e?.stack||e?.message||e);console.error('[ModLens]',e);BdApi.UI.showToast('ModLens: '+(e?.message||e),{type:'error'});}
  safeOpen(id,guild){try{this.open(id,guild)}catch(e){this.error(e)}}
  date(v){if(!v)return 'Unavailable';let d=new Date(v);return isNaN(d.getTime())?'Unavailable':d.toLocaleString()}
  created(id){try{return this.date(Number((BigInt(id)>>22n)+1420070400000n))}catch{return 'Unavailable'}}
  roles(guild,member){
    const ids=member?.roles||[];
    const s=this.store('GuildRoleStore');
    const g=guild?this.store('GuildStore')?.getGuild(guild):null;
    let map={};
    try { if(typeof s?.getRoles==='function')map=s.getRoles(guild)||{};
      else if(typeof s?.getGuildRoles==='function')map=s.getGuildRoles(guild)||{}; }catch(e){console.warn('[ModLens] Role store lookup failed',e)}
    const guildRoles=g?.roles||{};
    return ids.map(id=>{
      let r=map[id]||guildRoles[id];
      if(!r&&typeof s?.getRole==='function')try{r=s.getRole(guild,id)}catch{}
      if(!r&&typeof g?.getRole==='function')try{r=g.getRole(id)}catch{}
      return r?.name?{...r,id:String(r.id||id)}:{id:String(id),name:'Unknown role',unresolved:true};
    });
  }
  close(){this.activityRequest++;this.overlay?.remove();this.overlay=null;if(this.keyHandler)document.removeEventListener('keydown',this.keyHandler);this.keyHandler=null}
  node(tag,txt,parent,css){const e=document.createElement(tag);e.textContent=txt||'';if(css)e.style.cssText=css;parent?.append(e);return e}
  copy(value){BdApi.Native?.clipboard?.copy?.(String(value));if(!BdApi.Native?.clipboard?.copy){navigator.clipboard.writeText(String(value)).catch(e=>this.error(e));}BdApi.UI.showToast('Copied to clipboard',{type:'success'})}
  open(id,guildId){
    this.close();this.activeUser=id;this.activeGuild=guildId;
    const u=this.store('UserStore')?.getUser(id),m=guildId?this.store('GuildMemberStore')?.getMember(guildId,id):null;
    const g=guildId?this.store('GuildStore')?.getGuild(guildId):null;
    const roles=this.roles(guildId,m),name=u?.globalName||u?.global_name||u?.username||'Unknown';
    const rows=[['Display name',name],['Username',u?.username?'@'+u.username:'Unavailable'],['User ID',id],['Account created',this.created(id)],['Bot',u?(u.bot?'Yes':'No'):'Unavailable'],['Server',g?.name||'Unavailable'],['Server ID',guildId||'Unavailable'],['Nickname',m?(m.nick||'None'):'Unavailable'],['Joined',this.date(m?.joinedAt||m?.joined_at)],['Assigned roles',m?String(roles.length):'Unavailable'],['Roles',roles.map(r=>r.name).join(', ')||'None']];
    const overlay=this.node('div','',document.body,'position:fixed;inset:0;z-index:100000;background:#0009;display:flex;justify-content:flex-end');this.overlay=overlay;
    const panel=this.node('div','',overlay,'width:min(460px,100vw);height:100%;box-sizing:border-box;overflow:auto;background:#242126;color:#eee;padding:22px;font:13px Arial,sans-serif;box-shadow:-8px 0 30px #0008');
    const heading=(t)=>this.node('h3',t,panel,'margin:24px 0 12px;font-size:14px');
    const row=(label,value)=>{let e=this.node('div','',panel,'display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid #ffffff18;cursor:pointer');this.node('span',label,e,'color:#aaa');this.node('span',String(value),e,'text-align:right;overflow-wrap:anywhere');e.title='Click to copy '+label;e.onclick=()=>this.copy(value);return e};
    const button=(label,action,parent=panel)=>{let b=this.node('button',label,parent,'margin:5px 6px 5px 0;padding:9px 12px;border:0;border-radius:5px;background:#5865f2;color:white;cursor:pointer');b.onclick=()=>{try{Promise.resolve(action()).catch(e=>this.error(e))}catch(e){this.error(e)}};return b};
    const head=this.node('div','',panel,'display:flex;align-items:center;justify-content:space-between');this.node('strong','MODLENS',head,'font-size:21px');button('✕',()=>this.close(),head);
    this.node('p','Read-only Member Inspector · Click a detail to copy; click a role to copy its ID',panel,'color:#aaa');
    heading('Account');rows.slice(0,5).forEach(x=>row(...x));heading('Server Membership');rows.slice(5,10).forEach(x=>row(...x));
    heading('Roles');if(roles.length)roles.forEach(r=>{let chip=this.node('button',r.name,panel,'padding:7px 10px;margin:3px;background:#38343c;color:#eee;border:0;border-radius:5px;cursor:pointer');if(/^#[0-9a-f]{6}$/i.test(r.colorString||''))chip.style.borderLeft='3px solid '+r.colorString;chip.title='Click to copy role ID: '+r.id;chip.onclick=()=>this.copy(r.id)});else this.node('p',m?'No additional roles':'Role data unavailable',panel,'color:#aaa');
    heading('Moderation Information');row('Audit log','Not accessed');row('Join method','Unavailable');row('Verification','Unavailable');
    heading('Actions');button('DM User',()=>this.openDM(id));button('Share Info',()=>this.share(id,rows));button('Report Profile',()=>this.report(id));
    heading('Activity — ModLens Results');this.node('p','Search messages and attachments in this server, using Discord’s authenticated search endpoint. Results are limited to channels you can access. No messages are saved by ModLens.',panel,'color:#aaa;line-height:1.5');const activity=this.node('div','',panel,'margin:10px 0;padding:12px;background:#1b1a20;border:1px solid #ffffff20;border-radius:8px');this.node('div','Select a category to load results inside ModLens.',activity,'color:#aaa');button('Messages',()=>this.showActivity(id,guildId,'messages',activity));button('Images',()=>this.showActivity(id,guildId,'images',activity));button('Videos',()=>this.showActivity(id,guildId,'videos',activity));button('Files',()=>this.showActivity(id,guildId,'files',activity));
    heading('Private Local Notes');const key=(guildId||'global')+':'+id;const notes=this.node('textarea','',panel,'box-sizing:border-box;width:100%;min-height:110px;padding:10px;background:#17151a;color:#fff;border:1px solid #555;border-radius:6px');notes.value=BdApi.Data.load('ModLens',key)||'';notes.placeholder='Notes visible only on this computer';this.enableNotesPasteMenu(notes);button('Save Notes',()=>{BdApi.Data.save('ModLens',key,notes.value);BdApi.UI.showToast('Notes saved',{type:'success'})});
    button('Copy Full Report',()=>this.copy(rows.map(x=>x.join(': ')).join('\n')));
    button('Logs',()=>this.showLogs());
    const foot=this.node('div','',panel,'margin-top:24px;text-align:center');
    this.node('span','ModLens v0.4.8 · GOD3128 · ',foot,'color:#999;font-size:11px');
    const website=this.node('a','hevn.cc',foot,'color:#a9b8ff;font-size:11px;text-decoration:underline;cursor:pointer');
    website.href='https://hevn.cc';website.title='Open HEVN.CC in your browser';website.onclick=event=>{event.preventDefault();try{const shell=window.require?.('electron')?.shell;if(typeof shell?.openExternal==='function'){Promise.resolve(shell.openExternal('https://hevn.cc')).catch(e=>this.error(e));}else{window.open('https://hevn.cc','_blank','noopener,noreferrer');}}catch(e){this.error(e)}};
    overlay.addEventListener('mousedown',e=>{if(e.target===overlay)this.close()});this.keyHandler=e=>{if(e.key==='Escape')this.close()};document.addEventListener('keydown',this.keyHandler);
  }
  navigate(path){
    // Discord's navigation exports change frequently; use a verified fallback
    // rather than claiming that a missing internal API is a DM failure.
    for(const keys of [['transitionTo','replaceWith'],['transitionTo'],['navigateTo']]){
      try{
        const api=BdApi.Webpack.getByKeys(...keys);
        const fn=api?.transitionTo||api?.navigateTo;
        if(typeof fn==='function'){fn.call(api,path);return true;}
      }catch(e){console.warn('[ModLens] Navigation method failed',e)}
    }
    return false;
  }
  async openDM(id){
    // Only navigate to confirmed existing 1:1 DM channels.
    // Do not use openPrivateChannel: this Discord client opens a group composer.
    this.log('INFO','DM User requested for '+id);
    try {
      const store=this.store('ChannelStore');
      let channel=null;
      const found=typeof store?.getDMFromUserId==='function'?store.getDMFromUserId(id):null;
      if(typeof found==='string')channel=store?.getChannel?.(found);
      else if(found?.id)channel=found;
      if(!channel){
        const ids=this.store('PrivateChannelSortStore')?.getPrivateChannelIds?.()||[];
        channel=ids.map(cid=>store?.getChannel?.(cid)).find(c=>c?.type===1&&c.recipients?.includes(id));
      }
      if(!channel?.id || channel.type!==1 || !channel.recipients?.includes(id)){
        this.log('INFO','No existing one-to-one DM found; privacy status unknown');
        // Use the real Message control in the selected user's native profile.
        // Do not invoke openPrivateChannel: in this client it opens a GROUP composer.
        // Do not manufacture or send messages to probe privacy settings.
        const opened=this.clickNativeProfileMessage(id);
        if(opened){
          this.log('INFO','Clicked native profile Message control for '+id);
          this.close();
        }else{
          this.log('WARN','Native profile Message control not safely identifiable for '+id);
          await this.createOneToOneDM(id);
        }
        return;
      }
      this.log('INFO','Verified one-to-one DM channel: '+channel.id);
      const route='/channels/@me/'+channel.id;
      // Use an already-rendered Discord navigation link, not an unverified internal dispatcher.
      const links=[...document.querySelectorAll('a[href]')];
      const link=links.find(a=>{
        try {return new URL(a.href,location.href).pathname===route;}catch{return false;}
      });
      if(link){
        this.log('INFO','Navigating via Discord native DM sidebar link');
        this.close();
        link.click();
        return;
      }
      this.log('INFO','DM sidebar link not rendered; testing Electron external protocol handler');
      const url='discord://-/channels/@me/'+channel.id;
      try {
        if(typeof window.require!=='function')throw new Error('window.require unavailable');
        const shell=window.require('electron')?.shell;
        if(typeof shell?.openExternal!=='function')throw new Error('electron.shell.openExternal unavailable');
        this.log('INFO','Requesting Electron shell.openExternal for verified DM: '+url);
        await shell.openExternal(url);
        this.log('INFO','Electron shell.openExternal resolved; visually confirm Discord navigation');
        BdApi.UI.showToast('Electron accepted DM deep-link request. Check whether Discord opened the conversation.',{type:'info',timeout:7500});
      }catch(e){
        this.log('WARN','Electron DM deep-link failed: '+String(e?.message||e));
        BdApi.UI.showToast('Desktop DM navigation failed. See ModLens Logs.',{type:'warning',timeout:7500});
      }

    }catch(e){this.error(e)}
  }
  async createOneToOneDM(id){
    // Explicit DM User click only. Never send a message or invoke the group composer.
    if(!/^\d{15,22}$/.test(String(id))){
      this.log('WARN','DM creation refused: invalid user ID');
      return;
    }
    try{
      const actions=BdApi.Webpack.getModule?.(m=>typeof m?.ensurePrivateChannel==='function'&&typeof m?.getOrEnsurePrivateChannel==='function',{searchExports:true});
      if(typeof actions?.ensurePrivateChannel!=='function')throw new Error('Discord DM creation action unavailable');
      // We verified ensurePrivateChannel(userId) takes one argument and returns a channel ID.
      // A new DM is created only when the inspected user has no existing one-to-one DM.
      this.log('INFO','Requesting native one-to-one DM channel for '+id);
      const result=await actions.ensurePrivateChannel(id);
      const channelId=typeof result==='string'?result:result?.id;
      if(!/^\d{15,22}$/.test(String(channelId||'')))throw new Error('Discord returned no valid DM channel ID');
      const store=this.store('ChannelStore');
      let channel=store?.getChannel?.(channelId);
      // CHANNEL_CREATE dispatch should update the store synchronously, but give it a brief chance.
      if(!channel)await new Promise(resolve=>setTimeout(resolve,250));
      channel=store?.getChannel?.(channelId);
      if(channel?.type!==1||!Array.isArray(channel?.recipients)||channel.recipients.length!==1||!channel.recipients.includes(id)){
        this.log('WARN','DM creation returned channel '+channelId+' but membership/type verification failed; refusing navigation');
        BdApi.UI.showToast('Discord returned a channel, but ModLens could not verify the recipient. See Logs.',{type:'warning',timeout:8000});
        return;
      }
      this.log('INFO','New one-to-one DM verified: '+channelId+' for '+id);
      const shell=typeof window.require==='function'?window.require('electron')?.shell:null;
      if(typeof shell?.openExternal!=='function')throw new Error('Electron deep-link handler unavailable');
      const url='discord://-/channels/@me/'+channelId;
      await shell.openExternal(url);
      this.log('INFO','New DM deep link accepted by Electron; visually verify navigation');
      this.close();
      BdApi.UI.showToast('DM channel created. Check that Discord opened the conversation.',{type:'info',timeout:7000});
    }catch(e){
      this.log('WARN','New DM creation failed: '+String(e?.message||e));
      BdApi.UI.showToast('Could not open a new DM. See ModLens Logs; privacy status is unknown.',{type:'warning',timeout:8000});
    }
  }
  diagnoseDMCreation(){
    // Read-only signature inspection. Never call a DM creation function here.
    const wp=BdApi.Webpack;
    for(const name of ['ensurePrivateChannel','getOrEnsurePrivateChannel','getDMChannel','_openPrivateChannel']){
      try{
        const mod=wp.getModule?.(m=>typeof m?.[name]==='function',{searchExports:true});
        const fn=mod?.[name];
        if(typeof fn!=='function'){
          this.log('INFO','DM signature ['+name+']: unavailable');
          continue;
        }
        this.log('INFO','DM signature ['+name+']: function.length='+fn.length+', async='+(fn.constructor?.name==='AsyncFunction'));
        // Only print a bounded prefix of the function source; it may be minified.
        // Do not evaluate or invoke the source.
        const source=Function.prototype.toString.call(fn);
        const prefix=source.slice(0,480).replace(/\s+/g,' ');
        this.log('INFO','DM signature source ['+name+']: '+prefix+(source.length>480?' ... [truncated]':''));
      }catch(e){this.log('WARN','DM signature ['+name+'] inspection failed: '+String(e?.message||e))}
    }
    this.log('INFO','DM signatures inspected read-only; no DM creation action invoked');
  }
  diagnoseDesktopLink(){
    // Read-only capability checks. No URLs launched and no native methods called.
    const check=(name,fn)=>{
      try{this.log('INFO','Desktop probe ['+name+']: '+String(fn()))}
      catch(e){this.log('WARN','Desktop probe ['+name+'] failed: '+String(e?.message||e))}
    };
    check('window.require',()=>typeof window.require);
    check('global require',()=>typeof require);
    check('electron shell.openExternal',()=>{
      if(typeof window.require!=='function')return 'unavailable (no window.require)';
      const electron=window.require('electron');
      return typeof electron?.shell?.openExternal;
    });
    check('electron shell.openPath',()=>{
      if(typeof window.require!=='function')return 'unavailable (no window.require)';
      const electron=window.require('electron');
      return typeof electron?.shell?.openPath;
    });
    check('DiscordNative.window keys',()=>Object.keys(window.DiscordNative?.window||{}).slice(0,35).join(', ')||'none');
    check('DiscordNative.nativeModules keys',()=>Object.keys(window.DiscordNative?.nativeModules||{}).slice(0,35).join(', ')||'none');
    check('DiscordNative.process keys',()=>Object.keys(window.DiscordNative?.process||{}).slice(0,35).join(', ')||'none');
    this.log('INFO','Desktop capability inspection finished; no URL or native action launched');
  }
  diagnoseDMNavigation(route){
    // Read-only inspection. Do not call unverified internal router actions.
    try{
      const probes=[['transitionTo'],['transitionTo','replaceWith'],['navigateTo'],['transitionToGuild'],['replaceWith']];
      for(const keys of probes){
        let result='unavailable';
        try{
          const api=BdApi.Webpack.getByKeys(...keys);
          if(api)result=keys.map(k=>k+':'+typeof api[k]).join(', ');
        }catch(e){result='lookup error: '+String(e?.message||e)}
        this.log('INFO','Router probe ['+keys.join(', ')+']: '+result);
      }
      const candidates=[...document.querySelectorAll('a[href]')].filter(a=>{
        try{return new URL(a.href,location.href).pathname.startsWith('/channels/@me/')}catch{return false}
      });
      this.log('INFO','Rendered DM navigation links: '+candidates.length+'; target rendered: '+candidates.some(a=>{try{return new URL(a.href,location.href).pathname===route}catch{return false}}));
      // Search export objects as well as module roots. Discord sometimes nests
      // router functions in named exports, so getByKeys alone can miss them.
      const webpack=BdApi.Webpack;
      for(const key of ['transitionTo','replaceWith','navigateTo']){
        try{
          const match=webpack.getModule?.(exp=>typeof exp?.[key]==='function', {searchExports:true});
          const present=Boolean(match);
          this.log('INFO','Export search ['+key+']: '+(present?'candidate found (not invoked)':'no candidate'));
        }catch(e){this.log('WARN','Export search ['+key+'] failed: '+String(e?.message||e))}
      }
      const profileCount=document.querySelectorAll('[class*="userPopoutOuter"], [class*="userPopoutInner"], [class*="userPopout_"]').length;
      this.log('INFO','Native profile popout candidates: '+profileCount);
      this.log('INFO','Navigation probes are read-only; no unverified router function invoked');
    }catch(e){this.log('ERROR','Navigation diagnostic failed: '+String(e?.message||e))}
  }
  clickNativeProfileMessage(id){
    // Only click a Message action when its React-owned profile data matches the
    // inspected user. Never click a global New Message or group composer button.
    const popouts=[...document.querySelectorAll('[class*="userPopoutOuter"], [class*="userPopoutInner"], [class*="userPopout_"]')];
    for(const pop of popouts){
      let matched=false;
      for(let el=pop,depth=0;el&&depth<5&&!matched;el=el.parentElement,depth++){
        const key=Object.keys(el).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactProps$'));
        let fiber=key?el[key]:null;
        for(let i=0;fiber&&i<40;i++,fiber=fiber.return){
          const p=fiber.memoizedProps||fiber.pendingProps;
          if(String(p?.user?.id||p?.profile?.user?.id||p?.displayProfile?.user?.id||'')===String(id)){matched=true;break;}
        }
      }
      if(!matched)continue;
      const controls=[...pop.querySelectorAll('button,[role="button"]')];
      const message=controls.find(el=>{
        if(el.disabled||el.getAttribute('aria-disabled')==='true'||el.dataset.modlensButton)return false;
        const label=[el.getAttribute('aria-label'),el.getAttribute('title'),el.textContent].filter(Boolean).join(' ').trim();
        return /^(message|send message|direct message|message user)$/i.test(label);
      });
      if(message){message.click();return true;}
    }
    return false;
  }
  showLogs(){
    const wrap=document.createElement('div');wrap.style.cssText='position:fixed;inset:0;z-index:100010;background:#000b;display:grid;place-items:center';
    const box=document.createElement('div');box.style.cssText='width:min(650px,95vw);max-height:80vh;overflow:auto;padding:20px;background:#242126;color:#eee;border-radius:10px;box-shadow:0 12px 45px #0009';wrap.append(box);
    const title=this.node('h2','ModLens Diagnostic Logs',box,'font-size:18px');
    this.node('p','Local session only. Review logs before sharing: IDs and error details may be present.',box,'color:#aaa');
    const pre=this.node('pre',this.logs.map(x=>`[${x.time}] ${x.level}: ${x.message}`).join('\n')||'No events logged yet.',box,'white-space:pre-wrap;overflow-wrap:anywhere;background:#151318;padding:12px;border-radius:6px;max-height:45vh;overflow:auto');
    const button=(label,fn)=>{const b=this.node('button',label,box,'margin:8px 8px 0 0;padding:8px 12px;background:#5865f2;color:white;border:0;border-radius:5px;cursor:pointer');b.onclick=fn};
    button('Copy Logs',()=>this.copy(pre.textContent));button('Export Logs',()=>this.exportLogs());button('Clear Logs',()=>{this.logs=[];pre.textContent='No events logged yet.'});button('Close',()=>wrap.remove());
    wrap.addEventListener('mousedown',e=>{if(e.target===wrap)wrap.remove()});document.body.append(wrap);
  }
  exportLogs(){
    const content='ModLens v0.4.8 diagnostic logs\n'+this.logs.map(x=>`[${x.time}] ${x.level}: ${x.message}`).join('\n')+'\n';
    try{
      const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='ModLens-Logs-'+new Date().toISOString().replace(/[:.]/g,'-')+'.txt';
      document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);
      this.log('INFO','Log export requested (check Downloads)');
    }catch(e){this.log('WARN','Log export failed: '+String(e?.message||e));BdApi.UI.showToast('Export unavailable; use Copy Logs.',{type:'warning'})}
  }
  share(id,rows){
    const report='ModLens member report\n'+rows.map(x=>x.join(': ')).join('\n');
    this.copy(report);
    this.close();
    // The original action in this client opened Discord's group-message composer.
    // Keep it for Share Info ONLY, never for DM User.
    try{
      const api=BdApi.Webpack.getByKeys('openPrivateChannel');
      if(typeof api?.openPrivateChannel==='function'){
        api.openPrivateChannel(id);
        BdApi.UI.showToast('Choose your group recipients; report copied for manual paste.',{type:'info',timeout:7000});
        return;
      }
    }catch(e){console.warn('[ModLens] Group composer action failed',e)}
    if(this.navigate('/channels/@me')){
      BdApi.UI.showToast('Report copied. Use New Message to create your group DM.',{type:'info',timeout:7000});
    }else{
      BdApi.UI.showToast('Report copied. Open Direct Messages → New Message to create a group.',{type:'warning',timeout:7000});
    }
  }
  report(id){this.copy(id);BdApi.UI.showToast('User ID copied. Open their Discord profile → ⋯ → Report User (if available).',{type:'info',timeout:7000});}
  enableNotesPasteMenu(notes){
    notes.addEventListener('contextmenu',event=>{
      event.preventDefault();event.stopPropagation();
      document.querySelector('[data-modlens-notes-menu]')?.remove();
      const menu=document.createElement('div');menu.dataset.modlensNotesMenu='true';
      menu.style.cssText='position:fixed;z-index:100020;min-width:160px;padding:5px;background:#18191c;color:#eee;border:1px solid #555;border-radius:7px;box-shadow:0 8px 24px #0009';
      const item=document.createElement('button');item.type='button';item.textContent='Paste';
      item.style.cssText='width:100%;text-align:left;padding:9px 12px;background:transparent;color:inherit;border:0;border-radius:4px;cursor:pointer';
      menu.append(item);document.body.append(menu);
      menu.style.left=Math.max(0,Math.min(event.clientX,innerWidth-menu.offsetWidth-6))+'px';
      menu.style.top=Math.max(0,Math.min(event.clientY,innerHeight-menu.offsetHeight-6))+'px';
      const dismiss=()=>{menu.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true)};
      const outside=e=>{if(!menu.contains(e.target))dismiss()};const escape=e=>{if(e.key==='Escape')dismiss()};
      document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);
      item.addEventListener('click',async()=>{
        dismiss();
        let value,method='';
        const attempts=[
          ['Electron clipboard',()=>window.require?.('electron')?.clipboard?.readText?.()],
          ['Node Electron clipboard',()=>typeof require==='function'?require('electron')?.clipboard?.readText?.():undefined],
          ['DiscordNative clipboard',()=>window.DiscordNative?.clipboard?.readText?.()],
          ['BetterDiscord clipboard',()=>BdApi.Native?.clipboard?.readText?.()],
          ['Web clipboard',()=>navigator.clipboard?.readText?.()]
        ];
        for(const [name,read] of attempts){
          try{const result=await read();if(typeof result==='string'){value=result;method=name;break;}this.log('INFO','Notes clipboard '+name+': reader unavailable')}
          catch(e){this.log('INFO','Notes clipboard '+name+' unavailable: '+String(e?.message||e))}
        }
        if(typeof value==='string'&&notes.isConnected){
          const from=notes.selectionStart,to=notes.selectionEnd;
          notes.focus();notes.setRangeText(value,from,to,'end');notes.dispatchEvent(new Event('input',{bubbles:true}));
          this.log('INFO','Notes pasted via '+method+' (save required)');return;
        }
        this.log('WARN','Notes clipboard read unavailable; OS paste shortcut remains available');notes.focus();
        BdApi.UI.showToast('Clipboard access blocked. Use Ctrl+V in Notes.',{type:'warning',timeout:6500});
      });
    });
  }
  // Uses Discord's own authenticated HTTP client, never user tokens or external services.
  // The server enforces visibility and rate limits. No bulk channel scraping.
  getSearchHttp(){
    try{
      const mod=BdApi.Webpack.getModule?.(m=>m&&typeof m==='object'&&typeof m.get==='function'&&typeof m.post==='function'&&typeof m.put==='function'&&typeof m.patch==='function'&&typeof m.del==='function',{searchExports:true});
      if(mod&&typeof mod.get==='function')return mod;
    }catch(e){this.log('WARN','Activity HTTP discovery: '+String(e?.message||e))}
    return null;
  }
  async showActivity(id,guild,kind,host,offset=0){
    if(!host?.isConnected)return;
    const request=++this.activityRequest;
    host.replaceChildren();
    const names={messages:'Messages',images:'Images',videos:'Videos',files:'Files'};
    const label=names[kind]||'Messages';
    this.node('strong',label+' · Page '+(Math.floor(offset/10)+1),host,'display:block;margin-bottom:8px');
    const status=this.node('div','Loading from Discord…',host,'color:#aaa;padding:8px 0');
    if(!/^\d{15,22}$/.test(String(id))||!/^\d{15,22}$/.test(String(guild||''))){
      status.textContent='Select a user inside a server to search activity.';return;
    }
    const http=this.getSearchHttp();
    if(!http){
      status.textContent='Discord’s authenticated search client is unavailable in this build. No search was performed.';
      this.log('WARN','Activity search unavailable: authenticated Discord HTTP client not found');
      return;
    }
    const has={images:'image',videos:'video',files:'file'}[kind];
    const params={author_id:id,sort_by:'timestamp',sort_order:'desc',offset,include_nsfw:true};
    if(has)params.has=has;
    this.log('INFO','Activity request: '+label+' for '+id+' in guild '+guild+' offset='+offset);
    try{
      // This is Discord's native guild message-search endpoint. Discord decides
      // which messages the signed-in account is permitted to retrieve.
      const response=await http.get({url:'/guilds/'+guild+'/messages/search',query:params,rejectWithError:true});
      if(request!==this.activityRequest||!host.isConnected)return;
      const data=response?.body||response;
      if(!data||!Array.isArray(data.messages))throw new Error('Unexpected Discord search response shape');
      const matches=data.messages.flat().filter(m=>m&&String(m.author?.id)===String(id)&&String(m.guild_id||guild)===String(guild));
      const max=10;
      const visible=matches.slice(0,max);
      status.textContent=matches.length?'Showing '+visible.length+' of '+(Number.isFinite(data.total_results)?data.total_results+' matching messages':'matching messages')+' · Up to 10 results per page':'No matching results returned.';
      this.log('INFO','Activity results: '+label+' returned '+matches.length+' messages; total='+String(data.total_results??'unknown'));
      for(const m of visible){
        const item=this.node('div','',host,'margin:9px 0;padding:10px;border:1px solid #ffffff24;border-radius:7px;background:#26242d;overflow-wrap:anywhere');
        const channel=this.store('ChannelStore')?.getChannel?.(m.channel_id);
        const stamp=m.timestamp?new Date(m.timestamp).toLocaleString():'Date unavailable';
        this.node('div','#'+(channel?.name||m.channel_id)+' · '+stamp,item,'color:#aaa;font-size:11px;margin-bottom:6px');
        const excerpt=String(m.content||'').slice(0,650);
        if(excerpt)this.node('div',excerpt,item,'white-space:pre-wrap;line-height:1.5');
        const attachments=Array.isArray(m.attachments)?m.attachments:[];
        // One matching attachment per result card in filtered views.
        // This prevents a single message with many images/files from making the page
        // exceed the requested ten visible results. Other attachments remain
        // accessible using the original Discord message link.
        const filtered=kind==='images'?attachments.filter(a=>String(a.content_type||'').toLowerCase().startsWith('image/')||/\.(png|jpe?g|gif|webp|avif)$/i.test(String(a.filename||''))):kind==='videos'?attachments.filter(a=>String(a.content_type||'').toLowerCase().startsWith('video/')||/\.(mp4|mov|webm|mkv)$/i.test(String(a.filename||''))):kind==='files'?attachments:[];
        for(const att of filtered.slice(0,1)){
          const a=this.node('a',att.filename||'Attachment',item,'display:block;margin-top:6px;color:#a9b8ff;text-decoration:underline;cursor:pointer');
          // Only display links supplied by Discord over HTTPS.
          if(/^https:\/\//i.test(att.url||'')){a.href=att.url;a.target='_blank';a.rel='noopener noreferrer';}
          else a.removeAttribute('href');
          // Small, lazy-loaded thumbnails for image attachments only.
          // The image URLs are supplied by Discord; no media is downloaded or stored by ModLens.
          const imageUrl=String(att.proxy_url||att.url||'');
          const imageType=String(att.content_type||'').toLowerCase();
          const imageName=String(att.filename||'');
          if(/^https:\/\//i.test(imageUrl) && (imageType.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif)$/i.test(imageName))){
            const thumbnail=this.node('img','',item,'display:block;max-width:180px;max-height:130px;width:auto;height:auto;object-fit:contain;margin:7px 0 9px;border-radius:5px;background:#15141a');
            thumbnail.loading='lazy';
            thumbnail.alt='Image preview: '+imageName;
            thumbnail.referrerPolicy='no-referrer';
            thumbnail.onerror=()=>{thumbnail.remove();this.log('INFO','Image preview unavailable: '+imageName)};
            thumbnail.src=imageUrl;
          }
        }
        const jump=this.node('button','Open message in Discord',item,'display:block;margin-top:9px;padding:7px 9px;background:#5865f2;color:white;border:0;border-radius:5px;cursor:pointer');
        jump.onclick=async()=>{
          if(!/^\d{15,22}$/.test(String(m.channel_id))||!/^\d{15,22}$/.test(String(m.id)))return;
          try{
            const shell=window.require?.('electron')?.shell;
            if(typeof shell?.openExternal!=='function')throw new Error('Desktop link handler unavailable');
            await shell.openExternal('discord://-/channels/'+guild+'/'+m.channel_id+'/'+m.id);
            this.log('INFO','Activity message deep link requested: '+m.id);
          }catch(e){this.log('WARN','Open activity message failed: '+String(e?.message||e));BdApi.UI.showToast('Could not open message; see Logs.',{type:'warning'})}
        };
      }
      // Discord's search offset is a message-result offset, not an attachment offset.
      // Render at most ten message cards and one matching attachment per card.
      // Discord's API may return 25 results even with a ten-result page offset.
      const nav=this.node('div','',host,'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px');
      const page=Math.floor(offset/max)+1;
      if(offset>0){
        const prev=this.node('button','Load Previous Page',nav,'padding:9px 12px;border:0;border-radius:5px;background:#5865f2;color:white;cursor:pointer');
        prev.onclick=()=>this.showActivity(id,guild,kind,host,Math.max(0,offset-max));
      }
      this.node('span','Page '+page,nav,'color:#aaa;font-size:12px');
      const total=Number(data.total_results);
      const hasNext=matches.length>=max && (!Number.isFinite(total)||offset+max<total);
      if(hasNext){
        const next=this.node('button','Load Next Page',nav,'padding:9px 12px;border:0;border-radius:5px;background:#5865f2;color:white;cursor:pointer');
        next.onclick=()=>this.showActivity(id,guild,kind,host,offset+max);
      }

    }catch(e){
      if(request!==this.activityRequest||!host.isConnected)return;
      const statusCode=e?.status||e?.statusCode||e?.body?.code;
      this.log('WARN','Activity '+label+' search failed'+(statusCode?' ('+statusCode+')':'')+': '+String(e?.message||e));
      status.textContent='Discord search unavailable'+(statusCode?' (HTTP '+statusCode+')':'')+'. No messages were retrieved. See Logs.';
    }
  }
  // Best-effort profile popout integration. Never guess a user ID from visible text.
  decoratePopouts(){
    for(const pop of document.querySelectorAll('[class*="userPopoutOuter"], [class*="userPopoutInner"], [class*="userPopout_"]')){
      if(pop.querySelector('[data-modlens-button]'))continue;
      let id=null;
      // Discord stores the user object in React component props; the shape varies by client version.
      let el=pop;for(let depth=0;depth<4&&el&&!id;depth++,el=el.parentElement){const key=Object.keys(el).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactProps$'));let fiber=key?el[key]:null;for(let i=0;i<35&&fiber&&!id;i++,fiber=fiber.return){const p=fiber.memoizedProps||fiber.pendingProps;const candidate=p?.user?.id||p?.profile?.user?.id||p?.displayProfile?.user?.id;if(/^\d{16,22}$/.test(String(candidate||'')))id=String(candidate)}}
      if(!id)continue;
      const target=pop.querySelector('[class*="headerButtons"], [class*="profileButtons"], [class*="headerInner"], [class*="header_"]')||pop;
      const b=this.node('button','🛡 ModLens',target,'padding:6px 9px;margin:5px;background:#5865f2;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:12px');b.dataset.modlensButton='1';b.title='Open ModLens member inspector';b.onclick=e=>{e.stopPropagation();this.safeOpen(id,this.store('SelectedGuildStore')?.getGuildId())};
    }
  }
};
