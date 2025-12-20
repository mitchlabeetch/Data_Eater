import DataEater from '../src/index.js';

/**
 * Demo script showing how to use DataEater
 */
async function runDemo() {
  console.log('='.repeat(60));
  console.log('DataEater Demo - LLM-reliant Data Cleaning');
  console.log('='.repeat(60));

  const app = new DataEater();

  try {
    // Initialize the application
    console.log('\n1. Initializing DataEater...');
    await app.initialize();

    // Show configuration
    console.log('\n2. Configuration:');
    console.log(JSON.stringify(app.config, null, 2));

    // Process sample files without LLM
    console.log('\n3. Processing sample files (basic cleaning)...');
    await app.processDirectory({ useLLM: false });

    console.log('\n4. Demo completed successfully!');
    console.log('\nCheck the data/output directory for cleaned files.');
    console.log('\nTo enable LLM-based cleaning:');
    console.log('  1. Install Ollama from https://ollama.ai/');
    console.log('  2. Run: ollama pull llama2');
    console.log('  3. Run: node src/index.js --llm');
    
  } catch (error) {
    console.error('\nDemo failed:', error.message);
    process.exit(1);
  }
}

runDemo();
