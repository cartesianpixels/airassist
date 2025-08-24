const fs = require('fs');
const path = require('path');

// --- Load Knowledge Base at cold start ---
let knowledgeBase = [];
const dataDir = path.join(process.cwd(), 'data');

try {
    const files = fs.readdirSync(dataDir);
    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json' && file !== 'knowledge_base.json');

    jsonFiles.forEach(file => {
        const filePath = path.join(dataDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (jsonData && Array.isArray(jsonData.chunks)) {
            const chunksWithSource = jsonData.chunks.map(chunk => ({
                ...chunk,
                source: jsonData.document || file
            }));
            knowledgeBase = knowledgeBase.concat(chunksWithSource);
        }
    });

    console.log(`Knowledge base loaded. Total records: ${knowledgeBase.length}`);

} catch (error) {
    console.error('Failed to load knowledge base:', error);
}

// --- Serverless Function Handler ---
export default function handler(req, res) {
    // Handle CORS preflight requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const lowerCaseQuery = query.toLowerCase();
    const results = knowledgeBase.filter(item => 
        item.content && item.content.toLowerCase().includes(lowerCaseQuery)
    );

    const topResults = results.slice(0, 5).map(result => ({
        source: result.source,
        content: result.content,
        page_number: result.page_number
    }));

    let responseText;
    if (topResults.length > 0) {
        responseText = topResults.map(r => `Source: ${r.source} (p. ${r.page_number || 'N/A'})
${r.content}`).join('\n\n---\n\n');
    } else {
        responseText = "I couldn't find any information related to your query in the knowledge base.";
    }
    
    res.status(200).json({ response: responseText });
}
