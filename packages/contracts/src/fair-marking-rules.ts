export const fairMarkingRules = [
  {
    "id": 1,
    "description": "Extra answers – mark all/best answers: Question asks for 4 points but student writes 10. Evaluate all and use the best 4 correct points, up to the question's maximum mark.",
    "protected": false
  },
  {
    "id": 2,
    "description": "Extra answers – first required only: Question asks for 4 points but student writes 10. Mark only the first 4 points and ignore the remaining 6.",
    "protected": false
  },
  {
    "id": 3,
    "description": "Multiple correct answers: Student gives more than one valid answer. Accept the valid answers, but never exceed the question's maximum marks.",
    "protected": false
  },
  {
    "id": 4,
    "description": "Cancelled answer: Student writes two answers and clearly cancels one. Ignore the cancelled answer and mark the remaining answer.",
    "protected": false
  },
  {
    "id": 5,
    "description": "Two uncancelled open answers: Student provides two different answers without cancelling either. Mark the highest-scoring valid answer.",
    "protected": false
  },
  {
    "id": 6,
    "description": "Disarranged working: Student's calculation, explanation, code, or steps are written out of order. Reconstruct the logical sequence before marking.",
    "protected": false
  },
  {
    "id": 7,
    "description": "Missing question number: Student gives an answer/solution but does not write the question number. Match it to the most likely question and mark it.",
    "protected": false
  },
  {
    "id": 8,
    "description": "Wrong question numbering: Student uses incorrect numbering but the answer clearly corresponds to another question. Correct the mapping before marking.",
    "protected": false
  },
  {
    "id": 9,
    "description": "Wrong section numbering: Example: actual Section B is Q11–15 but student labels it 1–5. Map B1–B5 to Q11–Q15.",
    "protected": false
  },
  {
    "id": 10,
    "description": "Continue numbering across wrong sections: Example: actual Section C is Q16–19 but student writes 6–9. Use section/context to map these to Q16–Q19.",
    "protected": false
  },
  {
    "id": 11,
    "description": "Equivalent wording: Student's wording is different from the marking guide but has the same correct meaning. Award the applicable marks.",
    "protected": false
  },
  {
    "id": 12,
    "description": "Alternative correct example: Student gives a different example from the marking guide, but the example is valid. Accept it.",
    "protected": false
  },
  {
    "id": 13,
    "description": "Alternative valid method: Student reaches/justifies the answer using a valid method different from the marking guide. Accept the method.",
    "protected": false
  },
  {
    "id": 14,
    "description": "Alternative valid theory: Student uses a sound theory or concept not explicitly listed in the guide. Award X% according to the configured rule.",
    "protected": false
  },
  {
    "id": 15,
    "description": "Correct process + wrong final answer: Student uses the correct method/process but makes an error in the final answer. Award X% of the available marks.",
    "protected": false
  },
  {
    "id": 16,
    "description": "Wrong process + correct final answer: Final answer is correct but the required process/working is wrong. Award X% of the available marks.",
    "protected": false
  },
  {
    "id": 17,
    "description": "Wrong process + wrong answer: Both method/process and final answer are incorrect. Give 0.",
    "protected": false
  },
  {
    "id": 18,
    "description": "Explanation required but only points given: Student gives correct highlights/bullet points without the required explanation. Award X%.",
    "protected": false
  },
  {
    "id": 19,
    "description": "Creativity required but logical answer given: Question expects creativity but student provides a relevant logical/structured answer. Award X%.",
    "protected": false
  },
  {
    "id": 20,
    "description": "Informal/course language: Student understands the concept but uses informal/classroom language instead of expected technical terminology. Award X%.",
    "protected": false
  },
  {
    "id": 21,
    "description": "Minor terminology/spelling errors: Meaning is clearly correct despite spelling or terminology mistakes. Do not remove marks unless language accuracy is being assessed.",
    "protected": false
  },
  {
    "id": 22,
    "description": "MCQ – two choices, one cancelled: Student selects two options but clearly cancels one. Mark only the remaining active option.",
    "protected": false
  },
  {
    "id": 23,
    "description": "MCQ – two active choices: Student selects two options and cancels neither. Give 0 for that question.",
    "protected": false
  },
  {
    "id": 24,
    "description": "MCQ – changed answer clearly indicated: Student changes an answer and clearly indicates the final selection. Mark the final selection.",
    "protected": false
  },
  {
    "id": 25,
    "description": "Partially correct answer: Student demonstrates some required knowledge but not enough for full marks. Award marks according to the marking guide.",
    "protected": false
  },
  {
    "id": 26,
    "description": "Correct concept, incomplete answer: Core idea is correct but required elements are missing. Award X% or marking-guide partial marks.",
    "protected": false
  },
  {
    "id": 27,
    "description": "Correct answer without required explanation: Student gives the correct final answer but question specifically requires explanation/justification. Award X%.",
    "protected": false
  },
  {
    "id": 28,
    "description": "Correct calculation without unit: Numerical answer is correct but required unit is missing/wrong. Award marks according to the configured rule/marking guide.",
    "protected": false
  },
  {
    "id": 29,
    "description": "Rounding difference: Student's answer differs only because of reasonable rounding. Accept within configured tolerance.",
    "protected": false
  },
  {
    "id": 30,
    "description": "Equivalent mathematical form: Accept mathematically equivalent answers, e.g. `1/2`, `0.5`, `50%`, where appropriate.",
    "protected": false
  },
  {
    "id": 31,
    "description": "Follow-through/error carried forward: Student makes an earlier error but correctly applies the resulting value in later working. Award configured follow-through marks.",
    "protected": false
  },
  {
    "id": 32,
    "description": "Correct answer with unnecessary extra information: Correct answer contains additional information that does not contradict it. Keep the applicable marks.",
    "protected": false
  },
  {
    "id": 33,
    "description": "Correct + contradictory statement: Student gives the correct answer but also writes a statement that contradicts it. Flag for review or apply configured rule.",
    "protected": false
  },
  {
    "id": 34,
    "description": "Answer written elsewhere: Student writes the answer in another page/space and clearly references or matches the question. Locate and mark it.",
    "protected": false
  },
  {
    "id": 35,
    "description": "Continuation on another page: Combine answer parts appearing across multiple captured pages before marking.",
    "protected": false
  },
  {
    "id": 36,
    "description": "Repeated answer: Same answer appears more than once for the same question. Do not award the same marking point twice.",
    "protected": false
  },
  {
    "id": 37,
    "description": "Duplicate point in list: Student repeats one point using different wording. Count it once unless the marking guide treats them as separate ideas.",
    "protected": false
  },
  {
    "id": 38,
    "description": "Blank question: No answer provided. Give 0.",
    "protected": false
  },
  {
    "id": 39,
    "description": "Completely incorrect answer: Answer has no valid marking point. Give 0.",
    "protected": false
  },
  {
    "id": 40,
    "description": "Illegible/uncertain handwriting: Do not guess. Mark the question Review Required for the teacher.",
    "protected": true
  },
  {
    "id": 41,
    "description": "Uncertain question mapping: Evalot cannot confidently determine which question an unnumbered answer belongs to. Send it to Review Required rather than guessing.",
    "protected": true
  },
  {
    "id": 42,
    "description": "Answer not in marking guide but potentially valid: Do not automatically reject it. Evaluate equivalence/logic and, when uncertain, send it for teacher review.",
    "protected": false
  },
  {
    "id": 43,
    "description": "Case-sensitive/exact wording requirement: Require exact terminology only when the teacher/question specifically requires it.",
    "protected": false
  },
  {
    "id": 44,
    "description": "Diagram/label alternative: Accept a correctly labelled diagram or visual response where it validly answers the question.",
    "protected": false
  },
  {
    "id": 45,
    "description": "Maximum-mark cap: Regardless of extra correct answers, a student can never receive more than the maximum marks assigned to the question.",
    "protected": true
  },
  {
    "id": 46,
    "description": "Teacher final authority: Teacher can review and change an AI-proposed mark. Changed marks receive an Edited label.",
    "protected": true
  },
  {
    "id": 47,
    "description": "Keep original paper evidence: Every AI mark remains linked to the original captured answer image for teacher verification.",
    "protected": true
  },
  {
    "id": 48,
    "description": "Explain partial marks: When Evalot gives X%/partial credit, show which rule was applied and how the mark was calculated.",
    "protected": true
  },
  {
    "id": 49,
    "description": "Respect marking-guide maximums: Marking rules may change *how* credit is awarded but cannot change the total marks defined by the assessment without teacher action.",
    "protected": true
  },
  {
    "id": 50,
    "description": "Low-confidence safety rule: When handwriting, answer mapping, equivalence, or marking is too uncertain, do not silently finalize the mark; flag it for teacher review.",
    "protected": true
  }
] as const;
