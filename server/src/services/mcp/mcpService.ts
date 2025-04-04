import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MCPConfig, MCPRequest, MCPResponse, MCPStepResult } from "../../types/mcp";
import * as dotenv from 'dotenv';
import { logger } from '../../utils/logger';

dotenv.config();

class MCPService {
  private model: ChatOpenAI;
  private config: MCPConfig;

  constructor(config?: Partial<MCPConfig>) {
    this.config = {
      model: config?.model || process.env.OPENAI_MODEL || "gpt-4",
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY || "",
      defaultMaxSteps: config?.defaultMaxSteps || 5,
      temperature: config?.temperature || 0.7,
    };

    if (!this.config.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.model = new ChatOpenAI({
      modelName: this.config.model,
      openAIApiKey: this.config.apiKey,
      temperature: this.config.temperature,
    });
  }

  async process(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();
    const maxSteps = request.maxSteps || this.config.defaultMaxSteps;
    const results: MCPStepResult[] = [];

    // Set up the reasoning schema for structured output
    const reasoningSchema = z.object({
      reasoning: z.string().describe("Your step-by-step reasoning process"),
      output: z.string().describe("The conclusion or output from this reasoning step"),
    });

    const parser = StructuredOutputParser.fromZodSchema(reasoningSchema);
    const formatInstructions = parser.getFormatInstructions();

    let currentInput = request.input;
    let step = 1;

    while (step <= maxSteps) {
      // Create the prompt for this step
      const prompt = new PromptTemplate({
        template: `You are a careful problem solver working through a complex task step-by-step.
        
Previous steps taken: ${results.length > 0 ? JSON.stringify(results) : "None yet, this is the first step."}

Your task: {input}

Additional context: {context}

Step {step} of {maxSteps}:
Think through this step carefully and provide both your reasoning process and a conclusion for this step.

{format_instructions}`,
        inputVariables: ["input", "context", "step", "maxSteps"],
        partialVariables: { format_instructions: formatInstructions },
      });

      const formattedPrompt = await prompt.format({
        input: currentInput,
        context: JSON.stringify(request.context || {}),
        step,
        maxSteps,
      });

      const response = await this.model.invoke(formattedPrompt);
      
      try {
        // Handle different content types from the model response
        const content = typeof response.content === 'string' 
          ? response.content 
          : Array.isArray(response.content) 
            ? response.content.map(part => 
                typeof part === 'object' && part !== null && 'text' in part 
                  ? part.text 
                  : String(part)
              ).join('') 
            : String(response.content);
            
        const parsed = await parser.parse(content);
        
        const stepResult: MCPStepResult = {
          step,
          reasoning: parsed.reasoning,
          output: parsed.output,
        };
        
        results.push(stepResult);
        
        // Use this step's output as input for the next step
        currentInput = parsed.output;
        
        // Check if we've reached a conclusion or maxSteps
        if (step === maxSteps) {
          break;
        }
        
        step++;
      } catch (error) {
        logger.error("Error parsing model output:", error);
        
        // Add the raw output as a step to avoid losing information
        results.push({
          step,
          reasoning: "Error parsing structured output",
          output: String(response.content),
        });
        
        break;
      }
    }

    const endTime = Date.now();
    
    return {
      results,
      finalOutput: results.length > 0 ? results[results.length - 1].output : "",
      metadata: {
        totalSteps: results.length,
        executionTimeMs: endTime - startTime,
        completedAt: new Date().toISOString(),
      },
    };
  }

  // Add missing methods that are called from mcpController
  async getStatus(): Promise<Record<string, unknown>> {
    return {
      status: "operational",
      model: this.config.model,
      timestamp: new Date().toISOString()
    };
  }

  async createProject(projectData: {
    name: string;
    description?: string;
    settings?: Record<string, unknown>;
    userId?: string;
  }): Promise<Record<string, unknown>> {
    logger.info(`Creating project: ${projectData.name}`);
    
    // In a real implementation, this would save to a database
    return {
      id: `proj_${Date.now()}`,
      name: projectData.name,
      description: projectData.description || "",
      settings: projectData.settings || {},
      userId: projectData.userId || "anonymous",
      createdAt: new Date().toISOString()
    };
  }
}

export default MCPService;
