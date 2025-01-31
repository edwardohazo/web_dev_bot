import 'dotenv/config';


const sendPromptToDeepSeekNative = async (prompt) => {
  try {
    const response = await fetch(process.env.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // Native model name
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        stream: false, // Adjust as needed; set to true for streaming responses
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw error;
  }
};

// Example usage
(async () => {
  try {
    const result = await sendPromptToDeepSeekNative('Hello, DeepSeek!');
    console.log('DeepSeek Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
})();

export { sendPromptToDeepSeekNative };
