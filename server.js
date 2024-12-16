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
    // Skip header row
    const dataRows = results.slice(1);
    
    const bereichData = { labels: [], counts: [] };
    const aspektData = { labels: [], counts: [] };
    const frageData = { labels: [], counts: [], values: [] };

    const bereichCounts = {};
    const aspektCounts = {};
    const frageCounts = {};
    const frageValues = {};

    // Process each row using array indices instead of column names
    dataRows.forEach(row => {
        const bereich = row[0];  // First column (previously Bereich)
        const aspekt = row[1];   // Second column (previously Aspekt)
        const frage = row[2];    // Third column (previously Frage)
        const team = row[3];     // Fourth column (previously Team)
        const wert = parseInt(row[4], 10);  // Fifth column (previously Wert)

        // Count Bereich occurrences
        bereichCounts[bereich] = (bereichCounts[bereich] || 0) + 1;

        // Count Aspekt occurrences with full hierarchy
        const aspektKey = `${bereich}.${aspekt}`;
        aspektCounts[aspektKey] = (aspektCounts[aspektKey] || 0) + 1;

        // Count Frage occurrences and track values with full hierarchy
        const frageKey = `${bereich}.${aspekt}.${frage}`;
        frageCounts[frageKey] = (frageCounts[frageKey] || 0) + 1;
        
        if (!frageValues[frageKey]) {
            frageValues[frageKey] = new Array(11).fill(0);
        }
        frageValues[frageKey][wert]++;
    });

    // Convert to arrays (maintaining the same structure as before)
    Object.keys(bereichCounts).sort().forEach(bereich => {
        bereichData.labels.push(bereich);
        bereichData.counts.push(bereichCounts[bereich]);
    });

    Object.keys(aspektCounts).sort().forEach(aspektKey => {
        aspektData.labels.push(aspektKey);
        aspektData.counts.push(aspektCounts[aspektKey]);
    });

    Object.keys(frageCounts).sort().forEach(frageKey => {
        frageData.labels.push(frageKey);
        frageData.counts.push(frageCounts[frageKey]);
        frageData.values.push(frageValues[frageKey]);
    });

    return {
        bereichData,
        aspektData,
        frageData,
        fragen: frageData.labels
    };
}

// POST endpoint for CSV data
app.post('/data', (req, res) => {
    parse(req.body, {
        skip_empty_lines: true,
        from_line: 1,
        columns: false  // Ensure we get arrays instead of objects
    }, (err, records) => {
        if (err) {
            console.error('Error parsing CSV:', err);
            res.status(400).json({ error: 'Invalid CSV format' });
            return;
        }

        try {
            currentData = processCSVData(records);
            res.json(currentData);
        } catch (error) {
            console.error('Error processing data:', error);
            res.status(500).json({ error: 'Error processing data' });
        }
    });
});

// GET endpoint for current data
app.get('/data', (req, res) => {
    // If we have current data and it's not a reset request, return it
    if (currentData && !req.query.reset) {
        res.json(currentData);
        return;
    }

    // Otherwise, load the default data
    fs.readFile(defaultDataPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading default data:', err);
            res.status(500).json({ error: 'Error reading default data' });
            return;
        }

        parse(data, {
            skip_empty_lines: true,
            from_line: 1,
            columns: false  // Ensure we get arrays instead of objects
        }, (err, records) => {
            if (err) {
                console.error('Error parsing default data:', err);
                res.status(500).json({ error: 'Error parsing default data' });
                return;
            }

            try {
                currentData = processCSVData(records);
                res.json(currentData);
            } catch (error) {
                console.error('Error processing default data:', error);
                res.status(500).json({ error: 'Error processing default data' });
            }
        });
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
