import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { BriefData } from './llmService';

// Convert callbacks to promises
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

export class DocumentService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    // Ensure uploads directory exists
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir(): Promise<void> {
    try {
      await mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Save an uploaded file to disk
   */
  async saveUploadedFile(file: Express.Multer.File): Promise<string> {
    const filePath = path.join(this.uploadsDir, file.originalname);
    await writeFile(filePath, file.buffer);
    return filePath;
  }

  /**
   * Clean up file after processing
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }

  /**
   * Extract text from a PDF file
   */
  async extractTextFromPDF(filePath: string): Promise<string> {
    const dataBuffer = await readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  }

  /**
   * Extract text from a Word document
   */
  async extractTextFromWord(filePath: string): Promise<string> {
    const dataBuffer = await readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  }

  /**
   * Extract text from a text file
   */
  async extractTextFromTxt(filePath: string): Promise<string> {
    const dataBuffer = await readFile(filePath);
    return dataBuffer.toString('utf8');
  }

  /**
   * Process a document and extract its text based on file type
   */
  async processDocument(file: Express.Multer.File): Promise<string> {
    const filePath = await this.saveUploadedFile(file);
    const fileExt = path.extname(filePath).toLowerCase();
    
    try {
      let text = '';
      
      if (fileExt === '.pdf') {
        text = await this.extractTextFromPDF(filePath);
      } else if (fileExt === '.docx' || fileExt === '.doc') {
        text = await this.extractTextFromWord(filePath);
      } else if (fileExt === '.txt') {
        text = await this.extractTextFromTxt(filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileExt}`);
      }
      
      return text;
    } finally {
      // Clean up the file regardless of success or failure
      await this.cleanupFile(filePath);
    }
  }

  /**
   * Extract brief data from document text using structure recognition
   */
  extractBriefDataFromText(text: string): Partial<BriefData> {
    const briefData: Partial<BriefData> = {};
    
    // Extract client name
    const clientMatch = text.match(/client:?\s*([^\r\n]+)/i);
    if (clientMatch && clientMatch[1]) {
      briefData.clientName = clientMatch[1].trim();
    }
    
    // Extract project name
    const projectMatch = text.match(/project:?\s*([^\r\n]+)/i);
    if (projectMatch && projectMatch[1]) {
      briefData.projectName = projectMatch[1].trim();
    }
    
    // Extract product description
    const productMatch = text.match(/product:?\s*([^\r\n]+)|(product description:?\s*([^\r\n]+))/i);
    if (productMatch && (productMatch[1] || productMatch[3])) {
      briefData.productDescription = (productMatch[1] || productMatch[3]).trim();
    }
    
    // Extract target audience
    const audienceMatch = text.match(/target audience:?\s*([^\r\n]+)/i);
    if (audienceMatch && audienceMatch[1]) {
      briefData.targetAudience = audienceMatch[1].trim();
    }
    
    // Extract competitive context
    const competitiveMatch = text.match(/competitive:?\s*([^\r\n]+)|(competition:?\s*([^\r\n]+))/i);
    if (competitiveMatch && (competitiveMatch[1] || competitiveMatch[3])) {
      briefData.competitiveContext = (competitiveMatch[1] || competitiveMatch[3]).trim();
    }
    
    // Extract campaign objectives
    const objectivesMatch = text.match(/objectives:?\s*([^\r\n]+)|(goals:?\s*([^\r\n]+))/i);
    if (objectivesMatch && (objectivesMatch[1] || objectivesMatch[3])) {
      briefData.campaignObjectives = (objectivesMatch[1] || objectivesMatch[3]).trim();
    }
    
    // Extract key messages
    const messagesMatch = text.match(/key messages:?\s*([^\r\n]+)/i);
    if (messagesMatch && messagesMatch[1]) {
      briefData.keyMessages = messagesMatch[1].trim();
    }
    
    // Extract mandatories
    const mandatoriesMatch = text.match(/mandatories:?\s*([^\r\n]+)|(requirements:?\s*([^\r\n]+))/i);
    if (mandatoriesMatch && (mandatoriesMatch[1] || mandatoriesMatch[3])) {
      briefData.mandatories = (mandatoriesMatch[1] || mandatoriesMatch[3]).trim();
    }
    
    // Extract tone preference
    const toneMatch = text.match(/tone:?\s*([^\r\n]+)/i);
    if (toneMatch && toneMatch[1]) {
      briefData.tonePreference = toneMatch[1].trim();
    }
    
    return briefData;
  }
}

export const documentService = new DocumentService();
