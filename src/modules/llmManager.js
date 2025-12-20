import { Ollama } from 'ollama';

/**
 * LLM Manager for handling local LLM interactions
 */
class LLMManager {
  constructor(config) {
    this.config = config;
    this.ollama = new Ollama({ host: config.host });
    this.model = config.model;
  }

  /**
   * Check if Ollama is running and the model is available
   */
  async checkAvailability() {
    try {
      const models = await this.ollama.list();
      const modelExists = models.models.some(m => m.name.includes(this.model));
      
      if (!modelExists) {
        console.log(`Model ${this.model} not found. Available models:`, 
          models.models.map(m => m.name).join(', '));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Ollama not available:', error.message);
      return false;
    }
  }

  /**
   * Generate a response from the LLM
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - Additional options for the request
   */
  async generate(prompt, options = {}) {
    try {
      const response = await this.ollama.generate({
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || this.config.temperature,
          num_predict: options.maxTokens || this.config.maxTokens
        }
      });

      return response.response;
    } catch (error) {
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }

  /**
   * Clean and standardize text data using LLM
   * @param {string} text - The text to clean
   * @param {string} context - Additional context for cleaning
   */
  async cleanText(text, context = '') {
    const prompt = `Clean and standardize the following data. Remove inconsistencies, fix formatting issues, and ensure data quality.
${context ? `Context: ${context}` : ''}

Data to clean:
${text}

Provide only the cleaned data without explanations.`;

    return await this.generate(prompt);
  }

  /**
   * Extract structured data from unstructured text
   * @param {string} text - The text to parse
   * @param {string} format - Desired output format (json, csv)
   */
  async extractStructuredData(text, format = 'json') {
    const prompt = `Extract structured data from the following text and format it as ${format.toUpperCase()}.

Text:
${text}

Provide only the ${format.toUpperCase()} output without explanations.`;

    return await this.generate(prompt);
  }

  /**
   * Validate and fix data based on rules
   * @param {string} data - The data to validate
   * @param {Array} rules - Array of validation rules
   */
  async validateAndFix(data, rules) {
    if (!Array.isArray(rules)) {
      throw new Error('Rules must be an array');
    }
    
    const rulesText = rules.map((rule, idx) => `${idx + 1}. ${rule}`).join('\n');
    
    const prompt = `Validate and fix the following data according to these rules:
${rulesText}

Data:
${data}

Provide only the corrected data without explanations.`;

    return await this.generate(prompt);
  }
}

export default LLMManager;
