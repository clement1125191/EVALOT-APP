// Invented papers for checking local uploads. Contains no student data.
import sharp from 'sharp';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {mkdir,writeFile} from 'node:fs/promises';
const directory=new URL('../.data/demo/',import.meta.url);
await mkdir(directory,{recursive:true});
const sample=`<svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="1000" fill="white"/><g font-family="sans-serif" fill="#253e35"><text x="55" y="75" font-size="24">EVALOT DEMO PAPER</text><text x="55" y="115" font-size="16">Invented example - no real student data</text><text x="55" y="195" font-size="20">Student reference: DEMO-001</text><text x="55" y="270" font-size="19">Question 1. Define a noun and give an example.</text><text x="55" y="350" font-size="23">A noun names a person, place, thing or idea.</text><text x="55" y="395" font-size="23">For example: teacher, school, book.</text><path d="M55 430 H745 M55 475 H745 M55 520 H745" stroke="#d8e1dc"/></g></svg>`;
await writeFile(new URL('demo-student-paper.png',directory),await sharp(Buffer.from(sample)).png().toBuffer());
const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const page=pdf.addPage([595,842]);
page.drawText('EVALOT DEMO ASSESSMENT',{x:50,y:770,size:22,font});
page.drawText('Invented example - no real student data',{x:50,y:735,size:12,font});
page.drawText('English / S3 / Total: 10 marks',{x:50,y:690,size:16,font});
page.drawText('1. Define a noun and give an example. (10 marks)',{x:50,y:625,size:15,font});
await writeFile(new URL('demo-assessment.pdf',directory),await pdf.save());
console.log('Created .data/demo/demo-student-paper.png and demo-assessment.pdf');
