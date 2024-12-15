// Configuration object for chart settings
const CONFIG = {
    width: 800,
    height: 800,
    margin: 50,
    colors: {
        defaultSegment: '#f0f0f0',
        stroke: '#fff',
        axis: '#ddd',
        point: '#000',
        medianMin: '#ff0000',
        medianMax: '#00ff00'
    },
    text: {
        minFontSize: 10,
        maxFontSize: 14,
        fontFamily: 'Arial'
    },
    rings: {
        bereich: { inner: 0.72, outer: 0.8 },
        aspekt: { inner: 0.65, outer: 0.72 },
        frage: { inner: 0.59, outer: 0.65 },
        radar: { size: 0.57 }
    }
};

// Helper functions
const calculateRadius = () => Math.min(CONFIG.width, CONFIG.height) / 2;

// Function to draw a ring
function drawRing(data, innerRadius, outerRadius, className) {
    const svg = d3.select('#chart-container svg');
    const g = svg.select('g');
    
    const radius = calculateRadius();
    innerRadius = radius * innerRadius;
    outerRadius = radius * outerRadius;

    const pie = d3.pie()
        .value(d => d)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const arcs = g.selectAll(`.${className}`)
        .data(pie(data.counts))
        .enter()
        .append('g')
        .attr('class', className);

    // Draw segments
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => {
            if (className === 'bereich') {
                const hue = (i / data.labels.length) * 360;
                return d3.hsl(hue, 0.5, 0.75);
            }
            return CONFIG.colors.defaultSegment;
        })
        .attr('stroke', CONFIG.colors.stroke)
        .attr('stroke-width', 2);

    // Add labels
    arcs.each(function(d, i) {
        const label = data.labels[i];
        const midRadius = (innerRadius + outerRadius) / 2;
        const ringWidth = outerRadius - innerRadius;
        const fontSize = Math.min(
            CONFIG.text.maxFontSize, 
            Math.max(CONFIG.text.minFontSize, ringWidth * 0.4)
        );
        
        const textPathId = `textPath-${className}-${i}`;
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const isLowerHalf = midAngle > Math.PI/2 && midAngle < 3*Math.PI/2;

        const g = d3.select(this);
        const pathData = isLowerHalf 
            ? createArcPath(midRadius, midAngle, 0.2, -0.2)
            : createArcPath(midRadius, midAngle, -0.2, 0.2);

        g.append('path')
            .attr('id', textPathId)
            .attr('d', pathData)
            .style('fill', 'none')
            .style('stroke', 'none');

        g.append('text')
            .append('textPath')
            .attr('xlink:href', `#${textPathId}`)
            .attr('startOffset', '50%')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', `${fontSize}px`)
            .style('font-family', CONFIG.text.fontFamily)
            .text(label)
            .attr('transform', !isLowerHalf ? 'rotate(180)' : '');
    });
}

function createArcPath(radius, angle, start, end) {
    return `
        M ${radius * Math.cos(angle - Math.PI/2 + start)} 
          ${radius * Math.sin(angle - Math.PI/2 + start)}
        A ${radius} ${radius} 0 0 ${start < end ? 1 : 0}
          ${radius * Math.cos(angle - Math.PI/2 + end)}
          ${radius * Math.sin(angle - Math.PI/2 + end)}
    `;
}

