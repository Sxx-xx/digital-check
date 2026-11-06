(function(root){
 const KEY='digital-check:v1'; const labels={pending:'미확인',done:'완료',na:'해당 없음'};
 function clean(raw,ids){const out={};if(raw&&typeof raw==='object')for(const id of ids){const v=raw[id];if(v&&Object.hasOwn(labels,v.status))out[id]={status:v.status,updatedAt:typeof v.updatedAt==='string'?v.updatedAt:null};}return out;}
 function summary(items,state){let done=0,na=0;for(const i of items){if(state[i[0]]?.status==='done')done++;if(state[i[0]]?.status==='na')na++;}return {total:items.length,done,na,pending:items.length-done-na,percent:items.length?Math.round((done+na)/items.length*100):0};}
 const api={KEY,labels,clean,summary};root.CheckCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
