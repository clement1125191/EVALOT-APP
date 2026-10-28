export const fairMarkingDefault = {
  "policy_id": "EVALOT_FAIR_MARKING_V1",
  "policy_name": "Evalot Fair Marking",
  "version": "1.0",
  "default": true,
  "core_principle": {
    "mode": "CREDIT_SEEKING_EVIDENCE_BASED",
    "description": "Award marks for every valid piece of knowledge, reasoning, process, method, example, explanation or result demonstrated by the student.",
    "zero_is_last_outcome": true,
    "never_invent_credit": true,
    "teacher_has_final_authority": true,
    "never_exceed_question_max_marks": true
  },
  "marking_priority": [
    "QUESTION_INSTRUCTION",
    "QUESTION_TYPE",
    "QUESTION_MAX_MARKS",
    "MARKING_GUIDE",
    "EXPECTED_ANSWER_COMPONENTS",
    "STUDENT_EVIDENCE",
    "VALID_ALTERNATIVES",
    "PARTIAL_CREDIT",
    "CONFIDENCE_CHECK"
  ],
  "question_instruction_rules": {
    "LIST": {
      "require_explanation": false,
      "award_per_valid_distinct_point": true
    },
    "STATE": {
      "require_explanation": false,
      "accept_concise_correct_answer": true
    },
    "DEFINE": {
      "match_required_concept_elements": true,
      "exact_wording_not_required": true
    },
    "EXPLAIN": {
      "require_point_and_development": true,
      "allow_partial_credit_for_correct_point_only": true
    },
    "DESCRIBE": {
      "require_relevant_characteristics_or_sequence": true,
      "allow_partial_credit": true
    },
    "COMPARE": {
      "evaluate_corresponding_comparisons": true,
      "allow_partial_credit": true
    },
    "DISCUSS": {
      "evaluate_relevant_points": true,
      "evaluate_development": true,
      "evaluate_argument_or_balance_when_required": true,
      "allow_partial_credit": true
    },
    "CALCULATE": {
      "evaluate_formula": true,
      "evaluate_substitution": true,
      "evaluate_working": true,
      "evaluate_final_answer": true,
      "evaluate_units_when_required": true,
      "allow_method_marks": true
    },
    "PROVE_SHOW": {
      "process_is_required": true,
      "final_answer_alone_not_sufficient": true,
      "allow_partial_credit": true
    },
    "JUSTIFY": {
      "reasoning_is_required": true,
      "allow_partial_credit": true
    },
    "DRAW_LABEL": {
      "evaluate_diagram": true,
      "evaluate_labels": true,
      "allow_partial_credit": true
    },
    "MCQ": {
      "partial_credit": false,
      "multiple_active_choices": "ZERO",
      "ignore_clearly_cancelled_choice": true
    }
  },
  "answer_matching": {
    "accept_equivalent_wording": true,
    "accept_synonyms_when_meaning_is_preserved": true,
    "accept_equivalent_mathematical_forms": true,
    "accept_valid_alternative_examples": true,
    "accept_valid_alternative_methods": true,
    "accept_valid_alternative_theories": true,
    "accept_correct_answer_not_explicitly_in_guide": true,
    "require_exact_wording_only_when_question_requires_it": true,
    "uncertain_alternative_answer_action": "TEACHER_REVIEW"
  },
  "partial_credit": {
    "enabled": true,
    "preferred_method": "MARKING_GUIDE_COMPONENTS",
    "rule": "Award marks for demonstrated correct components instead of applying an arbitrary percentage whenever the marking guide provides component marks.",
    "correct_process_wrong_final_answer": {
      "award_earned_method_marks": true,
      "final_answer_marks": 0
    },
    "correct_final_answer_wrong_process": {
      "award_supported_marks": true,
      "do_not_assume_full_marks": true,
      "respect_process_requirement": true
    },
    "partially_correct_answer": {
      "award_valid_components": true
    },
    "correct_concept_incomplete_answer": {
      "award_demonstrated_components": true
    },
    "correct_points_without_required_explanation": {
      "award_point_marks": true,
      "withhold_missing_explanation_marks": true
    },
    "wrong_process_wrong_answer": {
      "search_for_other_valid_components_first": true,
      "if_no_valid_component": "ZERO"
    },
    "fallback_when_guide_has_no_component_breakdown": {
      "action": "AI_REASONED_PARTIAL_CREDIT",
      "require_explanation": true,
      "low_confidence_action": "TEACHER_REVIEW"
    }
  },
  "calculation_rules": {
    "award_formula_marks": true,
    "award_substitution_marks": true,
    "award_method_marks": true,
    "award_intermediate_working_marks": true,
    "award_final_answer_marks": true,
    "award_unit_marks_when_required": true,
    "error_carried_forward": {
      "enabled": true,
      "award_later_correct_method_marks": true,
      "do_not_reaward_marks_lost_for_original_error": true
    },
    "rounding": {
      "accept_reasonable_rounding": true
    },
    "equivalent_forms": {
      "enabled": true
    }
  },
  "language_rules": {
    "accept_informal_wording_if_concept_correct": true,
    "accept_course_language_if_meaning_correct": true,
    "ignore_minor_spelling_errors": true,
    "ignore_minor_grammar_errors": true,
    "exception": "Do not ignore language, spelling, grammar or terminology errors when those skills are explicitly being assessed.",
    "missing_technical_term": {
      "award_concept_marks_when_understanding_is_clear": true,
      "withhold_terminology_marks_when_terminology_is_explicitly_required": true
    }
  },
  "over_answering": {
    "default_policy": "BEST_REQUIRED_N",
    "example": "If the question requests 4 points and the student provides 10, evaluate all valid responses and use the best 4 distinct creditworthy points.",
    "evaluate_all_responses": true,
    "select_best_required_number": true,
    "ignore_duplicate_points": true,
    "never_exceed_question_max_marks": true
  },
  "multiple_answer_rules": {
    "cancelled_open_answer": {
      "ignore_cancelled_answer": true,
      "mark_active_answer": true
    },
    "multiple_uncancelled_open_answers": {
      "evaluate_valid_content": true,
      "if_answers_contradict": "TEACHER_REVIEW",
      "never_exceed_max_marks": true
    },
    "mcq_two_choices_one_cancelled": {
      "mark_remaining_active_choice": true
    },
    "mcq_multiple_active_choices": {
      "score": 0
    }
  },
  "question_mapping": {
    "fix_wrong_question_numbering": true,
    "fix_wrong_section_numbering": true,
    "infer_missing_question_number": true,
    "use_section_context": true,
    "use_answer_content": true,
    "use_marking_guide_context": true,
    "section_mapping_example": {
      "actual_section_A": "Q1-Q10",
      "actual_section_B": "Q11-Q15",
      "actual_section_C": "Q16-Q19",
      "student_B_1_to_5": "MAP_TO_Q11_Q15",
      "student_C_6_to_9": "MAP_TO_Q16_Q19"
    },
    "only_auto_map_when_confident": true,
    "uncertain_mapping_action": "TEACHER_REVIEW"
  },
  "answer_organization": {
    "reconstruct_disarranged_work_when_clear": true,
    "combine_answer_across_pages": true,
    "find_answer_written_elsewhere": true,
    "combine_logically_connected_steps": true,
    "do_not_change_student_meaning": true,
    "do_not_invent_missing_steps": true
  },
  "duplicate_content": {
    "repeated_same_answer": "COUNT_ONCE",
    "same_point_different_wording": "COUNT_ONCE",
    "distinct_valid_points": "COUNT_SEPARATELY"
  },
  "diagram_and_visual_answers": {
    "accept_when_question_allows": true,
    "evaluate_correct_structure": true,
    "evaluate_correct_labels": true,
    "allow_partial_credit": true
  },
  "zero_mark_policy": {
    "zero_is_last_outcome": true,
    "give_zero_when": [
      "ANSWER_IS_BLANK",
      "ANSWER_IS_COMPLETELY_IRRELEVANT",
      "ANSWER_IS_COMPLETELY_INCORRECT_AND_CONTAINS_NO_CREDITWORTHY_COMPONENT",
      "MCQ_HAS_MULTIPLE_ACTIVE_CHOICES_WITH_NO_CLEAR_CANCELLATION"
    ],
    "do_not_give_zero_when": [
      "HANDWRITING_IS_UNCLEAR",
      "QUESTION_MAPPING_IS_UNCERTAIN",
      "ANSWER_USES_DIFFERENT_WORDING",
      "ANSWER_USES_A_DIFFERENT_POTENTIALLY_VALID_METHOD",
      "ANSWER_IS_PARTIALLY_CORRECT",
      "FINAL_ANSWER_IS_WRONG_BUT_VALID_PROCESS_EXISTS",
      "AI_IS_UNCERTAIN"
    ]
  },
  "confidence_policy": {
    "HIGH": {
      "action": "MARK_AUTOMATICALLY"
    },
    "MEDIUM": {
      "action": "MARK_AND_FLAG_FOR_OPTIONAL_REVIEW"
    },
    "LOW": {
      "action": "REQUIRE_TEACHER_REVIEW"
    },
    "never_convert_uncertainty_to_zero": true
  },
  "hard_safety_rules": {
    "never_exceed_question_max_marks": true,
    "never_exceed_exam_total_marks": true,
    "never_invent_student_content": true,
    "never_invent_missing_working": true,
    "never_change_student_answer_meaning": true,
    "never_use_low_confidence_guess_as_final_mark": true,
    "preserve_original_answer_image": true,
    "keep_ai_marking_explanation": true,
    "keep_marking_audit_trail": true,
    "teacher_final_decision_overrides_ai": true
  },
  "marking_algorithm": [
    "1_IDENTIFY_QUESTION",
    "2_READ_QUESTION_INSTRUCTION",
    "3_DETERMINE_QUESTION_TYPE_AND_NATURE",
    "4_READ_MAXIMUM_MARKS",
    "5_READ_MARKING_GUIDE_AND_RUBRIC",
    "6_IDENTIFY_CREDITABLE_COMPONENTS",
    "7_READ_COMPLETE_STUDENT_RESPONSE",
    "8_RECONSTRUCT_ONLY_CLEAR_DISORDERED_WORK",
    "9_CHECK_EXACT_AND_EQUIVALENT_CORRECT_CONTENT",
    "10_CHECK_ALTERNATIVE_VALID_METHODS_EXAMPLES_AND_THEORIES",
    "11_COLLECT_ALL_EARNED_MARKING_POINTS",
    "12_APPLY_PARTIAL_CREDIT",
    "13_APPLY_OVER_ANSWERING_AND_DUPLICATE_RULES",
    "14_CAP_SCORE_AT_QUESTION_MAXIMUM",
    "15_RUN_CONFIDENCE_CHECK",
    "16_ZERO_ONLY_IF_NO_CREDITWORTHY_EVIDENCE_EXISTS",
    "17_SEND_UNCERTAIN_CASES_TO_TEACHER_REVIEW",
    "18_RETURN_DRAFT_MARK_WITH_EVIDENCE_AND_EXPLANATION"
  ],
  "required_marking_output": {
    "question_number": true,
    "maximum_mark": true,
    "awarded_mark": true,
    "credit_awarded_for": true,
    "marks_lost_for": true,
    "rules_applied": true,
    "confidence": true,
    "review_required": true,
    "original_answer_reference": true,
    "teacher_final_mark": true
  }
} as const;