// Function to draw colored backgrounds for radar segments
function drawRadarBackgrounds(parentG, data, scales) {
    const { angle: angleScale, radius: radiusScale } = scales;
    const numPoints = data.values.length;

    // Create lighter versions of the bereich colors for backgrounds
    const getBackgroundColor = (index) => {
        const hue = (index / numPoints) * 360;
        return d3.hsl(hue, 0.5, 0.9); // Lighter version of the bereich color
    };

    // Create background segments
    data.values.forEach((values, i) => {
        if (!Array.isArray(values)) return;

        const angle = angleScale(i) - Math.PI/2;
        const nextAngle = angleScale(i + 1) - Math.PI/2;
        
        // Draw a separate path for each value level
        values.forEach((count, valueIndex) => {
            if (count > 1) {
                const outerRadius = radiusScale(valueIndex);
                const innerRadius = valueIndex > 0 ? radiusScale(valueIndex - 1) : 0;
                
                // Create path for this level
                const path = d3.path();
                path.moveTo(innerRadius * Math.cos(angle), innerRadius * Math.sin(angle));
                path.lineTo(outerRadius * Math.cos(angle), outerRadius * Math.sin(angle));
                path.arc(0, 0, outerRadius, angle, nextAngle);
                path.lineTo(innerRadius * Math.cos(nextAngle), innerRadius * Math.sin(nextAngle));
                if (innerRadius > 0) {
                    path.arc(0, 0, innerRadius, nextAngle, angle, true);
                } else {
                    path.lineTo(0, 0);
                }
                
                // Draw the segment level
                parentG.append('path')
                    .attr('d', path.toString())
                    .attr('fill', getBackgroundColor(i))
                    .attr('opacity', 0.9)
                    .attr('stroke', 'none');
            }
        });
    });
}

// Function to draw the radar chart for Frage values
function drawRadarChart(data, parentG, size) {
    if (!validateRadarData(data)) {
        return;
    }

    const radius = calculateRadius() * size;
    const scales = createRadarScales(data, radius);
    
    drawRadarBackgrounds(parentG, data, scales);
    drawAxisLines(parentG, data, scales);
    drawConcentricCircles(parentG, scales.radius);
    drawDataPoints(parentG, data, scales);
}

function validateRadarData(data) {
    if (!data?.values?.length) {
        console.error('Invalid data structure:', data);
        return false;
    }
    return true;
}

function createRadarScales(data, radius) {
    const angleScale = d3.scaleLinear()
        .domain([0, data.values.length])
        .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, radius]);

    const sizeScale = d3.scaleLinear()
        .domain([0, d3.max(data.values.map(arr => d3.max(arr)))])
        .range([3, 8]);  // Min size 3px, max size 8px

    return { angle: angleScale, radius: radiusScale, size: sizeScale };
}

function drawAxisLines(parentG, data, scales) {
    data.values.forEach((item, i) => {
        if (!item || typeof item !== 'object') {
            console.warn('Invalid item at index', i, ':', item);
            return;
        }

        const angle = scales.angle(i);
        const x2 = scales.radius.range()[1] * Math.cos(angle - Math.PI / 2);
        const y2 = scales.radius.range()[1] * Math.sin(angle - Math.PI / 2);
        
        parentG.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', CONFIG.colors.axis)
            .attr('stroke-width', 1);
    });
}

function drawConcentricCircles(parentG, radiusScale) {
    const circles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    circles.forEach(value => {
        const r = radiusScale(value);
        
        parentG.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', r)
            .attr('fill', 'none')
            .attr('stroke', CONFIG.colors.axis)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
    });
}

