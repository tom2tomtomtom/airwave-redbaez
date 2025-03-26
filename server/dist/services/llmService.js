"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmService = void 0;
const axios_1 = __importDefault(require("axios"));
class LLMService {
    constructor() {
        this.apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/completions';
        this.apiKey = process.env.LLM_API_KEY || '';
        this.mockMode = process.env.PROTOTYPE_MODE === 'true';
    }
    /**
     * Process a client brief to generate motivations
     */
    async processBrief(briefData) {
        try {
            console.log('Processing brief to generate motivations...');
            if (this.mockMode) {
                console.log('Running in PROTOTYPE_MODE. Using mock motivations.');
                return this.getMockMotivations(false);
            }
            // Use real LLM API to generate motivations
            console.log('Using OpenAI API to generate real motivations...');
            // Format the prompt for OpenAI
            const prompt = this.formatBriefForMotivationsPrompt(briefData);
            try {
                // Call OpenAI API
                const response = await axios_1.default.post(this.apiUrl, {
                    model: 'gpt-3.5-turbo-16k', // or 'gpt-4' for better results
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert in marketing and consumer psychology. Generate creative marketing motivations based on the client brief.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                // Parse the response to extract motivations
                return this.parseMotivationsFromResponse(response.data);
            }
            catch (apiError) {
                console.error('OpenAI API error:', apiError.response?.data || apiError.message);
                console.log('Falling back to mock motivations due to API error');
                // Fallback to mock data in case of API failure
                return this.getMockMotivations(false);
            }
        }
        catch (error) {
            console.error('Error in processBrief:', error);
            throw new Error(`Failed to process brief: ${error.message}`);
        }
    }
    /**
     * Format the brief data into a prompt for the LLM
     */
    formatBriefForMotivationsPrompt(briefData) {
        return `
    # CLIENT BRIEF ANALYSIS
    
    Please analyze this client brief and generate 8 distinct customer motivations that could drive engagement with this product/service.
    
    ## Brief Details
    - Client: ${briefData.clientName}
    - Project: ${briefData.projectName}
    - Product Description: ${briefData.productDescription}
    - Target Audience: ${briefData.targetAudience}
    - Competitive Context: ${briefData.competitiveContext}
    - Campaign Objectives: ${briefData.campaignObjectives}
    - Key Messages: ${briefData.keyMessages}
    - Mandatories: ${briefData.mandatories}
    ${briefData.additionalInfo ? `- Additional Information: ${briefData.additionalInfo}` : ''}
    
    ## Response Format
    For each motivation, provide:
    1. A clear, compelling title (5-10 words)
    2. A concise description of the motivation (1-2 sentences)
    3. An explanation of why this motivation is relevant to the brief (2-3 sentences including any relevant market research or psychological principles)
    
    Format your response as a JSON array with this structure:
    [
      {
        "title": "Motivation Title",
        "description": "Brief description of the motivation",
        "explanation": "Explanation of relevance to brief and target audience"
      },
      ... 7 more motivations ...
    ]
    
    Ensure each motivation is distinct and addresses different psychological drivers. Make sure the response is ONLY the JSON array with no other text.
    `;
    }
    /**
     * Parse the LLM response to extract motivations
     */
    parseMotivationsFromResponse(response) {
        try {
            // Extract the content from the response
            let content = response.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('No content in LLM response');
            }
            // Try to extract JSON from the content
            // Sometimes the LLM might include additional text before or after the JSON
            const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
            if (jsonMatch) {
                content = jsonMatch[0];
            }
            // Parse the JSON
            const motivationsData = JSON.parse(content);
            // Convert to our Motivation type
            return motivationsData.map((item, index) => ({
                id: `motivation-${Date.now()}-${index + 1}`,
                title: item.title,
                description: item.description,
                explanation: item.explanation,
                selected: false
            }));
        }
        catch (error) {
            console.error('Error parsing motivations from LLM response:', error);
            console.log('Response content:', response);
            throw new Error(`Failed to parse motivations: ${error.message}`);
        }
    }
    /**
     * Extract a section of text from a document based on section title
     * @param text The full text to search
     * @param sectionName The name of the section to look for
     * @param maxLen Maximum length of text to extract
     */
    extractSection(text, sectionName, maxLen = 200) {
        // Look for the section title in different formats
        const patterns = [
            // Section with heading (##, ###, etc)
            new RegExp(`(?:#{1,3}\s*${sectionName}\s*:?\s*(?:\n|\r\n))([\s\S]{1,${maxLen + 100}})(?:\n(?:#{1,3}|$))`, 'i'),
            // Section with title followed by colon
            new RegExp(`(?:${sectionName}\s*:)([\s\S]{1,${maxLen + 100}})(?:\n(?:[A-Z][^\n]{2,}:)|$)`, 'i'),
            // Section with title in all caps
            new RegExp(`(?:${sectionName.toUpperCase()}\s*:?\s*)([\s\S]{1,${maxLen + 100}})(?:\n(?:[A-Z][^\n]{2,}\s*:)|$)`, 'i'),
            // Simple paragraph mentioning the section
            new RegExp(`\b${sectionName}\b[^\n.]{0,50}[:.](\s*[^\n]+)`, 'i')
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                // Clean up the result: trim whitespace and keep only up to maxLen chars
                let result = match[1].trim();
                if (result.length > maxLen) {
                    result = result.substring(0, maxLen) + '...';
                }
                return result;
            }
        }
        return null;
    }
    /**
     * Analyze brief text to fill in missing fields
     * @param extractedText The raw text extracted from the brief document
     * @param partialBrief The partially filled brief data with some fields potentially missing
     */
    async analyzeBriefText(extractedText, partialBrief) {
        try {
            console.log('Analyzing brief text to fill missing fields...');
            // Extract all fields from the text using basic extraction logic
            const result = { ...partialBrief };
            // Simply use local extraction methods since the Supabase Edge Function is not available
            if (!result.clientName) {
                const clientPattern = /\b(?:client|company|brand|organisation|organization)\s*:?\s+([\w\s&.'-]+)\b/i;
                const clientMatch = extractedText.match(clientPattern);
                result.clientName = clientMatch?.[1]?.trim() || 'Unknown Client';
            }
            if (!result.projectName) {
                const projectPattern = /\b(?:project|campaign|initiative)\s*:?\s+([\w\s&.'-]+)\b/i;
                const projectMatch = extractedText.match(projectPattern);
                result.projectName = projectMatch?.[1]?.trim() || 'New Marketing Campaign';
            }
            if (!result.productDescription) {
                const productPattern = /\b(?:product|service|offering)\s*:?\s+([^\n.]+(?:\.[^\n.]+)?)\b/i;
                const productMatch = extractedText.match(productPattern);
                result.productDescription = productMatch?.[1]?.trim() ||
                    this.extractSection(extractedText, 'product description', 200) ||
                    'Product or service to be marketed';
            }
            if (!result.targetAudience) {
                const audiencePattern = /\b(?:target\s*audience|audience|demographic|customers)\s*:?\s+([^\n.]+(?:\.[^\n.]+)?)\b/i;
                const audienceMatch = extractedText.match(audiencePattern);
                result.targetAudience = audienceMatch?.[1]?.trim() ||
                    this.extractSection(extractedText, 'target audience', 150) ||
                    'General consumers';
            }
            if (!result.competitiveContext) {
                result.competitiveContext =
                    this.extractSection(extractedText, 'competitive context', 200) ||
                        this.extractSection(extractedText, 'competition', 200) ||
                        'Standard market competition';
            }
            if (!result.campaignObjectives) {
                const objectivesPattern = /\b(?:objectives|goals|aims)\s*:?\s+([^\n.]+(?:\.[^\n.]+)?)\b/i;
                const objectivesMatch = extractedText.match(objectivesPattern);
                result.campaignObjectives = objectivesMatch?.[1]?.trim() ||
                    this.extractSection(extractedText, 'objectives', 200) ||
                    'Increase brand awareness and drive engagement';
            }
            if (!result.keyMessages) {
                result.keyMessages =
                    this.extractSection(extractedText, 'key messages', 200) ||
                        this.extractSection(extractedText, 'messaging', 200) ||
                        'Brand quality and unique value proposition';
            }
            if (!result.mandatories) {
                result.mandatories =
                    this.extractSection(extractedText, 'mandatories', 150) ||
                        this.extractSection(extractedText, 'requirements', 150) ||
                        'Brand guidelines compliance';
            }
            console.log('Generated complete brief data:', result);
            return result;
        }
        catch (error) {
            console.error('Error analyzing brief text:', error);
            // Return what we have with placeholder data for critical missing fields
            const fallbackResult = { ...partialBrief };
            if (!fallbackResult.clientName)
                fallbackResult.clientName = 'Unknown Client';
            if (!fallbackResult.projectName)
                fallbackResult.projectName = 'Marketing Campaign';
            if (!fallbackResult.productDescription)
                fallbackResult.productDescription = 'Product description based on uploaded document';
            if (!fallbackResult.targetAudience)
                fallbackResult.targetAudience = 'General consumers';
            if (!fallbackResult.campaignObjectives)
                fallbackResult.campaignObjectives = 'Increase brand awareness and drive engagement';
            return fallbackResult;
        }
    }
    /**
     * Generate follow-up motivations based on user feedback
     */
    async regenerateMotivations(briefData, feedback) {
        try {
            console.log('Regenerating motivations with feedback:', feedback);
            if (this.mockMode) {
                console.log('Running in PROTOTYPE_MODE. Using mock motivations for regeneration.');
                return this.getMockMotivations(true);
            }
            // Use real LLM API to generate new motivations with feedback
            console.log('Using OpenAI API to regenerate motivations...');
            // Format the prompt with feedback
            const prompt = this.formatBriefForMotivationsPrompt(briefData) + `

      # ADDITIONAL FEEDBACK
      The client provided this feedback that should be incorporated: ${feedback}
      Please create new motivations that address this feedback.
      `;
            try {
                // Call OpenAI API
                const response = await axios_1.default.post(this.apiUrl, {
                    model: 'gpt-3.5-turbo-16k', // or 'gpt-4' for better results
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert in marketing and consumer psychology. Generate creative marketing motivations based on the client brief and feedback.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.8, // Slightly higher temperature for more variation
                    max_tokens: 2000
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                // Parse the response to extract motivations
                return this.parseMotivationsFromResponse(response.data);
            }
            catch (apiError) {
                console.error('OpenAI API error:', apiError.response?.data || apiError.message);
                console.log('Falling back to mock motivations due to API error');
                // Fallback to mock data in case of API failure
                return this.getMockMotivations(true);
            }
        }
        catch (error) {
            console.error('Error in regenerateMotivations:', error);
            throw new Error(`Failed to regenerate motivations: ${error.message}`);
        }
    }
    /**
     * Generate copy variations based on selected motivations
     */
    async generateCopy(request, briefData, motivations) {
        try {
            if (this.mockMode) {
                console.log('Running in PROTOTYPE_MODE. Using mock copy variations.');
                return this.getMockCopyVariations(request);
            }
            // Get selected motivations
            const selectedMotivations = motivations.filter(m => request.motivationIds.includes(m.id));
            console.log('Using OpenAI API to generate real copy variations...');
            console.log('Selected motivations:', selectedMotivations.length);
            // Format the prompt for OpenAI
            const prompt = this.formatCopyGenerationPrompt(briefData, selectedMotivations, request);
            try {
                // Call OpenAI API
                const response = await axios_1.default.post(this.apiUrl, {
                    model: 'gpt-3.5-turbo-16k', // or 'gpt-4' for better results
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert copywriter who creates compelling and creative ad copy based on marketing briefs and customer motivations.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                // Parse the response to extract copy variations
                return this.parseCopyVariationsFromResponse(response.data, request);
            }
            catch (apiError) {
                console.error('OpenAI API error:', apiError.response?.data || apiError.message);
                console.log('Falling back to mock copy variations due to API error');
                // Fallback to mock data in case of API failure
                return this.getMockCopyVariations(request);
            }
        }
        catch (error) {
            console.error('Error in generateCopy:', error);
            throw new Error(`Failed to generate copy: ${error.message}`);
        }
    }
    /**
     * Format the brief data, motivations and request into a prompt for copy generation
     */
    formatCopyGenerationPrompt(briefData, motivations, request) {
        // Format motivations for inclusion in prompt
        const motivationsText = motivations.map(m => `* ${m.title}: ${m.description}\n  - Rationale: ${m.explanation}`).join('\n\n');
        // Determine frame guidelines based on requested length
        let frameLengthGuideline = '';
        switch (request.length) {
            case 'short':
                frameLengthGuideline = 'Keep each frame very concise, around 5-8 words per frame.';
                break;
            case 'medium':
                frameLengthGuideline = 'Keep each frame moderately concise, around 8-12 words per frame.';
                break;
            case 'long':
                frameLengthGuideline = 'Each frame can be more detailed, around 12-20 words per frame.';
                break;
        }
        return `
    # CREATIVE BRIEF AND COPY GENERATION REQUEST
    
    Please create ${5} distinct ad copy variations based on this marketing brief and the selected customer motivations.
    
    ## Brief Details
    - Client: ${briefData.clientName}
    - Project: ${briefData.projectName}
    - Product Description: ${briefData.productDescription}
    - Target Audience: ${briefData.targetAudience}
    - Campaign Objectives: ${briefData.campaignObjectives}
    - Key Messages: ${briefData.keyMessages}
    - Mandatories: ${briefData.mandatories}
    
    ## Selected Motivations
    ${motivationsText}
    
    ## Copy Requirements
    - Style: ${request.style}
    - Tone: ${request.tone}
    - Number of Frames per Variation: ${request.frameCount}
    - Copy Length: ${request.length} (${frameLengthGuideline})
    - Include Call To Action: ${request.includeCallToAction ? 'Yes' : 'No'}
    ${request.includeCallToAction && request.callToActionText ? `- Preferred CTA: ${request.callToActionText}` : ''}
    
    ## Response Format
    Format your response as a JSON array with this structure:
    [
      {
        "frames": ["Frame 1 copy", "Frame 2 copy", ... up to the requested number of frames],
        "callToAction": "Call to action text (if requested)"
      },
      ... 4 more variations with the same structure ...
    ]
    
    Each variation should have exactly ${request.frameCount} frames.
    Make each variation distinct in approach, emotional appeal, or framing.
    Ensure the copy aligns with the selected motivations and brief details.
    Make sure the response is ONLY the JSON array with no other text.
    `;
    }
    /**
     * Parse the LLM response to extract copy variations
     */
    parseCopyVariationsFromResponse(response, request) {
        try {
            // Extract the content from the response
            let content = response.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('No content in LLM response');
            }
            // Try to extract JSON from the content
            // Sometimes the LLM might include additional text before or after the JSON
            const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
            if (jsonMatch) {
                content = jsonMatch[0];
            }
            // Parse the JSON
            const variationsData = JSON.parse(content);
            // Convert to our CopyVariation type
            return variationsData.map((item, index) => ({
                id: `copy-${Date.now()}-${index + 1}`,
                frames: item.frames,
                callToAction: item.callToAction,
                tone: request.tone,
                style: request.style,
                selected: false
            }));
        }
        catch (error) {
            console.error('Error parsing copy variations from LLM response:', error);
            console.log('Response content:', response);
            throw new Error(`Failed to parse copy variations: ${error.message}`);
        }
    }
    /**
     * Generate mock data for prototype mode
     */
    getMockMotivations(isRegeneration = false) {
        const baseTitle = isRegeneration ? 'Regenerated Motivation' : 'Motivation';
        return [
            {
                id: `motivation-${Date.now()}-1`,
                title: `${baseTitle}: Empowerment through Innovation`,
                description: 'The product helps users take control of their lives through innovative features.',
                explanation: 'This motivation appeals to the desire for autonomy and cutting-edge solutions. Research shows that 78% of your target demographic values innovation as a key purchasing factor.',
                selected: false
            },
            {
                id: `motivation-${Date.now()}-2`,
                title: `${baseTitle}: Community Connection`,
                description: 'The product helps users feel part of a like-minded community.',
                explanation: 'This motivation addresses the basic human need for belonging. Your target audience shows high engagement with community-focused messaging across social platforms.',
                selected: false
            },
            {
                id: `motivation-${Date.now()}-3`,
                title: `${baseTitle}: Effortless Simplicity`,
                description: 'The product makes complex tasks simple and effortless.',
                explanation: 'This motivation aligns with the desire for efficiency and simplicity. Market research indicates that your audience values time-saving features highly.',
                selected: false
            },
            {
                id: `motivation-${Date.now()}-4`,
                title: `${baseTitle}: Sustainable Living`,
                description: 'The product helps users live more sustainably without compromise.',
                explanation: 'This motivation connects with growing environmental concerns. 85% of your target audience has indicated that sustainability factors into their purchasing decisions.',
                selected: false
            },
            {
                id: `motivation-${Date.now()}-5`,
                title: `${baseTitle}: Personal Achievement`,
                description: 'The product helps users achieve personal goals and celebrate success.',
                explanation: 'This motivation taps into the desire for self-improvement and accomplishment. Your target audience shows high engagement with achievement-oriented content.',
                selected: false
            },
            {
                id: `motivation-${Date.now()}-6`,
                title: `${baseTitle}: Trusted Security`,
                description: 'The product provides peace of mind through reliable security features.',
                explanation: 'This motivation addresses concerns about digital safety. Your audience consistently rates security as a top consideration when adopting new products.',
                selected: false
            },
            {
                id: `motivation-${Date.now()}-7`,
                title: `${baseTitle}: Status Enhancement`,
                description: 'The product enhances the user\'s social standing and image.',
                explanation: 'This motivation connects with aspirational desires. Your target demographic shows engagement with luxury and premium positioning in similar products.',
                selected: false
            },
            {
                id: `motivation-${Date.now()}-8`,
                title: `${baseTitle}: Financial Wisdom`,
                description: 'The product represents smart financial decision-making and value.',
                explanation: 'This motivation appeals to practical considerations. Your audience responds positively to value-focused messaging that emphasizes return on investment.',
                selected: false
            }
        ];
    }
    /**
     * Generate mock copy variations for prototype mode
     */
    getMockCopyVariations(request) {
        const variations = [];
        // Generate 3 variations
        for (let i = 1; i <= 3; i++) {
            const frames = [];
            // Generate requested number of frames
            for (let j = 1; j <= request.frameCount; j++) {
                frames.push(`Frame ${j} copy: This is ${request.tone} copy in ${request.style} style for variation ${i}.`);
            }
            variations.push({
                id: `copy-${Date.now()}-${i}`,
                frames,
                callToAction: request.includeCallToAction ? (request.callToActionText || 'Shop Now') : undefined,
                tone: request.tone,
                style: request.style,
                selected: false
            });
        }
        return variations;
    }
}
// Export singleton instance
exports.llmService = new LLMService();
