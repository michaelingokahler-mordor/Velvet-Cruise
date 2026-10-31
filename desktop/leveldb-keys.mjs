// Read only LevelDB table keys for origin discovery. Values stay opaque.
const MAX = 64 * 1024 * 1024;
function varint(bytes, cursor) {
  let value = 0, scale = 1;
  for (let i=0;i<10;i++) {
    if (cursor.at >= bytes.length) throw new Error('Truncated integer');
    const byte = bytes[cursor.at++]; value += (byte & 127) * scale;
    if (!(byte & 128)) return value;
    scale *= 128;
  }
  throw new Error('Invalid integer');
}
export function snappy(bytes) {
  const cursor = {at:0}, length = varint(bytes,cursor);
  if (length > MAX) throw new Error('Oversized table block');
  const out = Buffer.alloc(length); let written = 0;
  while (cursor.at < bytes.length && written < length) {
    const tag = bytes[cursor.at++], type = tag & 3;
    let count, offset;
    if (!type) {
      count = tag >>> 2;
      if (count < 60) count++;
      else { const n=count-59; count=0; for(let i=0;i<n;i++) count += bytes[cursor.at++] * 2**(8*i); count++; }
      if (cursor.at+count > bytes.length || written+count > length) throw new Error('Invalid literal');
      bytes.copy(out,written,cursor.at,cursor.at+count); cursor.at+=count; written+=count;
    } else {
      if (type===1) { count=4+((tag>>>2)&7); offset=((tag&224)<<3)|bytes[cursor.at++]; }
      if (type===2) { count=1+(tag>>>2); offset=bytes.readUInt16LE(cursor.at);cursor.at+=2; }
      if (type===3) { count=1+(tag>>>2); offset=bytes.readUInt32LE(cursor.at);cursor.at+=4; }
      if (!offset || offset>written || written+count>length) throw new Error('Invalid copy');
      for(let i=0;i<count;i++) { out[written]=out[written-offset];written++; }
    }
  }
  if (written!==length) throw new Error('Truncated compressed block');
  return out;
}
function entries(bytes) {
  if (bytes.length<4) throw new Error('Truncated table');
  const restarts=bytes.readUInt32LE(bytes.length-4), end=bytes.length-4*(restarts+1);
  if (end<0) throw new Error('Invalid restart table');
  const result=[], cursor={at:0}; let previous=Buffer.alloc(0);
  while(cursor.at<end) {
    const shared=varint(bytes,cursor), unique=varint(bytes,cursor), size=varint(bytes,cursor);
    if(shared>previous.length||cursor.at+unique+size>end) throw new Error('Invalid key entry');
    const key=Buffer.concat([previous.subarray(0,shared),bytes.subarray(cursor.at,cursor.at+unique)]);cursor.at+=unique;
    const value=bytes.subarray(cursor.at,cursor.at+size);cursor.at+=size;
    result.push({key,value});previous=key;
  }
  return result;
}
export function tableKeys(bytes) {
  if(bytes.length<48 || bytes.readBigUInt64LE(bytes.length-8)!==0xdb4775248b80fb57n) throw new Error('Not a LevelDB table');
  const cursor={at:bytes.length-48};varint(bytes,cursor);varint(bytes,cursor);
  const indexOffset=varint(bytes,cursor),indexSize=varint(bytes,cursor);
  const block=(offset,size)=>{
    if(size>MAX||offset+size+5>bytes.length) throw new Error('Invalid block handle');
    const data=bytes.subarray(offset,offset+size),compression=bytes[offset+size];
    if(compression===0)return data;if(compression===1)return snappy(data);throw new Error('Unknown compression');
  };
  const keys=[];
  for(const index of entries(block(indexOffset,indexSize))) {
    const handle={at:0},offset=varint(index.value,handle),size=varint(index.value,handle);
    for(const entry of entries(block(offset,size)))keys.push(entry.key);
  }
  return keys;
}
