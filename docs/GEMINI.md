# Gemini setup

Put GEMINI_API_KEY in evalot/.env and save the file. Optional GEMINI_MODEL selects the model; the default is gemini-3.5-flash-lite. Restart the backend after changing .env. Gemini takes precedence when its key is present; without it, existing OpenAI settings continue to work.

Gemini powers material-based question drafting, question/guide transcription and student answer extraction with suggested marks. Photos and PDFs are sent inline to Google's generateContent endpoint. Requests above 19 MB are rejected locally; reduce scan sizes if needed. In-app consent is still required before sending papers. The key is sent only in the backend's x-goog-api-key header and is never exposed in frontend options or error messages.

Use invented sample papers when testing a free tier. Google's free-tier data policy may allow submitted content to improve its products. Teacher review remains required for identity, transcription, confidence flags and every final mark. Originals are preserved for checking and claims.

The unit tests validate transport, prompts, file types, generation/guide contracts, blocked/incomplete output and quota/auth failures. Real handwriting accuracy depends on the model, scan quality and teacher validation. Quota and access errors display a safe explanation and do not assign final marks.
