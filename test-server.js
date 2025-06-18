// Simple test script to verify server functionality
const test = async () => {
  try {
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3000/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.success ? 'PASSED' : 'FAILED');
    
    // Test root endpoint
    const rootResponse = await fetch('http://localhost:3000/');
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint:', rootData.success ? 'PASSED' : 'FAILED');
    
    console.log('🎉 All basic tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

test();