'use strict';
// Dependency-free ZIP writer (store/uncompressed): appropriate for already-compressed web media.
const ZipPack=(()=>{
  const enc=new TextEncoder();
  const tbl=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;tbl[n]=c>>>0;}
  function crc(buf){let c=0xffffffff;for(const b of buf)c=tbl[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
  function buf(len){return new DataView(new ArrayBuffer(len));}
  function uint(dv){return new Uint8Array(dv.buffer);}
  async function zip(entries){
    if(entries.length>65535)throw new Error('Слишком много файлов для ZIP');
    const localParts=[],centerParts=[];let offset=0,centerSize=0;
    for(const f of entries){
      const name=enc.encode(f.name.replace(/^\/+/,''));
      const content=f.data instanceof Blob?await f.data.arrayBuffer():f.data instanceof Uint8Array?f.data:enc.encode(String(f.data));
      const bytes=content instanceof ArrayBuffer?new Uint8Array(content):content;
      const size=bytes.length,hash=crc(bytes);
      if(size>0xffffffff||offset+size+name.length+30>0xffffffff)throw new Error('Обновление слишком большое для ZIP. Загружай частями.');
      const l=buf(30);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);l.setUint32(14,hash,true);l.setUint32(18,size,true);l.setUint32(22,size,true);l.setUint16(26,name.length,true);
      const c=buf(46);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint32(16,hash,true);c.setUint32(20,size,true);c.setUint32(24,size,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
      localParts.push(uint(l),name,bytes);centerParts.push(uint(c),name);offset+=30+name.length+size;centerSize+=46+name.length;
    }
    const e=buf(22);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centerSize,true);e.setUint32(16,offset,true);
    return new Blob([...localParts,...centerParts,uint(e)],{type:'application/zip'});
  }
  return {zip};
})();
