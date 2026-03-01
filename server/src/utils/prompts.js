export const buildQuestionGenerationPrompt = (config, referenceText, customPrompt) => {
  const { questionCount, questionType, answerOptionsCount } = config;

  let typeInstructions = '';
  if (questionType === 'multiple_choice') {
    typeInstructions = `Generate multiple choice questions with exactly ${answerOptionsCount} answer options each. Only one option should be correct. Use letters (a, b, c, d, etc.) for option IDs.`;
  } else if (questionType === 'true_false') {
    typeInstructions = 'Generate true/false questions. Set correctAnswer to true or false accordingly.';
  } else if (questionType === 'mixed') {
    typeInstructions = `Generate a mix of multiple choice and true/false questions. For multiple choice, use ${answerOptionsCount} options with letters (a, b, c, d, etc.) for IDs.`;
  }

  let customInstructions = '';
  if (customPrompt && customPrompt.trim()) {
    customInstructions = `
Additional Instructions from User:
${customPrompt}
`;
  }

  const hasReference = referenceText && referenceText.trim().length > 0;

  let referenceSection = '';
  if (hasReference) {
    referenceSection = `
Reference Material:
---
${referenceText}
---`;
  }

  const sourceDescription = hasReference
    ? 'Based on the following reference material, generate'
    : 'Based on the instructions provided, generate';

  const requirementsList = hasReference
    ? `Requirements:
1. Questions should test understanding, not just memorization
2. Questions should be clear and unambiguous
3. All answer options should be plausible
4. Include a brief explanation for each correct answer
5. Questions should cover different aspects of the material`
    : `Requirements:
1. Questions should test understanding, not just memorization
2. Questions should be clear and unambiguous
3. All answer options should be plausible
4. Include a brief explanation for each correct answer
5. Follow the user's instructions closely to determine the topic and content`;

  return `You are an expert assessment creator. ${sourceDescription} ${questionCount} high-quality questions.

${typeInstructions}
${customInstructions}
${requirementsList}
${referenceSection}

Respond with a valid JSON object with this structure:
{
  "questions": [
    {
      "type": "multiple_choice" or "true_false",
      "questionText": "The question text",
      "options": [{"id": "a", "text": "Option text", "isCorrect": true/false}],
      "correctAnswer": true/false (only for true_false type),
      "explanation": "Why this answer is correct"
    }
  ]
}`;
};

export const buildRegenerateQuestionPrompt = (originalQuestion, referenceText, questionType, customPrompt) => {
  let customInstructions = '';
  if (customPrompt) {
    customInstructions = `\nAdditional Instructions from User:\n${customPrompt}\n`;
  }

  const hasReference = referenceText && referenceText.trim().length > 0;

  let referenceSection = '';
  if (hasReference) {
    referenceSection = `
Reference Material:
---
${referenceText}
---`;
  }

  const sourceDescription = hasReference
    ? 'based on the reference material'
    : 'following the same topic and style';

  return `You are an expert assessment creator. Generate a NEW question to replace the following question, ${sourceDescription}.

Original Question (to be replaced):
${originalQuestion}

Question Type: ${questionType === 'multiple_choice' ? 'Multiple Choice (4 options, one correct)' : 'True/False'}
${customInstructions}${referenceSection}

Requirements:
1. Create a completely different question from the original
2. The question should test understanding${hasReference ? ' of the material' : ''}
3. Include a brief explanation for the correct answer

Respond with a valid JSON object with this structure:
{
  "type": "${questionType}",
  "questionText": "The new question text",
  "options": [{"id": "a", "text": "Option text", "isCorrect": true/false}],
  "correctAnswer": true/false (only for true_false type),
  "explanation": "Why this answer is correct"
}`;
};

export const buildRegenerateAnswerPrompt = (questionText, options, answerIndex, isCorrect, customPrompt, referenceText) => {
  const letter = String.fromCharCode(97 + answerIndex); // a, b, c, d...
  const currentAnswer = options[answerIndex]?.text || '';
  const otherAnswers = options
    .filter((_, i) => i !== answerIndex)
    .map((o) => o.text)
    .join(', ');

  let customInstructions = '';
  if (customPrompt) {
    customInstructions = `\nAdditional Instructions from User:\n${customPrompt}\n`;
  }

  let referenceSection = '';
  if (referenceText && referenceText.trim()) {
    referenceSection = `
Reference Material (use this to create contextually accurate answers):
---
${referenceText}
---
`;
  }

  return `You are an expert assessment creator. Generate a NEW answer option to replace one answer for the following question.

Question: ${questionText}

Current answer to replace (option ${letter.toUpperCase()}): "${currentAnswer}"
This answer is: ${isCorrect ? 'THE CORRECT ANSWER' : 'an incorrect distractor'}
Other answers (do not duplicate these): ${otherAnswers}
${customInstructions}${referenceSection}
Requirements:
1. Generate a single replacement answer
2. ${isCorrect ? 'This must be the correct answer to the question based on the reference material' : 'This should be a plausible but incorrect distractor based on concepts from the reference material'}
3. The answer should be different from all other options
4. Keep a similar length and style to other answers

Respond with a valid JSON object with this structure:
{
  "text": "The new answer text"
}`;
};
