// Set up SVG
const width = 800;
const height = 800;
const margin = 50;

// Function to draw a ring
function drawRing(data, innerRadius, outerRadius, className) {
    // Get the main SVG and its center group
    const svg = d3.select('#chart-container svg');
    const g = svg.select('g');
    
    const radius = Math.min(width, height) / 2;
    innerRadius = radius * innerRadius;
    outerRadius = radius * outerRadius;

    // Create pie layout
    const pie = d3.pie()
        .value(d => d)
        .sort(null);

    // Create arc generator
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    // Create arcs
    const arcs = g.selectAll(`.${className}`)
        .data(pie(data.counts))
        .enter()
        .append('g')
        .attr('class', className);

    // Draw segments
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => {
            // Only color the Bereich ring with medium-bright colors
            if (className === 'bereich') {
                const hue = (i / data.labels.length) * 360;
                return d3.hsl(hue, 0.5, 0.75); // Medium saturation (0.5) and lightness (0.75) for balanced colors
            }
            return '#f0f0f0';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

    // Add labels
    arcs.each(function(d, i) {
        const label = data.labels[i];
        
        // Calculate the middle radius for text path
        const midRadius = (innerRadius + outerRadius) / 2;
        
        // Calculate font size based on ring width (with min and max limits)
        const ringWidth = outerRadius - innerRadius;
        const minFontSize = 10;
        const maxFontSize = 14;
        const fontSize = Math.min(maxFontSize, Math.max(minFontSize, ringWidth * 0.4));
        
        // Create unique id for text path
        const textPathId = `textPath-${className}-${i}`;
        
        // Calculate the middle angle for better text positioning
        const midAngle = (d.startAngle + d.endAngle) / 2;
        
        // Check if the segment is in the lower half (between 90° and 270°)
        const isLowerHalf = midAngle > Math.PI/2 && midAngle < 3*Math.PI/2;

        // Create the curved path for text
        const g = d3.select(this);
        g.append('path')
            .attr('id', textPathId)
            .attr('d', isLowerHalf ? `
                M ${midRadius * Math.cos(midAngle - Math.PI/2 + 0.2)} 
                  ${midRadius * Math.sin(midAngle - Math.PI/2 + 0.2)}
                A ${midRadius} ${midRadius} 0 0 0
                  ${midRadius * Math.cos(midAngle - Math.PI/2 - 0.2)}
                  ${midRadius * Math.sin(midAngle - Math.PI/2 - 0.2)}
            ` : `
                M ${midRadius * Math.cos(midAngle - Math.PI/2 - 0.2)} 
                  ${midRadius * Math.sin(midAngle - Math.PI/2 - 0.2)}
                A ${midRadius} ${midRadius} 0 0 1
                  ${midRadius * Math.cos(midAngle - Math.PI/2 + 0.2)}
                  ${midRadius * Math.sin(midAngle - Math.PI/2 + 0.2)}
            `)
            .style('fill', 'none')
            .style('stroke', 'none');

        // Add the text along the path
        g.append('text')
            .append('textPath')
            .attr('xlink:href', `#${textPathId}`)
            .attr('startOffset', '50%')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', `${fontSize}px`)
            .style('font-family', 'Arial')
            .text(label);
    });
}

// Function to draw the radar chart for Frage values
function drawRadarChart(data, parentG, size) {
    if (!data || !data.values || !Array.isArray(data.values)) {
        console.error('Invalid data structure:', data);
        return;
    }

    // Create scales
    const angleScale = d3.scaleLinear()
        .domain([0, data.values.length])
        .range([0, 2 * Math.PI]);

    const radius = Math.min(width, height) / 2 * size;

    const radiusScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, radius]);

    // Size scale for points based on value count
    const sizeScale = d3.scaleLinear()
        .domain([0, d3.max(data.values.map(arr => d3.max(arr)))])
        .range([3, 8]);  // Min size 3px, max size 8px

    // Draw axis lines
    data.values.forEach((item, i) => {
        if (!item || typeof item !== 'object') {
            console.warn('Invalid item at index', i, ':', item);
            return;
        }

        const angle = angleScale(i);
        const x2 = radius * Math.cos(angle - Math.PI / 2);
        const y2 = radius * Math.sin(angle - Math.PI / 2);
        
        parentG.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', '#ddd')
            .attr('stroke-width', 1);
    });

    // Draw concentric circles for value scale
    const circles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    circles.forEach(value => {
        const r = radiusScale(value);
        
        // Draw circle
        parentG.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', r)
            .attr('fill', 'none')
            .attr('stroke', '#ddd')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
    });

    // Create a group for the points to ensure they're on top
    const pointsGroup = parentG.append('g')
        .attr('class', 'points-group');

    // Plot data points
    data.values.forEach((values, i) => {
        if (!Array.isArray(values)) {
            console.warn(`Invalid data item at index ${i}:`, values);
            return;
        }

        // Get the angles for this segment
        const angle = angleScale(i);
        const nextAngle = angleScale(i + 1);
        
        // Plot individual points for each value
        values.forEach((count, value) => {
            for (let j = 0; j < count; j++) {
                // Calculate random angle within the segment
                const randomAngle = angle + (Math.random() * (nextAngle - angle));
                const r = radiusScale(value);
                const x = r * Math.cos(randomAngle - Math.PI / 2);
                const y = r * Math.sin(randomAngle - Math.PI / 2);

                pointsGroup.append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', 2)  // Smaller points
                    .attr('fill', '#000')
                    .attr('opacity', 1);  // Full opacity
            }
        });
    });
}

