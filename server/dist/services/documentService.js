"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentService = exports.DocumentService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
// Convert callbacks to promises
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const unlink = (0, util_1.promisify)(fs_1.default.unlink);
class DocumentService {
    constructor() {
        this.uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        // Ensure uploads directory exists
        this.ensureUploadsDir();
    }
    async ensureUploadsDir() {
        try {
            await mkdir(this.uploadsDir, { recursive: true });
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    /**
     * Save an uploaded file to disk
     */
    async saveUploadedFile(file) {
        const filePath = path_1.default.join(this.uploadsDir, file.originalname);
        await writeFile(filePath, file.buffer);
        return filePath;
    }
    /**
     * Clean up file after processing
     */
    async cleanupFile(filePath) {
        try {
            await unlink(filePath);
        }
        catch (error) {
            console.error(`Error cleaning up file ${filePath}:`, error);
        }
    }
    /**
     * Extract text from a PDF file
     */
    async extractTextFromPDF(filePath) {
        const dataBuffer = await readFile(filePath);
        const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
        return pdfData.text;
    }
    /**
     * Extract text from a Word document
     */
    async extractTextFromWord(filePath) {
        const dataBuffer = await readFile(filePath);
        const result = await mammoth_1.default.extractRawText({ buffer: dataBuffer });
        return result.value;
    }
    /**
     * Extract text from a text file
     */
    async extractTextFromTxt(filePath) {
        const dataBuffer = await readFile(filePath);
        return dataBuffer.toString('utf8');
    }
    /**
     * Process a document and extract its text based on file type
     */
    async processDocument(file) {
        const filePath = await this.saveUploadedFile(file);
        const fileExt = path_1.default.extname(filePath).toLowerCase();
        try {
            let text = '';
            if (fileExt === '.pdf') {
                text = await this.extractTextFromPDF(filePath);
            }
            else if (fileExt === '.docx' || fileExt === '.doc') {
                text = await this.extractTextFromWord(filePath);
            }
            else if (fileExt === '.txt') {
                text = await this.extractTextFromTxt(filePath);
            }
            else {
                throw new Error(`Unsupported file type: ${fileExt}`);
            }
            return text;
        }
        finally {
            // Clean up the file regardless of success or failure
            await this.cleanupFile(filePath);
        }
    }
    /**
     * Extract brief data from document text using structure recognition
     */
    extractBriefDataFromText(text) {
        const briefData = {};
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
exports.DocumentService = DocumentService;
exports.documentService = new DocumentService();
