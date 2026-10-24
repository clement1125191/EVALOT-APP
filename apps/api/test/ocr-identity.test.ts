import {it,expect} from 'vitest';
import type {OcrEvidence} from '@evalot/contracts';
import {identityFromFirstPage} from '../src/correction/ocr-identity';
const evidence=(texts:string[],confidence=.95)=>({pages:[{page:1,lines:texts.map(text=>({text,confidence}))}]} as OcrEvidence);
it('reads labelled name and registration without guessing from answers',()=>{expect(identityFromFirstPage(evidence(['Name: Alice Uwase','Reg No: REG-001']))).toMatchObject({name:'Alice Uwase',registration:'REG-001'});expect(identityFromFirstPage(evidence(['Alice Uwase','The answer is REG-001']))).toMatchObject({name:null,registration:null});});
it('ignores unclear or conflicting identity and other students on later pages',()=>{expect(identityFromFirstPage(evidence(['Name: Alice Uwase'],.4)).name).toBeNull();expect(identityFromFirstPage(evidence(['Name: Alice Uwase','Name: Brian Doe'])).name).toBeNull();const e=evidence(['Q1: Answer']);e.pages.push({...e.pages[0],page:2,lines:[{...e.pages[0].lines[0],text:'Name: Wrong Student'}]});expect(identityFromFirstPage(e).name).toBeNull();});