// Function to calculate median
function calculateMedian(values) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    
    // Create weighted array based on counts
    let weightedValues = [];
    values.forEach((count, value) => {
        for (let i = 0; i < count; i++) {
            weightedValues.push(value);
        }
    });
    
    if (weightedValues.length === 0) return 0;
    
    weightedValues.sort((a, b) => a - b);
    const mid = Math.floor(weightedValues.length / 2);
    
    if (weightedValues.length % 2 === 0) {
        return (weightedValues[mid - 1] + weightedValues[mid]) / 2;
    }
    return weightedValues[mid];
}

// Function to draw median lines
function drawMedianLines(data, parentG, size) {
    if (!data || !data.values || !Array.isArray(data.values)) {
        console.error('Invalid data structure:', data);
        return;
    }

    const radius = Math.min(width, height) / 2 * size;
    const numPoints = data.values.length;

    // Create scales
    const angleScale = d3.scaleLinear()
        .domain([0, numPoints])
        .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, radius]);

    // Calculate medians and points
    const medianPoints = data.values.map((values, i) => {
        const median = calculateMedian(values);
        // Calculate the exact middle angle between this axis and the next
        const currentAngle = (2 * Math.PI * i) / numPoints;
        const nextAngle = (2 * Math.PI * (i + 1)) / numPoints;
        const middleAngle = (currentAngle + nextAngle) / 2;
        
        const r = radiusScale(median);
        return {
            x: r * Math.cos(middleAngle - Math.PI / 2),
            y: r * Math.sin(middleAngle - Math.PI / 2),
            median: median
        };
    });

    // Find min and max medians
    const minMedian = Math.min(...medianPoints.map(p => p.median));
    const maxMedian = Math.max(...medianPoints.map(p => p.median));

    // Color scale from red (min) to green (max)
    const colorScale = d3.scaleLinear()
        .domain([minMedian, maxMedian])
        .range(['#ff0000', '#00ff00']);

    // Create line segments between points
    for (let i = 0; i < medianPoints.length; i++) {
        const current = medianPoints[i];
        const next = medianPoints[(i + 1) % medianPoints.length];

        // Create gradient for this segment
        const gradientId = `gradient-${i}`;
        const gradient = parentG.append('linearGradient')
            .attr('id', gradientId)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', current.x)
            .attr('y1', current.y)
            .attr('x2', next.x)
            .attr('y2', next.y);

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', colorScale(current.median));

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', colorScale(next.median));

        // Draw line segment
        parentG.append('line')
            .attr('x1', current.x)
            .attr('y1', current.y)
            .attr('x2', next.x)
            .attr('y2', next.y)
            .attr('stroke', `url(#${gradientId})`)
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
    }

    // Add dots at median points
    medianPoints.forEach((point, i) => {
        const dotColor = colorScale(point.median);
        
        parentG.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 4)
            .attr('fill', dotColor);
    });
}

// Function to update visualization with new data
function updateVisualization(data) {
    // Clear existing visualization
    const container = document.getElementById('chart-container');
    container.innerHTML = '';

    // Create new SVG
    const svg = d3.select('#chart-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
        .style('background-color', '#ffffff');

    // Add a background rect
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#ffffff');

    // Create center group for all visualizations
    const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
    // Draw outer ring (Bereich)
    drawRing(data.bereichData, 0.72, 0.8, 'bereich');
    
    // Draw middle ring (Aspekt)
    drawRing(data.aspektData, 0.65, 0.72, 'aspekt');

    // Draw inner ring (Frage)
    drawRing(data.frageData, 0.59, 0.65, 'frage');

    // Draw radar chart within the inner ring
    drawRadarChart(data.frageData, g, 0.57);
    
    // Draw median lines
    drawMedianLines(data.frageData, g, 0.57);
}

// Add event listeners for file handling
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('csv-file-input');
    const loadButton = document.getElementById('load-csv');
    const resetButton = document.getElementById('reset');

    if (!fileInput || !loadButton || !resetButton) {
        console.error('Required elements not found');
        return;
    }

    loadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const response = await fetch('/data', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'text/csv'
                        },
                        body: e.target.result
                    });

                    if (!response.ok) {
                        throw new Error('Upload failed');
                    }

                    const data = await response.json();
                    updateVisualization(data);
                } catch (error) {
                    console.error('Error uploading file:', error);
                    alert('Error uploading file. Please make sure it\'s a valid CSV with the correct format.');
                }
            };
            reader.readAsText(file);
        }
    });

    resetButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/data');
            if (!response.ok) {
                throw new Error('Failed to load default data');
            }
            const data = await response.json();
            updateVisualization(data);
        } catch (error) {
            console.error('Error loading default data:', error);
            alert('Error loading default data');
        }
    });
});

// Initial data load
fetch('/data')
    .then(response => response.json())
    .then(data => {
        updateVisualization(data);
    })
    .catch(error => {
        console.error('Error loading initial data:', error);
    });

// SVG download functionality
document.getElementById('download-svg').addEventListener('click', function() {
    const svgData = document.querySelector('#chart-container svg').outerHTML;
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'radar-chart.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});