function drawDataPoints(parentG, data, scales) {
    const pointsGroup = parentG.append('g')
        .attr('class', 'points-group');

    data.values.forEach((values, i) => {
        if (!Array.isArray(values)) {
            console.warn(`Invalid data item at index ${i}:`, values);
            return;
        }

        const angle = scales.angle(i);
        const nextAngle = scales.angle(i + 1);
        
        values.forEach((count, value) => {
            for (let j = 0; j < count; j++) {
                const randomAngle = angle + (Math.random() * (nextAngle - angle));
                const r = scales.radius(value);
                const x = r * Math.cos(randomAngle - Math.PI / 2);
                const y = r * Math.sin(randomAngle - Math.PI / 2);

                pointsGroup.append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', 2)
                    .attr('fill', CONFIG.colors.point)
                    .attr('opacity', 1);
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
    if (!data?.values?.length) {
        console.error('Invalid data structure:', data);
        return;
    }

    const radius = calculateRadius() * size;
    const numPoints = data.values.length;
    const angleScale = d3.scaleLinear()
        .domain([0, numPoints])
        .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, radius]);

    // Calculate medians and points
    const medianPoints = data.values.map((values, i) => ({
        ...calculateMedianPoint(values, i, numPoints, radiusScale),
        median: calculateMedian(values)
    }));

    const { minMedian, maxMedian } = findMedianRange(medianPoints);
    const colorScale = d3.scaleLinear()
        .domain([minMedian, maxMedian])
        .range([CONFIG.colors.medianMin, CONFIG.colors.medianMax]);

    drawMedianConnections(parentG, medianPoints, colorScale);
    drawMedianDots(parentG, medianPoints, colorScale);
}

function calculateMedianPoint(values, index, totalPoints, radiusScale) {
    const median = calculateMedian(values);
    const currentAngle = (2 * Math.PI * index) / totalPoints;
    const nextAngle = (2 * Math.PI * (index + 1)) / totalPoints;
    const middleAngle = (currentAngle + nextAngle) / 2;
    
    const r = radiusScale(median);
    return {
        x: r * Math.cos(middleAngle - Math.PI / 2),
        y: r * Math.sin(middleAngle - Math.PI / 2)
    };
}

function findMedianRange(points) {
    return {
        minMedian: Math.min(...points.map(p => p.median)),
        maxMedian: Math.max(...points.map(p => p.median))
    };
}

function drawMedianConnections(parentG, points, colorScale) {
    points.forEach((current, i) => {
        const next = points[(i + 1) % points.length];
        const gradientId = `gradient-${i}`;
        
        const gradient = createGradient(parentG, gradientId, current, next, colorScale);
        drawConnection(parentG, current, next, gradientId);
    });
}

function createGradient(parentG, id, start, end, colorScale) {
    const gradient = parentG.append('linearGradient')
        .attr('id', id)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', start.x)
        .attr('y1', start.y)
        .attr('x2', end.x)
        .attr('y2', end.y);

    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colorScale(start.median));

    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colorScale(end.median));

    return gradient;
}

function drawConnection(parentG, start, end, gradientId) {
    parentG.append('line')
        .attr('x1', start.x)
        .attr('y1', start.y)
        .attr('x2', end.x)
        .attr('y2', end.y)
        .attr('stroke', `url(#${gradientId})`)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round');
}

function drawMedianDots(parentG, points, colorScale) {
    points.forEach(point => {
        parentG.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 4)
            .attr('fill', colorScale(point.median));
    });
}

// Function to update visualization with new data
function updateVisualization(data) {
    const container = document.getElementById('chart-container');
    container.innerHTML = '';

    const svg = createSvg(container);
    const g = createCenterGroup(svg);
    
    // Draw all components
    drawRing(data.bereichData, CONFIG.rings.bereich.inner, CONFIG.rings.bereich.outer, 'bereich');
    drawRing(data.aspektData, CONFIG.rings.aspekt.inner, CONFIG.rings.aspekt.outer, 'aspekt');
    drawRing(data.frageData, CONFIG.rings.frage.inner, CONFIG.rings.frage.outer, 'frage');
    drawRadarChart(data.frageData, g, CONFIG.rings.radar.size);
    drawMedianLines(data.frageData, g, CONFIG.rings.radar.size);
}

function createSvg(container) {
    const svg = d3.select(container)
        .append('svg')
        .attr('width', CONFIG.width)
        .attr('height', CONFIG.height)
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
        .style('background-color', '#ffffff');

    svg.append('rect')
        .attr('width', CONFIG.width)
        .attr('height', CONFIG.height)
        .attr('fill', '#ffffff');

    return svg;
}

function createCenterGroup(svg) {
    return svg.append('g')
        .attr('transform', `translate(${CONFIG.width / 2}, ${CONFIG.height / 2})`);
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
