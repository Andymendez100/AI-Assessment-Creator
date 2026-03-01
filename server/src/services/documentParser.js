import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const parseDocument = async (filePath, mimeType) => {
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await parsePdf(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await parseDocx(filePath);
      case 'text/plain':
        return await parseText(filePath);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Error parsing document:', error);
    throw new Error(`Failed to parse document: ${error.message}`);
  }
};

const parsePdf = async (filePath) => {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  return cleanText(data.text);
};

const parseDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return cleanText(result.value);
};

const parseText = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf-8');
  return cleanText(content);
};

const cleanText = (text) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
};

export const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};
