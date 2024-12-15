const express = require('express');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Store current data state
let currentData = null;
let defaultDataPath = path.join(__dirname, 'data.csv');

app.use(express.static('public'));
app.use(express.text({ type: 'text/csv' }));

// Function to process CSV data
function processCSVData(results) {
    const bereichData = { labels: [], counts: [] };
    const aspektData = { labels: [], counts: [] };
    const frageData = { labels: [], counts: [], values: [] };

    // Count occurrences for each category
    const bereichCounts = {};
    const aspektCounts = {};
    const frageCounts = {};
    const frageValues = {};

    // First pass: collect all unique combinations
    const bereichAspekte = new Map(); // Map of Bereich to Array of Aspekte
    const aspektFragen = new Map();   // Map of Bereich.Aspekt to Array of Fragen

    // Helper function to add unique item to array
    const addUnique = (arr, item) => {
        if (!arr.includes(item)) {
            arr.push(item);
        }
        return arr;
    };

    // First pass to build hierarchy
    results.forEach(row => {
        const bereich = row.Bereich;
        const aspekt = row.Aspekt;
        const frage = row.Frage;

        // Initialize hierarchy maps
        if (!bereichAspekte.has(bereich)) {
            bereichAspekte.set(bereich, []);
        }
        addUnique(bereichAspekte.get(bereich), aspekt);

        const aspektKey = `${bereich}.${aspekt}`;
        if (!aspektFragen.has(aspektKey)) {
            aspektFragen.set(aspektKey, []);
        }
        addUnique(aspektFragen.get(aspektKey), frage);
    });

    // Second pass: count values
    results.forEach(row => {
        const bereich = row.Bereich;
        const aspekt = row.Aspekt;
        const frage = row.Frage;
        const wert = parseInt(row.Wert);

        const frageId = `${bereich}.${aspekt}.${frage}`;
        if (!frageCounts[frageId]) {
            frageCounts[frageId] = 0;
            frageValues[frageId] = new Array(10).fill(0);
        }
        frageCounts[frageId]++;
        frageValues[frageId][wert]++;
    });

    // Convert hierarchy to counts (maintaining order)
    Array.from(bereichAspekte.entries()).forEach(([bereich, aspekte]) => {
        bereichData.labels.push(bereich);
        // Count total Fragen for this Bereich
        let totalFragen = 0;
        aspekte.forEach(aspekt => {
            const aspektKey = `${bereich}.${aspekt}`;
            totalFragen += aspektFragen.get(aspektKey).length;
        });
        bereichData.counts.push(totalFragen);
    });

    // Get unique Aspekte while maintaining order
    const seenAspekte = new Set();
    const aspektTotalCounts = new Map(); // Track total counts for each Aspekt

    // First calculate total counts for each Aspekt
    Array.from(aspektFragen.keys()).forEach(aspektKey => {
        const [_, aspekt] = aspektKey.split('.');
        const fragen = aspektFragen.get(aspektKey);
        let totalCount = 0;
        
        // Sum up all occurrences of questions under this Aspekt
        fragen.forEach(frage => {
            const frageId = `${aspektKey}.${frage}`;
            totalCount += frageCounts[frageId] || 0;
        });
        
        if (!aspektTotalCounts.has(aspekt)) {
            aspektTotalCounts.set(aspekt, totalCount);
        } else {
            aspektTotalCounts.set(aspekt, aspektTotalCounts.get(aspekt) + totalCount);
        }
    });

    // Now add the Aspekte in order with their total counts
    Array.from(aspektFragen.keys()).forEach(aspektKey => {
        const [_, aspekt] = aspektKey.split('.');
        if (!seenAspekte.has(aspekt)) {
            seenAspekte.add(aspekt);
            aspektData.labels.push(aspekt);
            aspektData.counts.push(aspektTotalCounts.get(aspekt));
        }
    });

    // Sort and prepare frage data following the hierarchy
    const orderedFrageIds = [];
    
    // Follow the Bereich -> Aspekt -> Frage hierarchy for ordering
    Array.from(bereichAspekte.entries()).forEach(([bereich, aspekte]) => {
        aspekte.forEach(aspekt => {
            const aspektKey = `${bereich}.${aspekt}`;
            const fragen = aspektFragen.get(aspektKey);
            fragen.forEach(frage => {
                orderedFrageIds.push(`${bereich}.${aspekt}.${frage}`);
            });
        });
    });

    // Use the ordered IDs to build frageData
    orderedFrageIds.forEach(frageId => {
        frageData.labels.push(frageId);
        frageData.counts.push(frageCounts[frageId]);
        frageData.values.push(frageValues[frageId]);
    });

    return { 
        bereichData, 
        aspektData, 
        frageData,
        fragen: frageData.labels  
    };
}

// GET endpoint for current data
app.get('/data', (req, res) => {
    // If we have current data and it's not a reset request, return it
    if (currentData && !req.query.reset) {
        return res.json(currentData);
    }

    // Otherwise, read from default file
    fs.readFile(defaultDataPath, 'utf-8', (err, fileContent) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Error reading file' });
        }

        parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        }, (err, results) => {
            if (err) {
                console.error('Error parsing CSV:', err);
                return res.status(500).json({ error: 'Error parsing CSV' });
            }

            try {
                // Only update currentData if this is not a reset request
                const processedData = processCSVData(results);
                if (!req.query.reset) {
                    currentData = processedData;
                }
                res.json(processedData);
            } catch (error) {
                console.error('Error processing data:', error);
                res.status(500).json({ error: 'Error processing data' });
            }
        });
    });
});

// POST endpoint for new data
app.post('/data', (req, res) => {
    parse(req.body, {
        columns: true,
        skip_empty_lines: true
    }, (err, results) => {
        if (err) {
            console.error('Error parsing CSV:', err);
            return res.status(500).json({ error: 'Error parsing CSV' });
        }

        try {
            currentData = processCSVData(results);
            res.json(currentData);
        } catch (error) {
            console.error('Error processing data:', error);
            res.status(500).json({ error: 'Error processing data' });
        }
    });
});

// Reset endpoint to clear current data
app.post('/reset', (req, res) => {
    currentData = null;
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
