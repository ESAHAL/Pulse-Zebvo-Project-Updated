// templates/promptTemplates.ts
// Reusable, parameterized AI prompt templates.
// These are used in Phase 2 by aiService.ts — defined here early for architecture clarity.

export type PromptVariables = {
  brandName: string;
  brandVoice?: string;
  industry?: string;
  platform: string;
  tone: string;
  topic: string;
  additionalContext?: string;
};

/**
 * Generates a caption + hashtag prompt for social platforms.
 */
export function buildCaptionPrompt(vars: PromptVariables): string {
  return `You are a world-class social media copywriter for ${vars.brandName}.
${vars.brandVoice ? `Brand voice: ${vars.brandVoice}` : ""}
${vars.industry ? `Industry: ${vars.industry}` : ""}

Platform: ${vars.platform}
Tone: ${vars.tone}
Topic: ${vars.topic}
${vars.additionalContext ? `Additional context: ${vars.additionalContext}` : ""}

Write an engaging ${vars.platform} post that:
- Perfectly matches the platform's best practices and character limits
- Captures the ${vars.tone} tone authentically
- Drives genuine engagement
- Feels human, not AI-generated

Output as valid JSON with this exact structure:
{
  "caption": "the full post text",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "imagePrompt": "a detailed prompt to generate a matching image"
}`;
}

/**
 * Generates a LinkedIn long-form post prompt.
 */
export function buildLinkedInPrompt(vars: PromptVariables): string {
  return `You are a top LinkedIn content creator for ${vars.brandName}.
${vars.brandVoice ? `Brand voice: ${vars.brandVoice}` : ""}
${vars.industry ? `Industry: ${vars.industry}` : ""}

Topic: ${vars.topic}
Tone: ${vars.tone}
${vars.additionalContext ? `Additional context: ${vars.additionalContext}` : ""}

Write a high-performing LinkedIn article post that:
- Opens with a strong hook (no "I'm excited to share" clichés)
- Uses short paragraphs for mobile readability
- Includes 1-2 data points or insights
- Ends with a clear CTA or thought-provoking question
- 150-300 words max

Output as valid JSON with this exact structure:
{
  "caption": "the full LinkedIn post",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "imagePrompt": "a professional image prompt for LinkedIn context"
}`;
}

/**
 * Generates an image generation prompt for Imagen.
 */
export function buildImagePrompt(
  caption: string,
  platform: string,
  brandName: string
): string {
  return `Create a professional, high-quality social media image for ${brandName} on ${platform}.
Context from the post: "${caption.slice(0, 200)}"
Style: Modern, clean, brand-appropriate. No text overlays. Photorealistic or polished illustration.
Aspect ratio: ${platform === "instagram" ? "1:1 square" : platform === "twitter" ? "16:9 landscape" : "4:5 portrait"}.`;
}

/**
 * Select the right prompt builder based on platform.
 */
export function buildPromptForPlatform(vars: PromptVariables): string {
  if (vars.platform === "linkedin") {
    return buildLinkedInPrompt(vars);
  }
  return buildCaptionPrompt(vars);
}
