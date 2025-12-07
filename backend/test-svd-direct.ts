
import axios from 'axios';

async function testSVD() {
    const svdUrl = 'http://localhost:7860';
    const testImageUrl = 'https://raw.githubusercontent.com/Stability-AI/generative-models/main/assets/000.jpg'; // Sample from their repo

    console.log('Testing SVD Direct with static image...');
    
    try {
        const payload = {
            image_url: testImageUrl,
            seed: 42,
            motion_bucket_id: 127
        };

        console.log(`Sending request to ${svdUrl}/generate...`);
        const response = await axios.post(`${svdUrl}/generate`, payload);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Failed:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

testSVD();
