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

                results.forEach(row => {
                    if (!bereichCounts[row.Bereich]) bereichCounts[row.Bereich] = 0;
                    if (!aspektCounts[row.Aspekt]) aspektCounts[row.Aspekt] = 0;
                    if (!frageCounts[row.Frage]) {
                        frageCounts[row.Frage] = 0;
                        frageValues[row.Frage] = new Array(10).fill(0); // Initialize array for values 0-9
                    }

                    bereichCounts[row.Bereich]++;
                    aspektCounts[row.Aspekt]++;
                    frageCounts[row.Frage]++;

                    // Track value distribution for each Frage
                    const value = parseInt(row.Wert) || 0;
                    if (value >= 0 && value < 10) {
                        frageValues[row.Frage][value]++;
                    }
                });

                // Convert to arrays
                Object.entries(bereichCounts).forEach(([label, count]) => {
                    bereichData.labels.push(label);
                    bereichData.counts.push(count);
                });

                Object.entries(aspektCounts).forEach(([label, count]) => {
                    aspektData.labels.push(label);
                    aspektData.counts.push(count);
                });

                Object.entries(frageCounts).forEach(([label, count]) => {
                    frageData.labels.push(label);
                    frageData.counts.push(count);
                    frageData.values.push(frageValues[label]);
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

            results.forEach(row => {
                if (!bereichCounts[row.Bereich]) bereichCounts[row.Bereich] = 0;
                if (!aspektCounts[row.Aspekt]) aspektCounts[row.Aspekt] = 0;
                if (!frageCounts[row.Frage]) {
                    frageCounts[row.Frage] = 0;
                    frageValues[row.Frage] = new Array(10).fill(0); // Initialize array for values 0-9
                }

                bereichCounts[row.Bereich]++;
                aspektCounts[row.Aspekt]++;
                frageCounts[row.Frage]++;

                // Track value distribution for each Frage
                const value = parseInt(row.Wert) || 0;
                if (value >= 0 && value < 10) {
                    frageValues[row.Frage][value]++;
                }
            });

            // Convert to arrays
            Object.entries(bereichCounts).forEach(([label, count]) => {
                bereichData.labels.push(label);
                bereichData.counts.push(count);
            });

            Object.entries(aspektCounts).forEach(([label, count]) => {
                aspektData.labels.push(label);
                aspektData.counts.push(count);
            });

            Object.entries(frageCounts).forEach(([label, count]) => {
                frageData.labels.push(label);
                frageData.counts.push(count);
                frageData.values.push(frageValues[label]);
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
