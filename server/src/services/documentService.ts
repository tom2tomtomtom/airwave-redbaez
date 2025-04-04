import * as fs from 'fs';
import { logger } from './logger';
import * as path from 'path';
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
      logger.error(`Error cleaning up file ${filePath}:`, error);
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
   * Extract text from a document buffer directly (without saving to disk)
   * @param buffer The file buffer
   * @param fileExtension The file extension (pdf, docx, doc, txt)
   */
  async extractTextFromDocument(buffer: Buffer, fileExtension: string): Promise<string> {
    logger.info(`Extracting text from ${fileExtension} document...`);
    
    try {
      let text = '';
      
      if (fileExtension === 'pdf') {
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } else if (fileExtension === 'docx' || fileExtension === 'doc') {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (fileExtension === 'txt') {
        text = buffer.toString('utf8');
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }
      
      return text;
    } catch (error) {
      logger.error(`Error extracting text from ${fileExtension} document:`, error);
      throw error;
    }
  }

  /**
   * Extract brief data from document text using advanced pattern matching
   * that handles complex brief formats with multi-paragraph sections
   */
  extractBriefDataFromText(text: string): Partial<BriefData> {
    logger.info('Extracting brief data from text...');
    const briefData: Partial<BriefData> = {};
    
    // Extract Client name - typically appears as "Client: Name"
    const clientPattern = /\bClient:\s+([^\n\r]+)/i;
    const clientMatch = text.match(clientPattern);
    if (clientMatch && clientMatch[1]) {
      briefData.clientName = clientMatch[1].trim();
    }
    
    // Extract Project name - typically appears as "Project: Name"
    const projectPattern = /\bProject:\s+([^\n\r]+)/i;
    const projectMatch = text.match(projectPattern);
    if (projectMatch && projectMatch[1]) {
      briefData.projectName = projectMatch[1].trim();
    }
    
    // Function to extract sections with headings and content that may span multiple paragraphs
    const extractSection = (sectionHeader: string, nextSectionHeaders: string[]): string | null => {
      // Create a regex pattern that searches for the section heading
      const headerPattern = new RegExp(`\\b${sectionHeader}[\\s:]+(.*)`, 'i');
      const match = text.match(headerPattern);
      
      if (!match) return null;
      
      // Find the index of the section heading
      const headerIndex = text.indexOf(match[0]);
      let startIndex = headerIndex + match[0].length;
      
      // If heading and content are on the same line, adjust start index
      if (match[1] && match[1].trim()) {
        startIndex = headerIndex + match[0].indexOf(match[1]);
      }
      
      // Find the next section heading to determine where this section ends
      let endIndex = text.length;
      for (const nextHeader of nextSectionHeaders) {
        const nextPattern = new RegExp(`\\b${nextHeader}[\\s:]+`, 'i');
        const nextMatch = text.substring(startIndex).match(nextPattern);
        
        if (nextMatch && nextMatch.index !== undefined) {
          const candidateEndIndex = startIndex + nextMatch.index;
          if (candidateEndIndex < endIndex) {
            endIndex = candidateEndIndex;
          }
        }
      }
      
      // Extract content between this heading and the next heading
      const content = text.substring(startIndex, endIndex).trim();
      return content;
    };
    
    // List of all possible section headers in briefs
    const allSectionHeaders = [
      'Client', 'Project', 'Background', 'The Problem', 'Human Insight', 
      'Proposition', 'Target Audience', 'Tone of Voice', 'Key Messages',
      'Deliverables', 'Conclusion', 'Executions', 'Product Description',
      'Competitive Context', 'Campaign Objectives', 'Mandatories'
    ];
    
    // Extract Product Description - may be part of Background or its own section
    let productDesc = extractSection('Product Description', allSectionHeaders);
    if (!productDesc) {
      // If not found as a separate section, it might be in the Background
      const backgroundContent = extractSection('Background', allSectionHeaders);
      if (backgroundContent) {
        // Try to extract product info from background (usually first paragraph)
        const firstPara = backgroundContent.split('\n\n')[0];
        if (firstPara && firstPara.length > 30) {
          productDesc = firstPara;
        }
      }
    }
    if (productDesc) {
      briefData.productDescription = productDesc;
    }
    
    // Extract Target Audience
    const targetAudience = extractSection('Target Audience', allSectionHeaders);
    if (targetAudience) {
      briefData.targetAudience = targetAudience;
    }
    
    // Extract Competitive Context - might be part of Background if not separate
    let competitiveContext = extractSection('Competitive Context', allSectionHeaders);
    if (!competitiveContext) {
      // Try to find competitive information in the background
      const backgroundContent = extractSection('Background', allSectionHeaders);
      if (backgroundContent) {
        const paragraphs = backgroundContent.split('\n\n');
        // Look for paragraphs that mention competitors, market, industry
        for (const para of paragraphs) {
          if (para.toLowerCase().includes('competitor') || 
              para.toLowerCase().includes('market') || 
              para.toLowerCase().includes('industry')) {
            competitiveContext = para;
            break;
          }
        }
      }
    }
    if (competitiveContext) {
      briefData.competitiveContext = competitiveContext;
    }
    
    // Extract Campaign Objectives - might be in Proposition if not separate
    let campaignObjectives = extractSection('Campaign Objectives', allSectionHeaders);
    if (!campaignObjectives) {
      const proposition = extractSection('Proposition', allSectionHeaders);
      if (proposition) {
        campaignObjectives = proposition;
      }
    }
    if (campaignObjectives) {
      briefData.campaignObjectives = campaignObjectives;
    }
    
    // Extract Key Messages
    const keyMessages = extractSection('Key Messages', allSectionHeaders);
    if (keyMessages) {
      // Format numbered points properly
      briefData.keyMessages = keyMessages;
    }
    
    // Extract Mandatories - might be in Deliverables if not separate
    let mandatories = extractSection('Mandatories', allSectionHeaders);
    if (!mandatories) {
      const deliverables = extractSection('Deliverables', allSectionHeaders);
      if (deliverables) {
        mandatories = deliverables;
      }
    }
    if (mandatories) {
      briefData.mandatories = mandatories;
    }
    
    // Extract Tone Preference
    const tonePreference = extractSection('Tone of Voice', allSectionHeaders);
    if (tonePreference) {
      briefData.tonePreference = tonePreference;
    }
    
    // For Problem statement, check if it exists in 'The Problem' section or Key Messages
    let problemStatement = extractSection('The Problem', allSectionHeaders);
    if (!problemStatement && keyMessages) {
      // Look for a problem statement in the key messages (often first point)
      const keyMessageLines = keyMessages.split('\n');
      for (const line of keyMessageLines) {
        if (line.toLowerCase().includes('problem')) {
          problemStatement = line;
          break;
        }
      }
    }
    if (problemStatement) {
      briefData.additionalInfo = `Problem Statement: ${problemStatement}`;
    }
    
    // Additional processing to format message points consistently
    if (briefData.keyMessages) {
      // Remove numbering if present to create a clean list
      let formattedMessages = briefData.keyMessages;
      formattedMessages = formattedMessages.replace(/^\d+\.\s+/gm, '');
      briefData.keyMessages = formattedMessages;
    }
    
    logger.info('Extracted brief data:', briefData);
    return briefData;
  }
}

export const documentService = new DocumentService();
