import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../apps/web/public/icons/evalot.svg',import.meta.url));
for(const size of [180,192,512])await sharp(source).resize(size,size).png().toFile(fileURLToPath(new URL('../apps/web/public/icons/evalot-'+size+'.png',import.meta.url)));
console.log('Generated Evalot app icons.');
