const express = require('express');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.text({ type: 'text/csv' }));

// GET endpoint for default data
app.get('/data', (req, res) => {
    const csvFilePath = path.join(__dirname, 'data.csv');

    fs.readFile(csvFilePath, 'utf-8', (err, fileContent) => {
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
                Array.from(aspektFragen.keys()).forEach(aspektKey => {
                    const [_, aspekt] = aspektKey.split('.');
                    if (!seenAspekte.has(aspekt)) {
                        seenAspekte.add(aspekt);
                        aspektData.labels.push(aspekt);
                        aspektData.counts.push(aspektFragen.get(aspektKey).length);
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

                res.json({ 
                    bereichData, 
                    aspektData, 
                    frageData,
                    fragen: frageData.labels  
                });
            } catch (error) {
                console.error('Error processing data:', error);
                res.status(500).json({ error: 'Error processing data' });
            }
        });
    });
});

// POST endpoint for CSV upload
app.post('/data', (req, res) => {
    const csvData = req.body;
    
    parse(csvData, {
        columns: true,
        skip_empty_lines: true
    }, (err, results) => {
        if (err) {
            console.error('Error parsing CSV:', err);
            return res.status(500).json({ error: 'Error parsing CSV' });
        }

        try {
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
            Array.from(aspektFragen.keys()).forEach(aspektKey => {
                const [_, aspekt] = aspektKey.split('.');
                if (!seenAspekte.has(aspekt)) {
                    seenAspekte.add(aspekt);
                    aspektData.labels.push(aspekt);
                    aspektData.counts.push(aspektFragen.get(aspektKey).length);
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

            res.json({ 
                bereichData, 
                aspektData, 
                frageData,
                fragen: frageData.labels  
            });
        } catch (error) {
            console.error('Error processing data:', error);
            res.status(500).json({ error: 'Error processing data' });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
